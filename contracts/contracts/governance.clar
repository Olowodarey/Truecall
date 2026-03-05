;; title: governance
;; description: DAO contract where stakers propose and vote on future prediction questions.
;;   Approved proposals are executed by a keeper who calls prediction-market.create-event.
;;
;; Security features:
;;  - Min stake age:     proposer/voter must have been staked for >= MIN-STAKE-AGE blocks
;;  - Lock stake:        voter's STX is locked in staking.clar until the vote window closes
;;  - Spam limit:        max MAX-ACTIVE-PROPOSALS active proposals per user at once
;;  - Execution expiry:  approved proposals not executed within executive-window blocks expire

;; -------------------------------------------------------
;; ERROR CODES
;; -------------------------------------------------------
(define-constant err-unauthorized          (err u400))
(define-constant err-not-found             (err u401))
(define-constant err-not-active            (err u402))
(define-constant err-already-voted         (err u403))
(define-constant err-voting-open           (err u404))
(define-constant err-below-min-stake       (err u405))
(define-constant err-stake-too-young       (err u406))
(define-constant err-already-executed      (err u407))
(define-constant err-not-approved          (err u408))
(define-constant err-quorum-not-met        (err u409))
(define-constant err-spam-limit            (err u410))
(define-constant err-expired               (err u411))
(define-constant err-voting-not-ended      (err u412))

;; -------------------------------------------------------
;; CONSTANTS
;; -------------------------------------------------------
;; Maximum active (unfinalized) proposals a single address may have at once
(define-constant MAX-ACTIVE-PROPOSALS u2)

;; Proposal status strings
(define-constant STATUS-ACTIVE    "active")
(define-constant STATUS-APPROVED  "approved")
(define-constant STATUS-REJECTED  "rejected")
(define-constant STATUS-EXECUTED  "executed")
(define-constant STATUS-CANCELLED "cancelled")
(define-constant STATUS-EXPIRED   "expired")

;; -------------------------------------------------------
;; DATA VARS  (all admin-tunable)
;; -------------------------------------------------------
(define-data-var proposal-nonce     uint u0)
(define-data-var admin              principal tx-sender)

;; Voting window in burn blocks (~1 day at 10 min/block)
(define-data-var voting-duration    uint u144)
;; Minimum microSTX staked to propose or vote
(define-data-var min-stake          uint u1000000)
;; Minimum blocks the stake must be held before it's eligible (1 day)
(define-data-var min-stake-age      uint u144)
;; Minimum total microSTX cast (quorum) for a vote to count
(define-data-var quorum-threshold   uint u1000000)
;; Blocks after approval within which keeper must execute before it expires (~5 days)
(define-data-var execution-window   uint u720)

;; -------------------------------------------------------
;; MAPS
;; -------------------------------------------------------

;; All proposal data
(define-map proposals
    { proposal-id: uint }
    {
        proposer:       principal,
        title:          (string-ascii 64),
        question:       (string-ascii 128),
        target-price:   uint,
        entry-fee:      uint,
        blocks-open:    uint,
        use-sbtc:       bool,
        created-at:     uint,
        vote-end-block: uint,
        status:         (string-ascii 12),
        yes-votes:      uint,
        no-votes:       uint,
        event-id:       uint        ;; 0 until executed
    }
)

;; Per-user vote record
(define-map votes
    { proposal-id: uint, voter: principal }
    { vote: bool, power: uint }
)

;; Number of currently active (unfinalized/uncancelled) proposals per user
(define-map active-count
    { user: principal }
    { count: uint }
)

;; -------------------------------------------------------
;; PRIVATE HELPERS
;; -------------------------------------------------------

(define-private (is-admin)
    (is-eq tx-sender (var-get admin))
)

;; Increment an address's active proposal counter
(define-private (inc-active-count (user principal))
    (let ((current (get count (default-to { count: u0 } (map-get? active-count { user: user })))))
        (map-set active-count { user: user } { count: (+ current u1) })
    )
)

;; Decrement an address's active proposal counter (floor 0)
(define-private (dec-active-count (user principal))
    (let ((current (get count (default-to { count: u0 } (map-get? active-count { user: user })))))
        (map-set active-count { user: user }
            { count: (if (> current u0) (- current u1) u0) }
        )
    )
)

;; -------------------------------------------------------
;; ADMIN FUNCTIONS
;; -------------------------------------------------------

(define-public (set-admin (new-admin principal))
    (begin
        (asserts! (is-admin) err-unauthorized)
        (var-set admin new-admin)
        (ok true)
    )
)

(define-public (set-voting-duration (blocks uint))
    (begin (asserts! (is-admin) err-unauthorized) (var-set voting-duration blocks) (ok true))
)

(define-public (set-min-stake (amount uint))
    (begin (asserts! (is-admin) err-unauthorized) (var-set min-stake amount) (ok true))
)

(define-public (set-min-stake-age (blocks uint))
    (begin (asserts! (is-admin) err-unauthorized) (var-set min-stake-age blocks) (ok true))
)

(define-public (set-quorum-threshold (amount uint))
    (begin (asserts! (is-admin) err-unauthorized) (var-set quorum-threshold amount) (ok true))
)

(define-public (set-execution-window (blocks uint))
    (begin (asserts! (is-admin) err-unauthorized) (var-set execution-window blocks) (ok true))
)

;; -------------------------------------------------------
;; FUNCTION 1: create-proposal
;; Any staker with enough stake age may propose a prediction question.
;; Spam limit: max MAX-ACTIVE-PROPOSALS unfinalized proposals per user.
;; -------------------------------------------------------
(define-public (create-proposal
    (title       (string-ascii 64))
    (question    (string-ascii 128))
    (target-price uint)
    (entry-fee   uint)
    (blocks-open uint)
    (use-sbtc    bool)
)
    (let (
        (caller        tx-sender)
        (stake-info    (contract-call? .staking get-stake-info caller))
        (staked-bal    (get stx-balance stake-info))
        (staked-at     (get stx-staked-at stake-info))
        (stake-age     (if (>= burn-block-height staked-at)
                          (- burn-block-height staked-at)
                          u0))
        (user-active   (get count (default-to { count: u0 } (map-get? active-count { user: caller }))))
        (new-id        (+ (var-get proposal-nonce) u1))
        (vote-end      (+ burn-block-height (var-get voting-duration)))
    )
        (begin
            ;; Must have enough stake
            (asserts! (>= staked-bal (var-get min-stake)) err-below-min-stake)
            ;; Stake must be at least min-stake-age blocks old
            (asserts! (>= stake-age (var-get min-stake-age)) err-stake-too-young)
            ;; Spam limit
            (asserts! (< user-active MAX-ACTIVE-PROPOSALS) err-spam-limit)

            (var-set proposal-nonce new-id)
            (map-set proposals { proposal-id: new-id }
                {
                    proposer:       caller,
                    title:          title,
                    question:       question,
                    target-price:   target-price,
                    entry-fee:      entry-fee,
                    blocks-open:    blocks-open,
                    use-sbtc:       use-sbtc,
                    created-at:     burn-block-height,
                    vote-end-block: vote-end,
                    status:         STATUS-ACTIVE,
                    yes-votes:      u0,
                    no-votes:       u0,
                    event-id:       u0
                }
            )
            (inc-active-count caller)
            (ok new-id)
        )
    )
)

;; -------------------------------------------------------
;; FUNCTION 2: cast-vote
;; Stakers vote YES (true) or NO (false).
;; Voting power = staked STX balance at vote time.
;; Stake is locked in staking.clar until vote-end-block.
;; -------------------------------------------------------
(define-public (cast-vote (proposal-id uint) (vote bool))
    (let (
        (caller      tx-sender)
        (proposal    (unwrap! (map-get? proposals { proposal-id: proposal-id }) err-not-found))
        (stake-info  (contract-call? .staking get-stake-info caller))
        (staked-bal  (get stx-balance stake-info))
        (staked-at   (get stx-staked-at stake-info))
        (stake-age   (if (>= burn-block-height staked-at)
                        (- burn-block-height staked-at)
                        u0))
        (existing-vote (map-get? votes { proposal-id: proposal-id, voter: caller }))
    )
        (begin
            ;; Proposal must be active
            (asserts! (is-eq (get status proposal) STATUS-ACTIVE) err-not-active)
            ;; Vote window must still be open
            (asserts! (< burn-block-height (get vote-end-block proposal)) err-voting-open)
            ;; No double votes
            (asserts! (is-none existing-vote) err-already-voted)
            ;; Must have enough stake
            (asserts! (>= staked-bal (var-get min-stake)) err-below-min-stake)
            ;; Stake must be old enough
            (asserts! (>= stake-age (var-get min-stake-age)) err-stake-too-young)

            ;; Record vote
            (map-set votes { proposal-id: proposal-id, voter: caller }
                { vote: vote, power: staked-bal }
            )

            ;; Update tally
            (if vote
                (map-set proposals { proposal-id: proposal-id }
                    (merge proposal { yes-votes: (+ (get yes-votes proposal) staked-bal) })
                )
                (map-set proposals { proposal-id: proposal-id }
                    (merge proposal { no-votes: (+ (get no-votes proposal) staked-bal) })
                )
            )

            ;; Lock stake in staking.clar until vote-end-block
            (try! (as-contract (contract-call? .staking lock-stake caller (get vote-end-block proposal))))

            (ok true)
        )
    )
)

;; -------------------------------------------------------
;; FUNCTION 3: cancel-proposal
;; Proposer may cancel their own proposal while voting is still open.
;; -------------------------------------------------------
(define-public (cancel-proposal (proposal-id uint))
    (let (
        (caller   tx-sender)
        (proposal (unwrap! (map-get? proposals { proposal-id: proposal-id }) err-not-found))
    )
        (begin
            (asserts! (is-eq caller (get proposer proposal)) err-unauthorized)
            (asserts! (is-eq (get status proposal) STATUS-ACTIVE) err-not-active)
            (asserts! (< burn-block-height (get vote-end-block proposal)) err-voting-open)

            (map-set proposals { proposal-id: proposal-id }
                (merge proposal { status: STATUS-CANCELLED })
            )
            (dec-active-count caller)
            (ok true)
        )
    )
)

;; -------------------------------------------------------
;; FUNCTION 4: finalize-proposal
;; Keeper calls after vote-end-block to tally and mark approved/rejected.
;; -------------------------------------------------------
(define-public (finalize-proposal (proposal-id uint))
    (let (
        (proposal    (unwrap! (map-get? proposals { proposal-id: proposal-id }) err-not-found))
        (yes-votes   (get yes-votes proposal))
        (no-votes    (get no-votes proposal))
        (total-votes (+ yes-votes no-votes))
    )
        (begin
            (asserts! (is-admin) err-unauthorized)
            (asserts! (is-eq (get status proposal) STATUS-ACTIVE) err-not-active)
            ;; Voting window must have ended
            (asserts! (>= burn-block-height (get vote-end-block proposal)) err-voting-not-ended)

            (let (
                (new-status
                    (if (and
                            (>= total-votes (var-get quorum-threshold))
                            (> yes-votes no-votes)
                        )
                        STATUS-APPROVED
                        STATUS-REJECTED
                    )
                )
            )
                (map-set proposals { proposal-id: proposal-id }
                    (merge proposal { status: new-status })
                )
                (dec-active-count (get proposer proposal))
                (ok new-status)
            )
        )
    )
)

;; -------------------------------------------------------
;; FUNCTION 5: execute-proposal
;; Keeper executes an approved proposal by creating an event in prediction-market.
;; Fails if outside the execution window (proposal expires).
;; -------------------------------------------------------
(define-public (execute-proposal (proposal-id uint))
    (let (
        (proposal     (unwrap! (map-get? proposals { proposal-id: proposal-id }) err-not-found))
        (expiry-block (+ (get vote-end-block proposal) (var-get execution-window)))
    )
        (begin
            (asserts! (is-admin) err-unauthorized)
            (asserts! (is-eq (get status proposal) STATUS-APPROVED) err-not-approved)
            ;; Reject if execution window has passed (caller should call expire-proposal instead)
            (asserts! (<= burn-block-height expiry-block) err-expired)

            ;; Within the window - create the prediction-market event
            (let (
                (event-id (try! (contract-call? .prediction-market create-event
                    (get title proposal)
                    true                       ;; dao-approved = true
                    (get blocks-open proposal)
                    (get entry-fee proposal)
                    (get use-sbtc proposal)
                )))
            )
                (map-set proposals { proposal-id: proposal-id }
                    (merge proposal { status: STATUS-EXECUTED, event-id: event-id })
                )
                (ok event-id)
            )
        )
    )
)

;; -------------------------------------------------------
;; FUNCTION 6: expire-proposal
;; Anyone may call this after the execution window to explicitly mark an
;; approved proposal as expired. Separate from execute-proposal so that
;; Clarity's atomicity (state + ok/err) is respected cleanly.
;; -------------------------------------------------------
(define-public (expire-proposal (proposal-id uint))
    (let (
        (proposal     (unwrap! (map-get? proposals { proposal-id: proposal-id }) err-not-found))
        (expiry-block (+ (get vote-end-block proposal) (var-get execution-window)))
    )
        (begin
            (asserts! (is-eq (get status proposal) STATUS-APPROVED) err-not-approved)
            (asserts! (> burn-block-height expiry-block) err-voting-open) ;; not yet expired
            (map-set proposals { proposal-id: proposal-id }
                (merge proposal { status: STATUS-EXPIRED })
            )
            (ok true)
        )
    )
)

;; -------------------------------------------------------
;; READ-ONLY FUNCTIONS
;; -------------------------------------------------------

(define-read-only (get-proposal (proposal-id uint))
    (map-get? proposals { proposal-id: proposal-id })
)

(define-read-only (get-vote (proposal-id uint) (voter principal))
    (map-get? votes { proposal-id: proposal-id, voter: voter })
)

(define-read-only (get-vote-totals (proposal-id uint))
    (match (map-get? proposals { proposal-id: proposal-id })
        p {
            yes-votes:   (get yes-votes p),
            no-votes:    (get no-votes p),
            total-votes: (+ (get yes-votes p) (get no-votes p)),
            quorum-met:  (>= (+ (get yes-votes p) (get no-votes p)) (var-get quorum-threshold))
        }
        { yes-votes: u0, no-votes: u0, total-votes: u0, quorum-met: false }
    )
)

(define-read-only (get-active-count (user principal))
    (get count (default-to { count: u0 } (map-get? active-count { user: user })))
)

(define-read-only (get-config)
    {
        voting-duration:  (var-get voting-duration),
        min-stake:        (var-get min-stake),
        min-stake-age:    (var-get min-stake-age),
        quorum-threshold: (var-get quorum-threshold),
        execution-window: (var-get execution-window)
    }
)
