;; title: private-rotational-events
;; description: Invite-only rotational private prediction leagues for TrueCall
;;
;; Model
;; - Creator creates a private event and defines the rules
;; - Users join BEFORE the first round starts
;; - Once the first round is started, no one else can join
;; - Participants are ordered by join sequence
;; - Question submission rotates across participants
;; - Any joined member can resolve a round by calling the oracle resolver
;; - Correct answers earn points
;; - Event ends after the configured number of rounds is completed
;;
;; Notes
;; - invite-hash must be sha256(invite-code) generated off-chain
;; - oracle is the source of truth
;; - payout logic is intentionally omitted to keep this contract focused

(use-trait pyth-oracle-trait .pyth-oracle-trait.pyth-oracle-trait)

;; -------------------------------------------------------
;; CONSTANTS
;; -------------------------------------------------------

(define-constant status-pending-submission "pending-sub")
(define-constant status-open-answering     "open-answer")
(define-constant status-final              "final")
(define-constant status-skipped            "skipped")

(define-constant max-participants u50)
(define-constant max-rounds-limit u200)
(define-constant points-per-correct u10)

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

;; -------------------------------------------------------
;; DATA VARS
;; -------------------------------------------------------

(define-data-var admin principal tx-sender)
(define-data-var private-event-nonce uint u0)
(define-data-var approved-oracle principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mock-pyth)

;; -------------------------------------------------------
;; MAPS
;; -------------------------------------------------------

;; Event-level config and state
(define-map private-events
  { event-id: uint }
  {
    creator: principal,
    title: (string-ascii 64),
    invite-hash: (buff 32),

    entry-fee: uint,

    join-deadline: uint,

    max-rounds: uint,
    interval-blocks: uint,
    submission-window: uint,
    answer-window: uint,

    participant-count: uint,
    total-pool: uint,

    current-round: uint,           ;; 0 before round 1 exists
    completed-rounds: uint,
    next-submitter-index: uint,    ;; participant index whose turn is next

    is-active: bool,
    ended: bool
  }
)

;; Join order matters for rotation
(define-map participants
  { event-id: uint, user: principal }
  {
    joined: bool,
    index: uint
  }
)

(define-map participant-index
  { event-id: uint, index: uint }
  { user: principal }
)

;; One round = one question
(define-map rounds
  { event-id: uint, round-number: uint }
  {
    submitter: principal,
    question: (optional (string-ascii 160)),
    target-price: uint,

    submission-open-block: uint,
    submission-deadline: uint,
    answer-close-block: uint,

    status: (string-ascii 16),
    oracle-price: uint,
    final-outcome: (optional bool)
  }
)

;; One answer per joined user per round
(define-map answers
  { event-id: uint, round-number: uint, user: principal }
  {
    prediction: bool,
    points-claimed: bool
  }
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

(define-private (compute-next-round-open
  (event {
    creator: principal,
    title: (string-ascii 64),
    invite-hash: (buff 32),
    entry-fee: uint,
    join-deadline: uint,
    max-rounds: uint,
    interval-blocks: uint,
    submission-window: uint,
    answer-window: uint,
    participant-count: uint,
    total-pool: uint,
    current-round: uint,
    completed-rounds: uint,
    next-submitter-index: uint,
    is-active: bool,
    ended: bool
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
    creator: principal,
    title: (string-ascii 64),
    invite-hash: (buff 32),
    entry-fee: uint,
    join-deadline: uint,
    max-rounds: uint,
    interval-blocks: uint,
    submission-window: uint,
    answer-window: uint,
    participant-count: uint,
    total-pool: uint,
    current-round: uint,
    completed-rounds: uint,
    next-submitter-index: uint,
    is-active: bool,
    ended: bool
  })
)
  (begin
    (map-set private-events { event-id: event-id }
      (merge event {
        is-active: false,
        ended: true
      })
    )
    (ok true)
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
              submitter: submitter,
              question: none,
              target-price: u0,
              submission-open-block: submission-open,
              submission-deadline: submission-deadline,
              answer-close-block: u0,
              status: status-pending-submission,
              oracle-price: u0,
              final-outcome: none
            }
          )

          (map-set private-events { event-id: event-id }
            (merge event {
              current-round: next-round-number,
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

(define-public (set-approved-oracle (new-oracle principal))
  (begin
    (asserts! (is-admin) err-unauthorized)
    (var-set approved-oracle new-oracle)
    (ok true)
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

      (var-set private-event-nonce event-id)

      (map-set private-events { event-id: event-id }
        {
          creator: caller,
          title: title,
          invite-hash: invite-hash,
          entry-fee: entry-fee,
          join-deadline: join-deadline,
          max-rounds: max-rounds,
          interval-blocks: interval-blocks,
          submission-window: submission-window,
          answer-window: answer-window,
          participant-count: u0,
          total-pool: u0,
          current-round: u0,
          completed-rounds: u0,
          next-submitter-index: u0,
          is-active: true,
          ended: false
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
        { joined: true, index: new-index }
      )

      (map-set participant-index
        { event-id: event-id, index: new-index }
        { user: caller }
      )

      (map-set private-events { event-id: event-id }
        (merge event {
          participant-count: (+ new-index u1),
          total-pool: (+ (get total-pool event) (get entry-fee event))
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

      (map-set rounds
        { event-id: event-id, round-number: round-number }
        (merge round {
          question: (some question),
          target-price: target-price,
          answer-close-block: (+ burn-block-height (get answer-window event)),
          status: status-open-answering
        })
      )
      (ok true)
    )
  )
)

;; If submitter misses the submission window, any member can skip that round
(define-public (skip-missed-round (event-id uint) (round-number uint))
  (let (
    (caller tx-sender)
    (event (unwrap! (map-get? private-events { event-id: event-id }) err-event-not-found))
    (round (unwrap! (map-get? rounds { event-id: event-id, round-number: round-number }) err-round-not-found))
    (completed-next (+ (get completed-rounds event) u1))
  )
    (begin
      (asserts! (is-event-member event-id caller) err-not-joined)
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

;; Any joined member can resolve a round after answer-close-block.
;; Contract reads oracle directly.
(define-public (resolve-round
  (event-id uint)
  (round-number uint)
  (oracle <pyth-oracle-trait>)
)
  (let (
    (caller tx-sender)
    (event (unwrap! (map-get? private-events { event-id: event-id }) err-event-not-found))
    (round (unwrap! (map-get? rounds { event-id: event-id, round-number: round-number }) err-round-not-found))
    (oracle-price (unwrap! (contract-call? oracle get-btc-price) (err u501)))
    (outcome (>= oracle-price (get target-price round)))
    (completed-next (+ (get completed-rounds event) u1))
  )
    (begin
      (asserts! (is-event-member event-id caller) err-not-joined)
      (asserts! (is-eq (contract-of oracle) (var-get approved-oracle)) err-invalid-oracle)
      (asserts! (get is-active event) err-event-ended)
      (asserts! (is-eq (get status round) status-open-answering) err-round-not-open)
      (asserts! (>= burn-block-height (get answer-close-block round)) err-round-not-closable)

      (map-set rounds
        { event-id: event-id, round-number: round-number }
        (merge round {
          status: status-final,
          oracle-price: oracle-price,
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

;; -------------------------------------------------------
;; POINTS
;; -------------------------------------------------------

;; Only users with correct prediction claim points for that round
(define-public (claim-round-points (event-id uint) (round-number uint))
  (let (
    (caller tx-sender)
    (round (unwrap! (map-get? rounds { event-id: event-id, round-number: round-number }) err-round-not-found))
    (answer-record (unwrap! (map-get? answers { event-id: event-id, round-number: round-number, user: caller }) err-no-answer))
    (final-outcome (unwrap! (get final-outcome round) err-round-not-final))
  )
    (begin
      (asserts! (is-eq (get status round) status-final) err-round-not-final)
      (asserts! (not (get points-claimed answer-record)) err-already-claimed)
      (asserts! (is-eq (get prediction answer-record) final-outcome) err-wrong-answer)

      (map-set answers
        { event-id: event-id, round-number: round-number, user: caller }
        (merge answer-record { points-claimed: true })
      )

      ;; Points are namespaced by event-id
      (as-contract (contract-call? .reputation-points add-points event-id caller points-per-correct))
    )
  )
)

;; -------------------------------------------------------
;; OPTIONAL EVENT FINALIZER
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
        (merge event {
          is-active: false,
          ended: true
        })
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

(define-read-only (get-private-leaderboard (event-id uint))
  (contract-call? .reputation-points get-top-5 event-id)
)

(define-read-only (event-is-member (event-id uint) (user principal))
  (is-event-member event-id user)
)

(define-read-only (get-private-config)
  {
    admin: (var-get admin),
    approved-oracle: (var-get approved-oracle),
    max-participants: max-participants,
    max-rounds-limit: max-rounds-limit,
    points-per-correct: points-per-correct
  }
)