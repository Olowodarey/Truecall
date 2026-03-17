;; title: private-rotational-events
;; description: Invite-only rotational private prediction leagues for TrueCall
;;
;; Model
;; - Creator creates a private event and defines the rules
;; - Users join BEFORE the first round starts
;; - Once the first round is started, no one else can join
;; - Participants are ordered by join sequence
;; - Question submission rotates across participants
;; - Any joined member can resolve a round by supplying the keeper price
;; - Correct answers earn points tracked inline (same as truecall)
;; - Event ends after the configured number of rounds is completed
;;
;; Notes
;; - invite-hash must be sha256(invite-code) generated off-chain
;; - Resolution uses keeper-supplied price (no on-chain oracle trait)
;; - Points and top-5 leaderboard are stored inline, no external contract

;; -------------------------------------------------------
;; CONSTANTS
;; -------------------------------------------------------

(define-constant status-pending-submission "pending-sub")
(define-constant status-open-answering     "open-answer")
(define-constant status-final              "final")
(define-constant status-skipped            "skipped")

(define-constant max-participants   u50)
(define-constant max-rounds-limit   u200)
(define-constant points-per-correct u10)

;; Payout percentages (must sum to 98)
(define-constant payout-rank1 u30)
(define-constant payout-rank2 u25)
(define-constant payout-rank3 u20)
(define-constant payout-rank4 u15)
(define-constant payout-rank5 u8)

;; -------------------------------------------------------
;; ERROR CODES
;; -------------------------------------------------------

(define-constant err-unauthorized             (err u700))
(define-constant err-event-not-found          (err u701))
(define-constant err-round-not-found          (err u702))
(define-constant err-invalid-window           (err u703))
(define-constant err-zero-entry-fee           (err u704))
(define-constant err-already-joined           (err u705))
(define-constant err-invalid-invite-code      (err u706))
(define-constant err-not-joined               (err u707))
(define-constant err-event-not-open           (err u708))
(define-constant err-event-ended              (err u709))
(define-constant err-too-many-participants    (err u710))
(define-constant err-too-many-rounds          (err u711))
(define-constant err-not-current-submitter    (err u712))
(define-constant err-round-not-awaiting-sub   (err u713))
(define-constant err-round-not-open           (err u714))
(define-constant err-already-answered         (err u715))
(define-constant err-round-not-closable       (err u716))
(define-constant err-invalid-oracle           (err u717))
(define-constant err-round-already-final      (err u718))
(define-constant err-no-answer                (err u719))
(define-constant err-already-claimed          (err u720))
(define-constant err-wrong-answer             (err u721))
(define-constant err-event-not-complete       (err u722))
(define-constant err-round-submission-open    (err u723))
(define-constant err-round-already-exists     (err u724))
(define-constant err-invalid-round-number     (err u725))
(define-constant err-invalid-participant      (err u726))
(define-constant err-invalid-config           (err u727))
(define-constant err-round-not-final          (err u728))
(define-constant err-event-already-ended      (err u729))
(define-constant err-not-event-creator        (err u730))
(define-constant err-join-still-open          (err u731))
(define-constant err-event-already-started    (err u732))
(define-constant err-invalid-price            (err u733))
(define-constant err-not-winner               (err u734))
(define-constant err-not-final                (err u735))
(define-constant err-not-refundable           (err u736))
(define-constant err-refund-already-claimed   (err u737))
(define-constant err-event-still-active       (err u738))
(define-constant err-fee-already-booked       (err u739))
(define-constant err-amount-too-large         (err u740))

;; -------------------------------------------------------
;; DATA VARS
;; -------------------------------------------------------

(define-data-var admin               principal tx-sender)
(define-data-var private-event-nonce uint      u0)
(define-data-var accumulated-fees    uint      u0)

;; -------------------------------------------------------
;; MAPS
;; -------------------------------------------------------

(define-map private-events
  { event-id: uint }
  {
    creator:             principal,
    title:               (string-ascii 64),
    invite-hash:         (buff 32),
    entry-fee:           uint,
    join-deadline:       uint,
    max-rounds:          uint,
    interval-blocks:     uint,
    submission-window:   uint,
    answer-window:       uint,
    participant-count:   uint,
    total-pool:          uint,
    current-round:       uint,
    completed-rounds:    uint,
    next-submitter-index: uint,
    is-active:           bool,
    ended:               bool,
    fee-booked:          bool,
    refund-mode:         bool
  }
)

;; Join order matters for rotation
(define-map participants
  { event-id: uint, user: principal }
  { joined: bool, index: uint, refund-claimed: bool }
)

(define-map participant-index
  { event-id: uint, index: uint }
  { user: principal }
)

;; One round = one question
(define-map rounds
  { event-id: uint, round-number: uint }
  {
    submitter:             principal,
    question:              (optional (string-ascii 160)),
    target-price:          uint,
    submission-open-block: uint,
    submission-deadline:   uint,
    answer-close-block:    uint,
    status:                (string-ascii 16),
    oracle-price:          uint,
    final-outcome:         (optional bool)
  }
)

;; One answer per joined user per round
(define-map answers
  { event-id: uint, round-number: uint, user: principal }
  { prediction: bool, points-claimed: bool }
)

;; Inline points storage (same pattern as truecall)
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

(define-private (validate-invite (stored-hash (buff 32)) (invite-code (buff 64)))
  (is-eq (sha256 invite-code) stored-hash)
)

(define-private (is-event-member (event-id uint) (user principal))
  (is-some (map-get? participants { event-id: event-id, user: user }))
)

(define-private (advance-index (current uint) (count uint))
  (if (is-eq count u0)
      u0
      (if (>= (+ current u1) count) u0 (+ current u1))
  )
)

(define-private (get-participant-user (event-id uint) (index uint))
  (get user (unwrap! (map-get? participant-index { event-id: event-id, index: index }) err-invalid-participant))
)

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

;; Inline top-5 leaderboard update — identical to truecall
(define-private (update-top5 (event-id uint) (user principal) (new-points uint))
  (let (
    (current (default-to
      { rank1: none, rank2: none, rank3: none, rank4: none, rank5: none }
      (map-get? top5-map { event-id: event-id })
    ))
    (entry (some { user: user, points: new-points }))
    (in-r1 (match (get rank1 current) e (is-eq (get user e) user) false))
    (in-r2 (match (get rank2 current) e (is-eq (get user e) user) false))
    (in-r3 (match (get rank3 current) e (is-eq (get user e) user) false))
    (in-r4 (match (get rank4 current) e (is-eq (get user e) user) false))
    (in-r5 (match (get rank5 current) e (is-eq (get user e) user) false))
    (already-in (or in-r1 (or in-r2 (or in-r3 (or in-r4 in-r5)))))
    (slot-a (if in-r1 (get rank2 current) (get rank1 current)))
    (slot-b (if (or in-r1 in-r2) (get rank3 current) (get rank2 current)))
    (slot-c (if (or in-r1 in-r2 in-r3) (get rank4 current) (get rank3 current)))
    (slot-d (if in-r5 (get rank4 current) (get rank5 current)))
    (sa (match slot-a e (get points e) u0))
    (sb (match slot-b e (get points e) u0))
    (sc (match slot-c e (get points e) u0))
    (sd (match slot-d e (get points e) u0))
    (p1 (match (get rank1 current) e (get points e) u0))
    (p2 (match (get rank2 current) e (get points e) u0))
    (p3 (match (get rank3 current) e (get points e) u0))
    (p4 (match (get rank4 current) e (get points e) u0))
    (p5 (match (get rank5 current) e (get points e) u0))
  )
    (if already-in
      (if (>= new-points sa)
        (map-set top5-map { event-id: event-id }
          { rank1: entry, rank2: slot-a, rank3: slot-b, rank4: slot-c, rank5: slot-d })
        (if (>= new-points sb)
          (map-set top5-map { event-id: event-id }
            { rank1: slot-a, rank2: entry, rank3: slot-b, rank4: slot-c, rank5: slot-d })
          (if (>= new-points sc)
            (map-set top5-map { event-id: event-id }
              { rank1: slot-a, rank2: slot-b, rank3: entry, rank4: slot-c, rank5: slot-d })
            (if (>= new-points sd)
              (map-set top5-map { event-id: event-id }
                { rank1: slot-a, rank2: slot-b, rank3: slot-c, rank4: entry, rank5: slot-d })
              (map-set top5-map { event-id: event-id }
                { rank1: slot-a, rank2: slot-b, rank3: slot-c, rank4: slot-d, rank5: entry })
            )
          )
        )
      )
      (if (>= new-points p1)
        (map-set top5-map { event-id: event-id }
          { rank1: entry, rank2: (get rank1 current), rank3: (get rank2 current), rank4: (get rank3 current), rank5: (get rank4 current) })
        (if (>= new-points p2)
          (map-set top5-map { event-id: event-id }
            { rank1: (get rank1 current), rank2: entry, rank3: (get rank2 current), rank4: (get rank3 current), rank5: (get rank4 current) })
          (if (>= new-points p3)
            (map-set top5-map { event-id: event-id }
              { rank1: (get rank1 current), rank2: (get rank2 current), rank3: entry, rank4: (get rank3 current), rank5: (get rank4 current) })
            (if (>= new-points p4)
              (map-set top5-map { event-id: event-id }
                { rank1: (get rank1 current), rank2: (get rank2 current), rank3: (get rank3 current), rank4: entry, rank5: (get rank4 current) })
              (if (>= new-points p5)
                (map-set top5-map { event-id: event-id }
                  { rank1: (get rank1 current), rank2: (get rank2 current), rank3: (get rank3 current), rank4: (get rank4 current), rank5: entry })
                true
              )
            )
          )
        )
      )
    )
  )
)

(define-private (compute-next-round-open
  (event {
    creator: principal, title: (string-ascii 64), invite-hash: (buff 32),
    entry-fee: uint, join-deadline: uint, max-rounds: uint,
    interval-blocks: uint, submission-window: uint, answer-window: uint,
    participant-count: uint, total-pool: uint, current-round: uint,
    completed-rounds: uint, next-submitter-index: uint,
    is-active: bool, ended: bool, fee-booked: bool, refund-mode: bool
  })
)
  (if (is-eq (get current-round event) u0)
      (get join-deadline event)
      (+ burn-block-height (get interval-blocks event))
  )
)

(define-private (end-event-internal
  (event-id uint)
  (event {
    creator: principal, title: (string-ascii 64), invite-hash: (buff 32),
    entry-fee: uint, join-deadline: uint, max-rounds: uint,
    interval-blocks: uint, submission-window: uint, answer-window: uint,
    participant-count: uint, total-pool: uint, current-round: uint,
    completed-rounds: uint, next-submitter-index: uint,
    is-active: bool, ended: bool, fee-booked: bool, refund-mode: bool
  })
)
  (let (
    (enough-participants (>= (get participant-count event) u5))
    (protocol-fee (/ (* (get total-pool event) u2) u100))
  )
    (begin
      (if enough-participants
        (begin
          (map-set private-events { event-id: event-id }
            (merge event { is-active: false, ended: true, fee-booked: true, refund-mode: false })
          )
          (var-set accumulated-fees (+ (var-get accumulated-fees) protocol-fee))
          (ok true)
        )
        (begin
          (map-set private-events { event-id: event-id }
            (merge event { is-active: false, ended: true, fee-booked: true, refund-mode: true })
          )
          (ok true)
        )
      )
    )
  )
)

(define-private (spawn-next-round (event-id uint))
  (let (
    (event (unwrap! (map-get? private-events { event-id: event-id }) err-event-not-found))
    (participant-count (get participant-count event))
    (next-round-number (+ (get current-round event) u1))
    (submitter-index (get next-submitter-index event))
    (submission-open (compute-next-round-open event))
  )
    (begin
      (asserts! (> participant-count u0) err-invalid-participant)
      (asserts! (<= next-round-number (get max-rounds event)) err-invalid-round-number)
      (let (
        (submitter (get-participant-user event-id submitter-index))
        (submission-deadline (+ submission-open (get submission-window event)))
      )
        (begin
          (map-set rounds
            { event-id: event-id, round-number: next-round-number }
            {
              submitter:             submitter,
              question:              none,
              target-price:          u0,
              submission-open-block: submission-open,
              submission-deadline:   submission-deadline,
              answer-close-block:    u0,
              status:                status-pending-submission,
              oracle-price:          u0,
              final-outcome:         none
            }
          )
          (map-set private-events { event-id: event-id }
            (merge event {
              current-round:        next-round-number,
              next-submitter-index: (advance-index submitter-index participant-count)
            })
          )
          (ok next-round-number)
        )
      )
    )
  )
)

;; -------------------------------------------------------
;; ADMIN
;; -------------------------------------------------------

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin) err-unauthorized)
    (var-set admin new-admin)
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
      (try! (as-contract (stx-transfer? amount tx-sender caller)))
      (ok amount)
    )
  )
)

;; -------------------------------------------------------
;; EVENT FLOW
;; -------------------------------------------------------

;; Creator defines the private league rules
(define-public (create-private-event
  (title (string-ascii 64))
  (invite-hash (buff 32))
  (entry-fee uint)
  (join-deadline uint)
  (max-rounds uint)
  (interval-blocks uint)
  (submission-window uint)
  (answer-window uint)
)
  (let (
    (caller tx-sender)
    (event-id (+ (var-get private-event-nonce) u1))
  )
    (begin
      (asserts! (> entry-fee u0) err-zero-entry-fee)
      (asserts! (> join-deadline burn-block-height) err-invalid-window)
      (asserts! (> max-rounds u0) err-invalid-config)
      (asserts! (<= max-rounds max-rounds-limit) err-too-many-rounds)
      (asserts! (> submission-window u0) err-invalid-config)
      (asserts! (> answer-window u0) err-invalid-config)
      ;; interval-blocks = 0 would collapse all rounds to the same block
      (asserts! (> interval-blocks u0) err-invalid-config)

      (var-set private-event-nonce event-id)

      (map-set private-events { event-id: event-id }
        {
          creator:              caller,
          title:                title,
          invite-hash:          invite-hash,
          entry-fee:            entry-fee,
          join-deadline:        join-deadline,
          max-rounds:           max-rounds,
          interval-blocks:      interval-blocks,
          submission-window:    submission-window,
          answer-window:        answer-window,
          participant-count:    u0,
          total-pool:           u0,
          current-round:        u0,
          completed-rounds:     u0,
          next-submitter-index: u0,
          is-active:            true,
          ended:                false,
          fee-booked:           false,
          refund-mode:          false
        }
      )
      (ok event-id)
    )
  )
)

;; Users join before the first round starts.
;; Once current-round > 0, nobody else can join.
(define-public (join-private-event
  (event-id uint)
  (invite-code (buff 64))
)
  (let (
    (caller tx-sender)
    (contract-addr (as-contract tx-sender))
    (event (unwrap! (map-get? private-events { event-id: event-id }) err-event-not-found))
    (existing (map-get? participants { event-id: event-id, user: caller }))
    (new-index (get participant-count event))
  )
    (begin
      (asserts! (get is-active event) err-event-ended)
      (asserts! (not (get ended event)) err-event-ended)
      (asserts! (is-eq (get current-round event) u0) err-event-already-started)
      (asserts! (< burn-block-height (get join-deadline event)) err-event-not-open)
      (asserts! (is-none existing) err-already-joined)
      (asserts! (< new-index max-participants) err-too-many-participants)
      (asserts! (validate-invite (get invite-hash event) invite-code) err-invalid-invite-code)

      (try! (stx-transfer? (get entry-fee event) caller contract-addr))

      (map-set participants
        { event-id: event-id, user: caller }
        { joined: true, index: new-index, refund-claimed: false }
      )
      (map-set participant-index
        { event-id: event-id, index: new-index }
        { user: caller }
      )
      (map-set private-events { event-id: event-id }
        (merge event {
          participant-count: (+ new-index u1),
          total-pool:        (+ (get total-pool event) (get entry-fee event))
        })
      )
      (ok true)
    )
  )
)

;; Creator starts the first round AFTER joining has closed
(define-public (start-private-event (event-id uint))
  (let (
    (caller tx-sender)
    (event (unwrap! (map-get? private-events { event-id: event-id }) err-event-not-found))
  )
    (begin
      (asserts! (is-eq caller (get creator event)) err-not-event-creator)
      (asserts! (get is-active event) err-event-ended)
      (asserts! (not (get ended event)) err-event-ended)
      (asserts! (>= burn-block-height (get join-deadline event)) err-join-still-open)
      (asserts! (> (get participant-count event) u0) err-invalid-participant)
      (asserts! (is-eq (get current-round event) u0) err-round-already-exists)
      (spawn-next-round event-id)
    )
  )
)

;; Current designated submitter posts the question for the active round
;; FIX: added (> target-price u0) guard
(define-public (submit-round-question
  (event-id uint)
  (round-number uint)
  (question (string-ascii 160))
  (target-price uint)
)
  (let (
    (caller tx-sender)
    (event (unwrap! (map-get? private-events { event-id: event-id }) err-event-not-found))
    (round (unwrap! (map-get? rounds { event-id: event-id, round-number: round-number }) err-round-not-found))
  )
    (begin
      (asserts! (get is-active event) err-event-ended)
      (asserts! (is-eq round-number (get current-round event)) err-invalid-round-number)
      (asserts! (is-eq (get status round) status-pending-submission) err-round-not-awaiting-sub)
      (asserts! (>= burn-block-height (get submission-open-block round)) err-round-submission-open)
      (asserts! (< burn-block-height (get submission-deadline round)) err-round-not-awaiting-sub)
      (asserts! (is-eq caller (get submitter round)) err-not-current-submitter)
      ;; target-price must be non-zero or outcome is trivially always true
      (asserts! (> target-price u0) err-invalid-price)

      (map-set rounds
        { event-id: event-id, round-number: round-number }
        (merge round {
          question:          (some question),
          target-price:      target-price,
          answer-close-block: (+ burn-block-height (get answer-window event)),
          status:            status-open-answering
        })
      )
      (ok true)
    )
  )
)

;; If submitter misses the submission window, only the creator can skip that round
(define-public (skip-missed-round (event-id uint) (round-number uint))
  (let (
    (caller tx-sender)
    (event (unwrap! (map-get? private-events { event-id: event-id }) err-event-not-found))
    (round (unwrap! (map-get? rounds { event-id: event-id, round-number: round-number }) err-round-not-found))
    (completed-next (+ (get completed-rounds event) u1))
  )
    (begin
      (asserts! (is-eq caller (get creator event)) err-not-event-creator)
      (asserts! (get is-active event) err-event-ended)
      (asserts! (is-eq (get status round) status-pending-submission) err-round-not-awaiting-sub)
      (asserts! (>= burn-block-height (get submission-deadline round)) err-round-submission-open)

      (map-set rounds
        { event-id: event-id, round-number: round-number }
        (merge round { status: status-skipped })
      )

      (if (>= completed-next (get max-rounds event))
          (end-event-internal event-id (merge event { completed-rounds: completed-next }))
          (begin
            (map-set private-events { event-id: event-id }
              (merge event { completed-rounds: completed-next })
            )
            (spawn-next-round event-id)
          )
      )
    )
  )
)

;; Joined members answer the active round
;; FIX: added round-number must match current-round guard
(define-public (answer-round
  (event-id uint)
  (round-number uint)
  (prediction bool)
)
  (let (
    (caller tx-sender)
    (event (unwrap! (map-get? private-events { event-id: event-id }) err-event-not-found))
    (round (unwrap! (map-get? rounds { event-id: event-id, round-number: round-number }) err-round-not-found))
    (joined (map-get? participants { event-id: event-id, user: caller }))
    (existing-answer (map-get? answers { event-id: event-id, round-number: round-number, user: caller }))
  )
    (begin
      (asserts! (get is-active event) err-event-ended)
      (asserts! (is-some joined) err-not-joined)
      ;; Only the current active round can be answered
      (asserts! (is-eq round-number (get current-round event)) err-invalid-round-number)
      (asserts! (is-eq (get status round) status-open-answering) err-round-not-open)
      (asserts! (< burn-block-height (get answer-close-block round)) err-round-not-closable)
      (asserts! (is-none existing-answer) err-already-answered)

      (map-set answers
        { event-id: event-id, round-number: round-number, user: caller }
        { prediction: prediction, points-claimed: false }
      )
      (ok true)
    )
  )
)

;; -------------------------------------------------------
;; ROUND RESOLUTION
;; -------------------------------------------------------

;; Only the event creator can resolve a round by supplying the keeper price.
;; This is their sole admin privilege — no other special powers.
(define-public (resolve-round
  (event-id uint)
  (round-number uint)
  (oracle-price uint)
)
  (let (
    (caller tx-sender)
    (event (unwrap! (map-get? private-events { event-id: event-id }) err-event-not-found))
    (round (unwrap! (map-get? rounds { event-id: event-id, round-number: round-number }) err-round-not-found))
    (completed-next (+ (get completed-rounds event) u1))
  )
    (begin
      ;; Only the creator of this event can finalize/resolve rounds
      (asserts! (is-eq caller (get creator event)) err-not-event-creator)
      (asserts! (get is-active event) err-event-ended)
      (asserts! (is-eq (get status round) status-open-answering) err-round-not-open)
      (asserts! (>= burn-block-height (get answer-close-block round)) err-round-not-closable)
      (asserts! (> oracle-price u0) err-invalid-price)

      (let (
        (outcome (>= oracle-price (get target-price round)))
      )
        (begin
          (map-set rounds
            { event-id: event-id, round-number: round-number }
            (merge round {
              status:        status-final,
              oracle-price:  oracle-price,
              final-outcome: (some outcome)
            })
          )

          (if (>= completed-next (get max-rounds event))
              (end-event-internal event-id (merge event { completed-rounds: completed-next }))
              (begin
                (map-set private-events { event-id: event-id }
                  (merge event { completed-rounds: completed-next })
                )
                (spawn-next-round event-id)
              )
          )
        )
      )
    )
  )
)

;; -------------------------------------------------------
;; POINTS
;; -------------------------------------------------------

;; FIX: inline points storage — no external .reputation-points contract
(define-public (claim-round-points (event-id uint) (round-number uint))
  (let (
    (caller tx-sender)
    (round (unwrap! (map-get? rounds { event-id: event-id, round-number: round-number }) err-round-not-found))
    (answer-record (unwrap! (map-get? answers { event-id: event-id, round-number: round-number, user: caller }) err-no-answer))
    (final-outcome (unwrap! (get final-outcome round) err-round-not-final))
    (current-points (default-to u0 (get points (map-get? points-map { event-id: event-id, user: caller }))))
    (new-points (+ current-points points-per-correct))
  )
    (begin
      (asserts! (is-eq (get status round) status-final) err-round-not-final)
      (asserts! (not (get points-claimed answer-record)) err-already-claimed)
      (asserts! (is-eq (get prediction answer-record) final-outcome) err-wrong-answer)

      (map-set answers
        { event-id: event-id, round-number: round-number, user: caller }
        (merge answer-record { points-claimed: true })
      )
      (map-set points-map
        { event-id: event-id, user: caller }
        { points: new-points }
      )
      (update-top5 event-id caller new-points)
      (ok new-points)
    )
  )
)

;; -------------------------------------------------------
;; REFUND
;; -------------------------------------------------------

(define-public (claim-refund (event-id uint))
  (let (
    (caller tx-sender)
    (event (unwrap! (map-get? private-events { event-id: event-id }) err-event-not-found))
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
      (try! (as-contract (stx-transfer? (get entry-fee event) tx-sender caller)))
      (ok true)
    )
  )
)

;; -------------------------------------------------------
;; WINNINGS
;; -------------------------------------------------------

(define-public (claim-winnings (event-id uint))
  (let (
    (caller tx-sender)
    (event (unwrap! (map-get? private-events { event-id: event-id }) err-event-not-found))
    (multiplier (get-rank-multiplier event-id caller))
    (has-claimed (default-to false (map-get? event-claims { event-id: event-id, user: caller })))
    (prize-pool (/ (* (get total-pool event) u98) u100))
    (payout-amount (/ (* prize-pool multiplier) u100))
  )
    (begin
      (asserts! (not (get is-active event)) err-event-still-active)
      (asserts! (get fee-booked event) err-not-final)
      (asserts! (not (get refund-mode event)) err-not-refundable)
      (asserts! (> multiplier u0) err-not-winner)
      (asserts! (not has-claimed) err-already-claimed)
      (map-set event-claims { event-id: event-id, user: caller } true)
      (try! (as-contract (stx-transfer? payout-amount tx-sender caller)))
      (ok payout-amount)
    )
  )
)

;; -------------------------------------------------------
;; OPTIONAL MANUAL FINALIZER (fallback only)
;; -------------------------------------------------------

(define-public (finalize-private-event (event-id uint))
  (let (
    (caller tx-sender)
    (event (unwrap! (map-get? private-events { event-id: event-id }) err-event-not-found))
  )
    (begin
      (asserts! (is-event-member event-id caller) err-not-joined)
      (asserts! (>= (get completed-rounds event) (get max-rounds event)) err-event-not-complete)
      (asserts! (not (get ended event)) err-event-already-ended)
      (map-set private-events { event-id: event-id }
        (merge event { is-active: false, ended: true })
      )
      (ok true)
    )
  )
)

;; -------------------------------------------------------
;; READ ONLY
;; -------------------------------------------------------

(define-read-only (get-private-event (event-id uint))
  (map-get? private-events { event-id: event-id })
)

(define-read-only (get-private-participant (event-id uint) (user principal))
  (map-get? participants { event-id: event-id, user: user })
)

(define-read-only (get-participant-by-index (event-id uint) (index uint))
  (map-get? participant-index { event-id: event-id, index: index })
)

(define-read-only (get-round (event-id uint) (round-number uint))
  (map-get? rounds { event-id: event-id, round-number: round-number })
)

(define-read-only (get-round-answer (event-id uint) (round-number uint) (user principal))
  (map-get? answers { event-id: event-id, round-number: round-number, user: user })
)

(define-read-only (get-user-points (event-id uint) (user principal))
  (default-to u0 (get points (map-get? points-map { event-id: event-id, user: user })))
)

(define-read-only (get-leaderboard (event-id uint))
  (map-get? top5-map { event-id: event-id })
)

(define-read-only (event-is-member (event-id uint) (user principal))
  (is-event-member event-id user)
)

(define-read-only (get-private-config)
  {
    admin:            (var-get admin),
    max-participants: max-participants,
    max-rounds-limit: max-rounds-limit,
    points-per-correct: points-per-correct,
    accumulated-fees: (var-get accumulated-fees)
  }
)
