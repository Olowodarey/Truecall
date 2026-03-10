;; title: prediction-market
;; description: TrueCall competition engine
;;
;; Model:
;; - One event = one competition season (e.g. 3 weeks)
;; - User pays once in STX to join the event
;; - Admin can add multiple questions during the event
;; - Joined users answer each question separately
;; - Correct answers earn points
;; - At event close, top 5 users share 98% of the pool
;; - 2% goes to protocol fees

(use-trait pyth-oracle-trait .pyth-oracle-trait.pyth-oracle-trait)

;; -------------------------------------------------------
;; CONSTANTS
;; -------------------------------------------------------

(define-constant question-status-open "open")
(define-constant question-status-pending "pending")
(define-constant question-status-disputed "disputed")
(define-constant question-status-final "final")

(define-constant dispute-window u12) ;; ~2 hours
(define-constant max-questions-per-event u50)

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
(define-constant err-not-pending             (err u212))
(define-constant err-dispute-window-passed   (err u213))
(define-constant err-dispute-window-open     (err u214))
(define-constant err-no-answer               (err u215))
(define-constant err-not-disputed            (err u216))
(define-constant err-already-claimed         (err u217))
(define-constant err-wrong-answer            (err u218))
(define-constant err-not-final               (err u219))
(define-constant err-not-winner             (err u220))
(define-constant err-fee-already-booked      (err u221))
(define-constant err-invalid-oracle          (err u222))
(define-constant err-amount-too-large        (err u223))
(define-constant err-question-not-final      (err u224))
(define-constant err-not-all-finalized       (err u225))
(define-constant err-invalid-event-window    (err u226))

;; -------------------------------------------------------
;; DATA VARS
;; -------------------------------------------------------

(define-data-var admin principal tx-sender)
(define-data-var event-nonce uint u0)
(define-data-var question-nonce uint u0)

(define-data-var approved-oracle principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mock-pyth)
(define-data-var accumulated-fees uint u0)

;; trusted keepers that can propose/override results
(define-map approved-keepers { keeper: principal } { active: bool })

;; -------------------------------------------------------
;; MAPS
;; -------------------------------------------------------

;; Event = competition season
(define-map events
  { event-id: uint }
  {
    title: (string-ascii 64),
    creator: principal,
    start-block: uint,
    end-block: uint,
    entry-fee: uint,
    question-count: uint,
    finalized-question-count: uint,
    participant-count: uint,
    total-pool: uint,
    is-active: bool,
    fee-booked: bool
  }
)

;; optional reverse lookup
(define-map events-by-title
  { title: (string-ascii 64) }
  { event-id: uint }
)

;; Questions inside an event
(define-map questions
  { question-id: uint }
  {
    event-id: uint,
    question: (string-ascii 128),
    target-price: uint,
    close-block: uint,
    status: (string-ascii 12),
    oracle-price: uint,
    pending-outcome: (optional bool),
    proposal-block: uint,
    final-outcome: (optional bool)
  }
)

;; event -> indexed questions
(define-map event-questions
  { event-id: uint, index: uint }
  { question-id: uint }
)

;; user joined event
(define-map participants
  { event-id: uint, user: principal }
  { joined: bool }
)

;; user answer to a question
(define-map answers
  { question-id: uint, user: principal }
  {
    prediction: bool,
    points-claimed: bool
  }
)

;; user winnings claim at event level
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

(define-private (get-rank-multiplier
  (leaderboard {
    rank1: (optional { user: principal, points: uint }),
    rank2: (optional { user: principal, points: uint }),
    rank3: (optional { user: principal, points: uint }),
    rank4: (optional { user: principal, points: uint }),
    rank5: (optional { user: principal, points: uint })
  })
  (caller principal)
)
  (let (
    (r1 (get rank1 leaderboard))
    (r2 (get rank2 leaderboard))
    (r3 (get rank3 leaderboard))
    (r4 (get rank4 leaderboard))
    (r5 (get rank5 leaderboard))
  )
    (if (match r1 e1 (is-eq (get user e1) caller) false) u30
      (if (match r2 e2 (is-eq (get user e2) caller) false) u25
        (if (match r3 e3 (is-eq (get user e3) caller) false) u20
          (if (match r4 e4 (is-eq (get user e4) caller) false) u15
            (if (match r5 e5 (is-eq (get user e5) caller) false) u10 u0)
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

;; Admin creates an event season
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
          title: title,
          creator: caller,
          start-block: start-block,
          end-block: end-block,
          entry-fee: entry-fee,
          question-count: u0,
          finalized-question-count: u0,
          participant-count: u0,
          total-pool: u0,
          is-active: true,
          fee-booked: false
        }
      )

      (map-set events-by-title { title: title } { event-id: event-id })
      (ok event-id)
    )
  )
)

;; User joins event once by paying STX
(define-public (join-event (event-id uint))
  (let (
    (caller tx-sender)
    (contract-addr (as-contract tx-sender))
    (event (unwrap! (map-get? events { event-id: event-id }) err-event-not-found))
    (joined-record (map-get? participants { event-id: event-id, user: caller }))
    (entry-fee (get entry-fee event))
  )
    (begin
      (asserts! (get is-active event) err-event-closed)
      (asserts! (>= burn-block-height (get start-block event)) err-event-closed)
      (asserts! (< burn-block-height (get end-block event)) err-event-closed)
      (asserts! (is-none joined-record) err-already-joined)

      (try! (stx-transfer? entry-fee caller contract-addr))

      (map-set participants
        { event-id: event-id, user: caller }
        { joined: true }
      )

      (map-set events { event-id: event-id }
        (merge event {
          participant-count: (+ (get participant-count event) u1),
          total-pool: (+ (get total-pool event) entry-fee)
        })
      )
      (ok true)
    )
  )
)

;; Admin adds a new question while event is active
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
          event-id: event-id,
          question: question,
          target-price: target-price,
          close-block: close-block,
          status: question-status-open,
          oracle-price: u0,
          pending-outcome: none,
          proposal-block: u0,
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

;; Joined user answers a question
(define-public (answer-question
  (question-id uint)
  (prediction bool)
)
  (let (
    (caller tx-sender)
    (q (unwrap! (map-get? questions { question-id: question-id }) err-question-not-found))
    (event (unwrap! (map-get? events { event-id: (get event-id q) }) err-event-not-found))
    (joined-record (map-get? participants { event-id: (get event-id q), user: caller }))
    (existing-answer (map-get? answers { question-id: question-id, user: caller }))
  )
    (begin
      (asserts! (get is-active event) err-event-closed)
      (asserts! (is-some joined-record) err-not-joined)
      (asserts! (is-eq (get status q) question-status-open) err-question-closed)
      (asserts! (< burn-block-height (get close-block q)) err-question-closed)
      (asserts! (is-none existing-answer) err-already-answered)

      (map-set answers
        { question-id: question-id, user: caller }
        {
          prediction: prediction,
          points-claimed: false
        }
      )
      (ok true)
    )
  )
)

;; -------------------------------------------------------
;; QUESTION RESOLUTION
;; -------------------------------------------------------

;; Keeper fetches price from oracle after question closes
(define-public (propose-result
  (question-id uint)
  (oracle <pyth-oracle-trait>)
)
  (let (
    (q (unwrap! (map-get? questions { question-id: question-id }) err-question-not-found))
    (oracle-price (unwrap! (contract-call? oracle get-btc-price) (err u501)))
    (proposed-outcome (>= oracle-price (get target-price q)))
  )
    (begin
      (asserts! (is-keeper) err-unauthorized)
      (asserts! (is-eq (contract-of oracle) (var-get approved-oracle)) err-invalid-oracle)
      (asserts! (is-eq (get status q) question-status-open) err-question-closed)
      (asserts! (>= burn-block-height (get close-block q)) err-question-closed)

      (map-set questions { question-id: question-id }
        (merge q {
          status: question-status-pending,
          oracle-price: oracle-price,
          pending-outcome: (some proposed-outcome),
          proposal-block: burn-block-height
        })
      )
      (ok proposed-outcome)
    )
  )
)

;; Participant with an answer can dispute
(define-public (dispute-result (question-id uint))
  (let (
    (caller tx-sender)
    (q (unwrap! (map-get? questions { question-id: question-id }) err-question-not-found))
    (answer-record (map-get? answers { question-id: question-id, user: caller }))
  )
    (begin
      (asserts! (is-eq (get status q) question-status-pending) err-not-pending)
      (asserts! (is-some answer-record) err-no-answer)
      (asserts!
        (< burn-block-height (+ (get proposal-block q) dispute-window))
        err-dispute-window-passed
      )

      (map-set questions { question-id: question-id }
        (merge q { status: question-status-disputed })
      )
      (ok true)
    )
  )
)

;; Keeper finalizes disputed question using stored oracle price
(define-public (override-result (question-id uint))
  (let (
    (q (unwrap! (map-get? questions { question-id: question-id }) err-question-not-found))
    (event (unwrap! (map-get? events { event-id: (get event-id q) }) err-event-not-found))
    (corrected-outcome (>= (get oracle-price q) (get target-price q)))
  )
    (begin
      (asserts! (is-keeper) err-unauthorized)
      (asserts! (is-eq (get status q) question-status-disputed) err-not-disputed)

      (map-set questions { question-id: question-id }
        (merge q {
          status: question-status-final,
          final-outcome: (some corrected-outcome),
          pending-outcome: none
        })
      )

      (map-set events { event-id: (get event-id q) }
        (merge event {
          finalized-question-count: (+ (get finalized-question-count event) u1)
        })
      )
      (ok corrected-outcome)
    )
  )
)

;; Finalize after dispute window if undisputed
(define-public (finalize-question (question-id uint))
  (let (
    (q (unwrap! (map-get? questions { question-id: question-id }) err-question-not-found))
    (event (unwrap! (map-get? events { event-id: (get event-id q) }) err-event-not-found))
  )
    (begin
      (asserts! (is-eq (get status q) question-status-pending) err-not-pending)
      (asserts!
        (>= burn-block-height (+ (get proposal-block q) dispute-window))
        err-dispute-window-open
      )

      (map-set questions { question-id: question-id }
        (merge q {
          status: question-status-final,
          final-outcome: (get pending-outcome q),
          pending-outcome: none
        })
      )

      (map-set events { event-id: (get event-id q) }
        (merge event {
          finalized-question-count: (+ (get finalized-question-count event) u1)
        })
      )
      (ok true)
    )
  )
)

;; -------------------------------------------------------
;; POINTS
;; -------------------------------------------------------

;; Correct users claim points per finalized question
(define-public (claim-points (question-id uint))
  (let (
    (caller tx-sender)
    (q (unwrap! (map-get? questions { question-id: question-id }) err-question-not-found))
    (answer-record (unwrap! (map-get? answers { question-id: question-id, user: caller }) err-no-answer))
    (final-outcome (unwrap! (get final-outcome q) err-question-not-final))
  )
    (begin
      (asserts! (is-eq (get status q) question-status-final) err-question-not-final)
      (asserts! (not (get points-claimed answer-record)) err-already-claimed)
      (asserts! (is-eq (get prediction answer-record) final-outcome) err-wrong-answer)

      (map-set answers
        { question-id: question-id, user: caller }
        (merge answer-record { points-claimed: true })
      )

      ;; award 10 points for each correct answer
      (as-contract (contract-call? .reputation-points add-points (get event-id q) caller u10))
    )
  )
)

;; -------------------------------------------------------
;; EVENT CLOSING / FEES
;; -------------------------------------------------------

;; Close event only after season ends and all questions are finalized
(define-public (close-event (event-id uint))
  (let (
    (event (unwrap! (map-get? events { event-id: event-id }) err-event-not-found))
    (protocol-fee (/ (* (get total-pool event) u2) u100))
  )
    (begin
      (asserts! (is-keeper) err-unauthorized)
      (asserts! (get is-active event) err-event-closed)
      (asserts! (>= burn-block-height (get end-block event)) err-event-not-ended)
      (asserts! (is-eq (get question-count event) (get finalized-question-count event)) err-not-all-finalized)
      (asserts! (not (get fee-booked event)) err-fee-already-booked)

      (map-set events { event-id: event-id }
        (merge event {
          is-active: false,
          fee-booked: true
        })
      )

      (var-set accumulated-fees (+ (var-get accumulated-fees) protocol-fee))
      (ok true)
    )
  )
)

;; -------------------------------------------------------
;; WINNINGS
;; -------------------------------------------------------

;; Top 5 share 98% of prize pool:
;; 1st = 30%
;; 2nd = 25%
;; 3rd = 20%
;; 4th = 15%
;; 5th = 10%
(define-public (claim-winnings (event-id uint))
  (let (
    (caller tx-sender)
    (event (unwrap! (map-get? events { event-id: event-id }) err-event-not-found))
    (leaderboard (contract-call? .reputation-points get-top-5 event-id))
    (multiplier (get-rank-multiplier leaderboard caller))
    (has-claimed (default-to false (map-get? event-claims { event-id: event-id, user: caller })))
    (prize-pool (/ (* (get total-pool event) u98) u100))
    (payout-amount (/ (* prize-pool multiplier) u100))
  )
    (begin
      (asserts! (not (get is-active event)) err-event-closed)
      (asserts! (get fee-booked event) err-not-final)
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

(define-read-only (event-is-open (event-id uint))
  (event-is-open-internal event-id)
)

(define-read-only (question-is-open (question-id uint))
  (question-is-open-internal question-id)
)

(define-read-only (get-dispute-deadline (question-id uint))
  (match (map-get? questions { question-id: question-id })
    q (+ (get proposal-block q) dispute-window)
    u0
  )
)

(define-read-only (get-event-leaderboard (event-id uint))
  (contract-call? .reputation-points get-top-5 event-id)
)

(define-read-only (is-approved-keeper (addr principal))
  (default-to false (get active (map-get? approved-keepers { keeper: addr })))
)

(define-read-only (get-config)
  {
    admin: (var-get admin),
    approved-oracle: (var-get approved-oracle),
    dispute-window: dispute-window,
    max-questions-per-event: max-questions-per-event,
    accumulated-fees: (var-get accumulated-fees)
  }
)