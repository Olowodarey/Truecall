;; title: prediction-market
;; description: TrueCall competition engine
;;
;; Model:
;; - One event = one competition season (e.g. 3 weeks)
;; - User pays once in STX to join the event
;; - Admin can add multiple questions during the event
;; - Joined users answer each question separately
;; - Correct answers earn points tracked inline
;; - At event close, top 5 users share 98% of the pool
;;   1st=30% 2nd=25% 3rd=20% 4th=15% 5th=8% (total=98%)
;; - 2% goes to protocol fees
;; - If fewer than 5 participants joined, all get a full refund

(use-trait pyth-oracle-trait .pyth-oracle-trait.pyth-oracle-trait)

;; -------------------------------------------------------
;; CONSTANTS
;; -------------------------------------------------------

(define-constant question-status-open   "open")
(define-constant question-status-final  "final")

(define-constant max-questions-per-event u50)
(define-constant min-participants        u5)

;; Payout basis points out of 100 (must sum to 98)
(define-constant payout-rank1 u30)
(define-constant payout-rank2 u25)
(define-constant payout-rank3 u20)
(define-constant payout-rank4 u15)
(define-constant payout-rank5 u8)   ;; 30+25+20+15+8 = 98 exactly

;; -------------------------------------------------------
;; ERROR CODES
;; -------------------------------------------------------

(define-constant err-unauthorized            (err u200))
(define-constant err-event-not-found         (err u201))
(define-constant err-question-not-found      (err u202))
(define-constant err-event-closed            (err u203))
(define-constant err-event-not-ended         (err u204))
(define-constant err-zero-entry-fee          (err u205))
(define-constant err-already-joined          (err u206))
(define-constant err-not-joined              (err u207))
(define-constant err-already-answered        (err u208))
(define-constant err-question-closed         (err u209))
(define-constant err-too-many-questions      (err u210))
(define-constant err-invalid-question-window (err u211))
(define-constant err-no-answer               (err u215))
(define-constant err-already-claimed         (err u217))
(define-constant err-wrong-answer            (err u218))
(define-constant err-not-final               (err u219))
(define-constant err-not-winner              (err u220))
(define-constant err-fee-already-booked      (err u221))
(define-constant err-invalid-oracle          (err u222))
(define-constant err-amount-too-large        (err u223))
(define-constant err-question-not-final      (err u224))
(define-constant err-not-all-finalized       (err u225))
(define-constant err-invalid-event-window    (err u226))
(define-constant err-not-refundable          (err u227))
(define-constant err-refund-already-claimed  (err u228))
(define-constant err-enough-participants     (err u229))
(define-constant err-event-still-active      (err u230))

;; -------------------------------------------------------
;; DATA VARS
;; -------------------------------------------------------

(define-data-var admin             principal tx-sender)
(define-data-var event-nonce       uint      u0)
(define-data-var question-nonce    uint      u0)
(define-data-var approved-oracle   principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mock-pyth)
(define-data-var accumulated-fees  uint      u0)

;; trusted keepers that can propose/finalize results
(define-map approved-keepers { keeper: principal } { active: bool })

;; -------------------------------------------------------
;; MAPS
;; -------------------------------------------------------

;; Event = competition season
(define-map events
  { event-id: uint }
  {
    title:                    (string-ascii 64),
    creator:                  principal,
    start-block:              uint,
    end-block:                uint,
    entry-fee:                uint,
    question-count:           uint,
    finalized-question-count: uint,
    participant-count:        uint,
    total-pool:               uint,
    is-active:                bool,
    fee-booked:               bool,
    refund-mode:              bool   ;; true when < min-participants at close
  }
)

(define-map events-by-title
  { title: (string-ascii 64) }
  { event-id: uint }
)

;; Questions inside an event
(define-map questions
  { question-id: uint }
  {
    event-id:      uint,
    question:      (string-ascii 128),
    target-price:  uint,
    close-block:   uint,
    status:        (string-ascii 8),
    oracle-price:  uint,
    final-outcome: (optional bool)
  }
)

;; event -> indexed question lookup
(define-map event-questions
  { event-id: uint, index: uint }
  { question-id: uint }
)

;; user joined event
(define-map participants
  { event-id: uint, user: principal }
  { joined: bool, refund-claimed: bool }
)

;; user answer to a question
(define-map answers
  { question-id: uint, user: principal }
  { prediction: bool, points-claimed: bool }
)

;; -------------------------------------------------------
;; INLINE LEADERBOARD
;; points-map  : event-id + user  -> total points
;; top5-map    : event-id         -> ranked top-5 snapshot
;;   (updated lazily on every claim-points call)
;; -------------------------------------------------------

(define-map points-map
  { event-id: uint, user: principal }
  { points: uint }
)

(define-map top5-map
  { event-id: uint }
  {
    rank1: (optional { user: principal, points: uint }),
    rank2: (optional { user: principal, points: uint }),
    rank3: (optional { user: principal, points: uint }),
    rank4: (optional { user: principal, points: uint }),
    rank5: (optional { user: principal, points: uint })
  }
)

;; winnings claim at event level
(define-map event-claims
  { event-id: uint, user: principal }
  bool
)

;; -------------------------------------------------------
;; PRIVATE HELPERS
;; -------------------------------------------------------

(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

(define-private (is-keeper)
  (or
    (is-admin)
    (default-to false (get active (map-get? approved-keepers { keeper: tx-sender })))
  )
)

(define-private (event-is-open-internal (event-id uint))
  (match (map-get? events { event-id: event-id })
    event
      (and
        (get is-active event)
        (>= burn-block-height (get start-block event))
        (< burn-block-height (get end-block event))
      )
    false
  )
)

(define-private (question-is-open-internal (question-id uint))
  (match (map-get? questions { question-id: question-id })
    q
      (and
        (is-eq (get status q) question-status-open)
        (< burn-block-height (get close-block q))
      )
    false
  )
)

;; Returns the payout percentage (out of 100) for caller's rank.
;; Checks against the stored top5 snapshot for this event.
(define-private (get-rank-multiplier (event-id uint) (caller principal))
  (match (map-get? top5-map { event-id: event-id })
    lb
      (if (match (get rank1 lb) e (is-eq (get user e) caller) false) payout-rank1
        (if (match (get rank2 lb) e (is-eq (get user e) caller) false) payout-rank2
          (if (match (get rank3 lb) e (is-eq (get user e) caller) false) payout-rank3
            (if (match (get rank4 lb) e (is-eq (get user e) caller) false) payout-rank4
              (if (match (get rank5 lb) e (is-eq (get user e) caller) false) payout-rank5 u0)
            )
          )
        )
      )
    u0
  )
)

;; Insert-or-update the top5 snapshot for an event after a user earns points.
;; We read the current top5, compare new score, and rebuild if needed.
(define-private (update-top5 (event-id uint) (user principal) (new-points uint))
  (let (
    (current (default-to
      { rank1: none, rank2: none, rank3: none, rank4: none, rank5: none }
      (map-get? top5-map { event-id: event-id })
    ))
    (entry (some { user: user, points: new-points }))

    ;; Pull out current point totals (0 if slot empty or different user)
    (p1 (match (get rank1 current) e (get points e) u0))
    (p2 (match (get rank2 current) e (get points e) u0))
    (p3 (match (get rank3 current) e (get points e) u0))
    (p4 (match (get rank4 current) e (get points e) u0))
    (p5 (match (get rank5 current) e (get points e) u0))

    ;; Is this user already in one of the slots?
    (in-r1 (match (get rank1 current) e (is-eq (get user e) user) false))
    (in-r2 (match (get rank2 current) e (is-eq (get user e) user) false))
    (in-r3 (match (get rank3 current) e (is-eq (get user e) user) false))
    (in-r4 (match (get rank4 current) e (is-eq (get user e) user) false))
    (in-r5 (match (get rank5 current) e (is-eq (get user e) user) false))
    (already-in (or in-r1 (or in-r2 (or in-r3 (or in-r4 in-r5)))))
  )
    (if already-in
      ;; User already ranked — just update their slot in place
      (map-set top5-map { event-id: event-id }
        {
          rank1: (if in-r1 entry (get rank1 current)),
          rank2: (if in-r2 entry (get rank2 current)),
          rank3: (if in-r3 entry (get rank3 current)),
          rank4: (if in-r4 entry (get rank4 current)),
          rank5: (if in-r5 entry (get rank5 current))
        }
      )
      ;; User not yet ranked — try to insert into lowest open or displaced slot
      (if (>= new-points p1)
        (map-set top5-map { event-id: event-id }
          { rank1: entry, rank2: (get rank1 current), rank3: (get rank2 current), rank4: (get rank3 current), rank5: (get rank4 current) }
        )
        (if (>= new-points p2)
          (map-set top5-map { event-id: event-id }
            { rank1: (get rank1 current), rank2: entry, rank3: (get rank2 current), rank4: (get rank3 current), rank5: (get rank4 current) }
          )
          (if (>= new-points p3)
            (map-set top5-map { event-id: event-id }
              { rank1: (get rank1 current), rank2: (get rank2 current), rank3: entry, rank4: (get rank3 current), rank5: (get rank4 current) }
            )
            (if (>= new-points p4)
              (map-set top5-map { event-id: event-id }
                { rank1: (get rank1 current), rank2: (get rank2 current), rank3: (get rank3 current), rank4: entry, rank5: (get rank4 current) }
              )
              (if (>= new-points p5)
                (map-set top5-map { event-id: event-id }
                  { rank1: (get rank1 current), rank2: (get rank2 current), rank3: (get rank3 current), rank4: (get rank4 current), rank5: entry }
                )
                true ;; below rank 5, no change
              )
            )
          )
        )
      )
    )
  )
)

;; -------------------------------------------------------
;; ADMIN CONFIG
;; -------------------------------------------------------

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin) err-unauthorized)
    (var-set admin new-admin)
    (ok true)
  )
)

(define-public (add-keeper (keeper principal))
  (begin
    (asserts! (is-admin) err-unauthorized)
    (map-set approved-keepers { keeper: keeper } { active: true })
    (ok true)
  )
)

(define-public (remove-keeper (keeper principal))
  (begin
    (asserts! (is-admin) err-unauthorized)
    (map-set approved-keepers { keeper: keeper } { active: false })
    (ok true)
  )
)

(define-public (set-approved-oracle (new-oracle principal))
  (begin
    (asserts! (is-admin) err-unauthorized)
    (var-set approved-oracle new-oracle)
    (ok true)
  )
)

(define-public (withdraw-fees (amount uint))
  (let (
    (caller tx-sender)
    (current-fees (var-get accumulated-fees))
  )
    (begin
      (asserts! (is-admin) err-unauthorized)
      (asserts! (<= amount current-fees) err-amount-too-large)
      (var-set accumulated-fees (- current-fees amount))
      (as-contract (stx-transfer? amount tx-sender caller))
    )
  )
)

;; -------------------------------------------------------
;; EVENT FLOW
;; -------------------------------------------------------

(define-public (create-event
  (title (string-ascii 64))
  (start-block uint)
  (end-block uint)
  (entry-fee uint)
)
  (let (
    (caller tx-sender)
    (event-id (+ (var-get event-nonce) u1))
  )
    (begin
      (asserts! (is-admin) err-unauthorized)
      (asserts! (> entry-fee u0) err-zero-entry-fee)
      (asserts! (> end-block start-block) err-invalid-event-window)
      (asserts! (>= start-block burn-block-height) err-invalid-event-window)

      (var-set event-nonce event-id)

      (map-set events { event-id: event-id }
        {
          title:                    title,
          creator:                  caller,
          start-block:              start-block,
          end-block:                end-block,
          entry-fee:                entry-fee,
          question-count:           u0,
          finalized-question-count: u0,
          participant-count:        u0,
          total-pool:               u0,
          is-active:                true,
          fee-booked:               false,
          refund-mode:              false
        }
      )

      (map-set events-by-title { title: title } { event-id: event-id })
      (ok event-id)
    )
  )
)

(define-public (join-event (event-id uint))
  (let (
    (caller tx-sender)
    (contract-addr (as-contract tx-sender))
    (event (unwrap! (map-get? events { event-id: event-id }) err-event-not-found))
    (entry-fee (get entry-fee event))
  )
    (begin
      (asserts! (get is-active event) err-event-closed)
      (asserts! (>= burn-block-height (get start-block event)) err-event-closed)
      (asserts! (< burn-block-height (get end-block event)) err-event-closed)
      (asserts! (is-none (map-get? participants { event-id: event-id, user: caller })) err-already-joined)

      (try! (stx-transfer? entry-fee caller contract-addr))

      (map-set participants
        { event-id: event-id, user: caller }
        { joined: true, refund-claimed: false }
      )

      (map-set events { event-id: event-id }
        (merge event {
          participant-count: (+ (get participant-count event) u1),
          total-pool:        (+ (get total-pool event) entry-fee)
        })
      )
      (ok true)
    )
  )
)

(define-public (add-question
  (event-id uint)
  (question (string-ascii 128))
  (target-price uint)
  (close-block uint)
)
  (let (
    (event (unwrap! (map-get? events { event-id: event-id }) err-event-not-found))
    (question-id (+ (var-get question-nonce) u1))
    (current-count (get question-count event))
  )
    (begin
      (asserts! (is-admin) err-unauthorized)
      (asserts! (get is-active event) err-event-closed)
      (asserts! (< current-count max-questions-per-event) err-too-many-questions)
      (asserts! (>= burn-block-height (get start-block event)) err-event-closed)
      (asserts! (< burn-block-height (get end-block event)) err-event-closed)
      (asserts! (> close-block burn-block-height) err-invalid-question-window)
      (asserts! (<= close-block (get end-block event)) err-invalid-question-window)

      (var-set question-nonce question-id)

      (map-set questions { question-id: question-id }
        {
          event-id:      event-id,
          question:      question,
          target-price:  target-price,
          close-block:   close-block,
          status:        question-status-open,
          oracle-price:  u0,
          final-outcome: none
        }
      )

      (map-set event-questions
        { event-id: event-id, index: current-count }
        { question-id: question-id }
      )

      (map-set events { event-id: event-id }
        (merge event { question-count: (+ current-count u1) })
      )

      (ok question-id)
    )
  )
)

(define-public (answer-question (question-id uint) (prediction bool))
  (let (
    (caller tx-sender)
    (q (unwrap! (map-get? questions { question-id: question-id }) err-question-not-found))
    (event (unwrap! (map-get? events { event-id: (get event-id q) }) err-event-not-found))
  )
    (begin
      (asserts! (get is-active event) err-event-closed)
      (asserts! (is-some (map-get? participants { event-id: (get event-id q), user: caller })) err-not-joined)
      (asserts! (is-eq (get status q) question-status-open) err-question-closed)
      (asserts! (< burn-block-height (get close-block q)) err-question-closed)
      (asserts! (is-none (map-get? answers { question-id: question-id, user: caller })) err-already-answered)

      (map-set answers
        { question-id: question-id, user: caller }
        { prediction: prediction, points-claimed: false }
      )
      (ok true)
    )
  )
)

;; -------------------------------------------------------
;; QUESTION RESOLUTION  (no dispute — keeper result is final)
;; -------------------------------------------------------

;; Keeper fetches oracle price and immediately finalizes the question.
;; No pending/dispute stage — result is final on-chain immediately.
(define-public (finalize-question
  (question-id uint)
  (oracle <pyth-oracle-trait>)
)
  (let (
    (q (unwrap! (map-get? questions { question-id: question-id }) err-question-not-found))
    (event (unwrap! (map-get? events { event-id: (get event-id q) }) err-event-not-found))
    (oracle-price (unwrap! (contract-call? oracle get-btc-price) (err u501)))
    (outcome (>= oracle-price (get target-price q)))
  )
    (begin
      (asserts! (is-keeper) err-unauthorized)
      (asserts! (is-eq (contract-of oracle) (var-get approved-oracle)) err-invalid-oracle)
      (asserts! (is-eq (get status q) question-status-open) err-question-closed)
      (asserts! (>= burn-block-height (get close-block q)) err-question-closed)

      (map-set questions { question-id: question-id }
        (merge q {
          status:        question-status-final,
          oracle-price:  oracle-price,
          final-outcome: (some outcome)
        })
      )

      (map-set events { event-id: (get event-id q) }
        (merge event {
          finalized-question-count: (+ (get finalized-question-count event) u1)
        })
      )
      (ok outcome)
    )
  )
)

;; -------------------------------------------------------
;; POINTS  (inline — no external reputation contract)
;; -------------------------------------------------------

;; Correct users call this per finalized question to earn 10 points.
;; Also updates the top5 leaderboard snapshot for this event.
(define-public (claim-points (question-id uint))
  (let (
    (caller tx-sender)
    (q (unwrap! (map-get? questions { question-id: question-id }) err-question-not-found))
    (answer-record (unwrap! (map-get? answers { question-id: question-id, user: caller }) err-no-answer))
    (final-outcome (unwrap! (get final-outcome q) err-question-not-final))
    (event-id (get event-id q))
    (current-points
      (default-to u0
        (get points (map-get? points-map { event-id: event-id, user: caller }))
      )
    )
    (new-points (+ current-points u10))
  )
    (begin
      (asserts! (is-eq (get status q) question-status-final) err-question-not-final)
      (asserts! (not (get points-claimed answer-record)) err-already-claimed)
      (asserts! (is-eq (get prediction answer-record) final-outcome) err-wrong-answer)

      ;; mark points as claimed for this question
      (map-set answers
        { question-id: question-id, user: caller }
        (merge answer-record { points-claimed: true })
      )

      ;; update user's total points for this event
      (map-set points-map
        { event-id: event-id, user: caller }
        { points: new-points }
      )

      ;; update top5 snapshot
      (update-top5 event-id caller new-points)
      (ok new-points)
    )
  )
)

;; -------------------------------------------------------
;; EVENT CLOSING / FEES / REFUND MODE
;; -------------------------------------------------------

;; Keeper closes the event after season ends and all questions finalized.
;; If participant-count < min-participants → enters refund-mode (no fee taken).
;; Otherwise → 2% protocol fee is booked and prize distribution is enabled.
(define-public (close-event (event-id uint))
  (let (
    (event (unwrap! (map-get? events { event-id: event-id }) err-event-not-found))
    (enough-participants (>= (get participant-count event) min-participants))
    (protocol-fee (/ (* (get total-pool event) u2) u100))
  )
    (begin
      (asserts! (is-keeper) err-unauthorized)
      (asserts! (get is-active event) err-event-closed)
      (asserts! (>= burn-block-height (get end-block event)) err-event-not-ended)
      (asserts! (is-eq (get question-count event) (get finalized-question-count event)) err-not-all-finalized)
      (asserts! (not (get fee-booked event)) err-fee-already-booked)

      (if enough-participants
        ;; Normal close — book fee, enable winnings claims
        (begin
          (map-set events { event-id: event-id }
            (merge event {
              is-active:    false,
              fee-booked:   true,
              refund-mode:  false
            })
          )
          (var-set accumulated-fees (+ (var-get accumulated-fees) protocol-fee))
          (ok false) ;; false = not refund mode
        )
        ;; Not enough participants — refund mode, no fee
        (begin
          (map-set events { event-id: event-id }
            (merge event {
              is-active:    false,
              fee-booked:   true,  ;; set true to prevent re-entry
              refund-mode:  true
            })
          )
          (ok true) ;; true = refund mode activated
        )
      )
    )
  )
)

;; -------------------------------------------------------
;; REFUND  (only available when event is in refund-mode)
;; -------------------------------------------------------

(define-public (claim-refund (event-id uint))
  (let (
    (caller tx-sender)
    (event (unwrap! (map-get? events { event-id: event-id }) err-event-not-found))
    (record (unwrap! (map-get? participants { event-id: event-id, user: caller }) err-not-joined))
  )
    (begin
      (asserts! (not (get is-active event)) err-event-still-active)
      (asserts! (get refund-mode event) err-not-refundable)
      (asserts! (get joined record) err-not-joined)
      (asserts! (not (get refund-claimed record)) err-refund-already-claimed)

      (map-set participants
        { event-id: event-id, user: caller }
        (merge record { refund-claimed: true })
      )

      (as-contract (stx-transfer? (get entry-fee event) tx-sender caller))
    )
  )
)

;; -------------------------------------------------------
;; WINNINGS
;; -------------------------------------------------------

;; Top 5 share 98% of prize pool based on leaderboard rank.
;; Payout percentages (sum = 98):
;;   1st=30%  2nd=25%  3rd=20%  4th=15%  5th=8%
(define-public (claim-winnings (event-id uint))
  (let (
    (caller tx-sender)
    (event (unwrap! (map-get? events { event-id: event-id }) err-event-not-found))
    (multiplier (get-rank-multiplier event-id caller))
    (has-claimed (default-to false (map-get? event-claims { event-id: event-id, user: caller })))
    (prize-pool (/ (* (get total-pool event) u98) u100))
    (payout-amount (/ (* prize-pool multiplier) u100))
  )
    (begin
      (asserts! (not (get is-active event)) err-event-closed)
      (asserts! (get fee-booked event) err-not-final)
      (asserts! (not (get refund-mode event)) err-not-refundable)
      (asserts! (> multiplier u0) err-not-winner)
      (asserts! (not has-claimed) err-already-claimed)

      (map-set event-claims { event-id: event-id, user: caller } true)
      (as-contract (stx-transfer? payout-amount tx-sender caller))
    )
  )
)

;; -------------------------------------------------------
;; READ ONLY
;; -------------------------------------------------------

(define-read-only (get-event (event-id uint))
  (map-get? events { event-id: event-id })
)

(define-read-only (get-event-by-title (title (string-ascii 64)))
  (match (map-get? events-by-title { title: title })
    entry (map-get? events { event-id: (get event-id entry) })
    none
  )
)

(define-read-only (get-question (question-id uint))
  (map-get? questions { question-id: question-id })
)

(define-read-only (get-question-id-for-event (event-id uint) (index uint))
  (map-get? event-questions { event-id: event-id, index: index })
)

(define-read-only (get-answer (question-id uint) (user principal))
  (map-get? answers { question-id: question-id, user: user })
)

(define-read-only (get-participant (event-id uint) (user principal))
  (map-get? participants { event-id: event-id, user: user })
)

(define-read-only (get-user-points (event-id uint) (user principal))
  (default-to u0 (get points (map-get? points-map { event-id: event-id, user: user })))
)

(define-read-only (get-leaderboard (event-id uint))
  (map-get? top5-map { event-id: event-id })
)

(define-read-only (event-is-open (event-id uint))
  (event-is-open-internal event-id)
)

(define-read-only (question-is-open (question-id uint))
  (question-is-open-internal question-id)
)

(define-read-only (is-approved-keeper (addr principal))
  (default-to false (get active (map-get? approved-keepers { keeper: addr })))
)

(define-read-only (get-config)
  {
    admin:                   (var-get admin),
    approved-oracle:         (var-get approved-oracle),
    max-questions-per-event: max-questions-per-event,
    min-participants:        min-participants,
    accumulated-fees:        (var-get accumulated-fees)
  }
)