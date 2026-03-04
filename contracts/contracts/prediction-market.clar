;; title: prediction-market
;; description: Core engine for TrueCall prediction events and markets
;;
;; Structure:
;;   EVENT: top-level container with a close-block and up to 10 child markets.
;;   MARKET: a single binary YES/NO question resolved via Polymarket-style
;;           optimistic oracle. Keeper triggers resolution, oracle price is
;;           read DIRECTLY from the Pyth contract - no human submits a price.
;;
;; Resolution State Machine per market:
;;   "open" -> betting is live
;;   "pending" -> oracle price fetched, 2-hr dispute window running
;;   "disputed" -> a user filed a dispute, keeper re-triggers oracle lookup
;;   "final" -> market is settled, winners can claim

;; traits
(use-trait pyth-oracle-trait .pyth-oracle-trait.pyth-oracle-trait)
(define-constant contract-owner tx-sender)
(define-constant max-markets-per-event u10)
(define-constant dispute-window u12)          ;; ~2 hours (12 burn blocks at 10min each)

;; status strings
(define-constant status-open     "open")
(define-constant status-pending  "pending")
(define-constant status-disputed "disputed")
(define-constant status-final    "final")

;; error codes
(define-constant err-unauthorized              (err u200))
(define-constant err-event-not-found           (err u201))
(define-constant err-market-not-found          (err u202))
(define-constant err-event-closed              (err u203))
(define-constant err-event-not-closed          (err u204))
(define-constant err-market-already-resolved   (err u205))
(define-constant err-too-many-markets          (err u206))
(define-constant err-zero-stake                (err u207))
(define-constant err-already-predicted         (err u208))
(define-constant err-not-pending               (err u210))
(define-constant err-dispute-window-passed     (err u211))
(define-constant err-dispute-window-open       (err u212))
(define-constant err-no-position-to-dispute    (err u213))
(define-constant err-not-disputed              (err u214))

;; data vars
(define-data-var event-nonce uint u0)
(define-data-var market-nonce uint u0)

;; Keeper whitelist: admin can approve trusted oracle addresses to propose results
;; This allows Pyth automation bots or DAO-trusted addresses to post prices
(define-map approved-keepers { keeper: principal } { active: bool })

;; -------------------------------------------------------
;; DATA MAPS
;; -------------------------------------------------------

;; Parent event container
(define-map events
    { event-id: uint }
    {
        title: (string-ascii 64),
        creator: principal,
        dao-approved: bool,
        close-block: uint,
        market-count: uint,
        is-active: bool
    }
)

;; Child market with full resolution state
(define-map markets
    { market-id: uint }
    {
        event-id: uint,
        question: (string-ascii 128),
        target-price: uint,            ;; BTC price threshold in USD cents
        close-block: uint,             ;; burn block height at which betting closes
        status: (string-ascii 12),     ;; open | pending | disputed | final
        pending-outcome: (optional bool), ;; what the admin proposed
        proposal-block: uint,          ;; burn block when admin proposed (for dispute window)
        final-outcome: (optional bool) ;; settled result
    }
)

;; Index: which markets belong to each event
(define-map event-markets
    { event-id: uint, index: uint }
    { market-id: uint }
)

;; Positions: user predictions and stakes
(define-map positions
    { market-id: uint, predictor: principal }
    {
        prediction: bool,
        stx-amount: uint,
        sbtc-amount: uint,
        claimed: bool
    }
)

;; Pool totals per market side
(define-map market-pools
    { market-id: uint }
    {
        yes-stx: uint,
        no-stx: uint,
        yes-sbtc: uint,
        no-sbtc: uint
    }
)

;; -------------------------------------------------------
;; PRIVATE HELPERS
;; -------------------------------------------------------

(define-private (is-admin)
    (is-eq tx-sender contract-owner)
)

(define-private (is-keeper)
    (or
        (is-admin)
        (default-to false (get active (map-get? approved-keepers { keeper: tx-sender })))
    )
)

(define-private (status-is (market-id uint) (expected (string-ascii 12)))
    (match (map-get? markets { market-id: market-id })
        m (is-eq (get status m) expected)
        false
    )
)

;; --- KEEPER MANAGEMENT ---

;; Admin adds a trusted keeper who can propose/override results
(define-public (add-keeper (keeper principal))
    (begin
        (asserts! (is-admin) err-unauthorized)
        (map-set approved-keepers { keeper: keeper } { active: true })
        (ok true)
    )
)

;; Admin removes a keeper
(define-public (remove-keeper (keeper principal))
    (begin
        (asserts! (is-admin) err-unauthorized)
        (map-set approved-keepers { keeper: keeper } { active: false })
        (ok true)
    )
)

;; Read: check if an address is an active keeper
(define-read-only (is-approved-keeper (addr principal))
    (default-to false (get active (map-get? approved-keepers { keeper: addr })))
)

;; -------------------------------------------------------
;; FUNCTION 1: create-event
;; Admin creates a top-level prediction event.
;; @param title        Human-readable name
;; @param dao-approved Was this DAO-voted?
;; @param blocks-open  How many burn blocks until betting closes
;; -------------------------------------------------------
(define-public (create-event
    (title (string-ascii 64))
    (dao-approved bool)
    (blocks-open uint)
)
    (let (
        (caller tx-sender)
        (event-id (+ (var-get event-nonce) u1))
        (close-block (+ burn-block-height blocks-open))
    )
        (begin
            (asserts! (is-admin) err-unauthorized)
            (var-set event-nonce event-id)
            (map-set events { event-id: event-id }
                {
                    title: title,
                    creator: caller,
                    dao-approved: dao-approved,
                    close-block: close-block,
                    market-count: u0,
                    is-active: true
                }
            )
            (ok event-id)
        )
    )
)

;; -------------------------------------------------------
;; FUNCTION 2: add-market
;; Admin adds a binary YES/NO market to an open event.
;; Inherits the event's close-block.
;; @param event-id      Parent event
;; @param question      The prediction question
;; @param target-price  BTC price threshold in USD cents
;; -------------------------------------------------------
(define-public (add-market
    (event-id uint)
    (question (string-ascii 128))
    (target-price uint)
)
    (let (
        (event (unwrap! (map-get? events { event-id: event-id }) err-event-not-found))
        (market-id (+ (var-get market-nonce) u1))
        (current-count (get market-count event))
    )
        (begin
            (asserts! (is-admin) err-unauthorized)
            (asserts! (get is-active event) err-event-closed)
            (asserts! (< current-count max-markets-per-event) err-too-many-markets)
            (var-set market-nonce market-id)
            (map-set markets { market-id: market-id }
                {
                    event-id: event-id,
                    question: question,
                    target-price: target-price,
                    close-block: (get close-block event),
                    status: status-open,
                    pending-outcome: none,
                    proposal-block: u0,
                    final-outcome: none
                }
            )
            (map-set event-markets
                { event-id: event-id, index: current-count }
                { market-id: market-id }
            )
            (map-set events { event-id: event-id }
                (merge event { market-count: (+ current-count u1) })
            )
            (ok market-id)
        )
    )
)

;; -------------------------------------------------------
;; FUNCTION 3: predict
;; User bets YES or NO on a market by staking STX.
;; Only allowed while the market is "open" and before close-block.
;; @param market-id   Which market
;; @param prediction  true = YES, false = NO
;; @param stx-amount  Amount of STX to stake
;; -------------------------------------------------------
(define-public (predict
    (market-id uint)
    (prediction bool)
    (stx-amount uint)
)
    (let (
        (caller tx-sender)
        (contract-addr (as-contract tx-sender))
        (market (unwrap! (map-get? markets { market-id: market-id }) err-market-not-found))
        (pool (get-market-pool market-id))
        (existing-position (map-get? positions { market-id: market-id, predictor: caller }))
    )
        (begin
            (asserts! (> stx-amount u0) err-zero-stake)
            (asserts! (is-eq (get status market) status-open) err-market-already-resolved)
            (asserts! (< burn-block-height (get close-block market)) err-event-closed)
            (asserts! (is-none existing-position) err-already-predicted)
            (try! (stx-transfer? stx-amount caller contract-addr))
            (map-set positions
                { market-id: market-id, predictor: caller }
                { prediction: prediction, stx-amount: stx-amount, sbtc-amount: u0, claimed: false }
            )
            (if prediction
                (map-set market-pools { market-id: market-id }
                    (merge pool { yes-stx: (+ (get yes-stx pool) stx-amount) })
                )
                (map-set market-pools { market-id: market-id }
                    (merge pool { no-stx: (+ (get no-stx pool) stx-amount) })
                )
            )
            (ok true)
        )
    )
)

;; -------------------------------------------------------
;; FUNCTION 4: propose-result  (Phase 1 of resolution)
;; After close-block, keeper triggers resolution.
;; CONTRACT fetches BTC price directly from the oracle -- keeper submits NO price.
;; No human can lie about the price. Only oracle output determines outcome.
;; @param market-id    The market to resolve
;; @param oracle       The oracle contract implementing pyth-oracle-trait
;; -------------------------------------------------------
(define-public (propose-result
    (market-id uint)
    (oracle <pyth-oracle-trait>)
)
    (let (
        (market (unwrap! (map-get? markets { market-id: market-id }) err-market-not-found))
        (oracle-price (unwrap! (contract-call? oracle get-btc-price) (err u501)))
        (proposed-outcome (>= oracle-price (get target-price market)))
    )
        (begin
            (asserts! (is-keeper) err-unauthorized)
            (asserts! (is-eq (get status market) status-open) err-not-pending)
            (asserts! (>= burn-block-height (get close-block market)) err-event-not-closed)
            (map-set markets { market-id: market-id }
                (merge market {
                    status: status-pending,
                    pending-outcome: (some proposed-outcome),
                    proposal-block: burn-block-height
                })
            )
            (ok proposed-outcome)
        )
    )
)

;; -------------------------------------------------------
;; FUNCTION 5: dispute-result  (Phase 2 of resolution)
;; Within the 2-hour window (12 burn blocks), any user who has
;; a position on this market can dispute the proposed outcome.
;; @param market-id  The market being disputed
;; -------------------------------------------------------
(define-public (dispute-result (market-id uint))
    (let (
        (caller tx-sender)
        (market (unwrap! (map-get? markets { market-id: market-id }) err-market-not-found))
        (position (map-get? positions { market-id: market-id, predictor: caller }))
    )
        (begin
            (asserts! (is-eq (get status market) status-pending) err-not-pending)
            (asserts! (is-some position) err-no-position-to-dispute)
            (asserts!
                (< burn-block-height (+ (get proposal-block market) dispute-window))
                err-dispute-window-passed
            )
            (map-set markets { market-id: market-id }
                (merge market { status: status-disputed })
            )
            (ok true)
        )
    )
)

;; -------------------------------------------------------
;; FUNCTION 6: override-result  (Phase 2b - after dispute)
;; After a dispute, keeper re-triggers oracle lookup to settle the market.
;; No human price submitted - oracle contract provides the verified price.
;; @param market-id  The disputed market
;; @param oracle     The oracle contract implementing pyth-oracle-trait
;; -------------------------------------------------------
(define-public (override-result
    (market-id uint)
    (oracle <pyth-oracle-trait>)
)
    (let (
        (market (unwrap! (map-get? markets { market-id: market-id }) err-market-not-found))
        (oracle-price (unwrap! (contract-call? oracle get-btc-price) (err u501)))
        (corrected-outcome (>= oracle-price (get target-price market)))
    )
        (begin
            (asserts! (is-keeper) err-unauthorized)
            (asserts! (is-eq (get status market) status-disputed) err-not-disputed)
            (map-set markets { market-id: market-id }
                (merge market {
                    status: status-final,
                    final-outcome: (some corrected-outcome),
                    pending-outcome: none
                })
            )
            (ok corrected-outcome)
        )
    )
)

;; -------------------------------------------------------
;; FUNCTION 7: finalize-market  (Phase 3 - no dispute)
;; Anyone can call this after the 2-hour dispute window passes
;; with no dispute. Locks in the proposed result permanently.
;; @param market-id  The pending market to finalize
;; -------------------------------------------------------
(define-public (finalize-market (market-id uint))
    (let (
        (market (unwrap! (map-get? markets { market-id: market-id }) err-market-not-found))
    )
        (begin
            (asserts! (is-eq (get status market) status-pending) err-not-pending)
            (asserts!
                (>= burn-block-height (+ (get proposal-block market) dispute-window))
                err-dispute-window-open
            )
            (map-set markets { market-id: market-id }
                (merge market {
                    status: status-final,
                    final-outcome: (get pending-outcome market),
                    pending-outcome: none
                })
            )
            (ok true)
        )
    )
)

;; -------------------------------------------------------
;; READ ONLY FUNCTIONS
;; -------------------------------------------------------

(define-read-only (get-event (event-id uint))
    (map-get? events { event-id: event-id })
)

(define-read-only (get-market (market-id uint))
    (map-get? markets { market-id: market-id })
)

(define-read-only (get-market-pool (market-id uint))
    (default-to
        { yes-stx: u0, no-stx: u0, yes-sbtc: u0, no-sbtc: u0 }
        (map-get? market-pools { market-id: market-id })
    )
)

(define-read-only (get-position (market-id uint) (predictor principal))
    (map-get? positions { market-id: market-id, predictor: predictor })
)

(define-read-only (event-is-open (event-id uint))
    (match (map-get? events { event-id: event-id })
        event (and (get is-active event) (< burn-block-height (get close-block event)))
        false
    )
)

(define-read-only (get-dispute-deadline (market-id uint))
    (match (map-get? markets { market-id: market-id })
        market (+ (get proposal-block market) dispute-window)
        u0
    )
)
