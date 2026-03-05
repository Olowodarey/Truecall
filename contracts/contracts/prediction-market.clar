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
(use-trait sip-010-trait .sip-010-trait.sip-010-trait)
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
(define-constant err-no-position               (err u217)) ;; missing position in non-dispute contexts
(define-constant err-not-all-finalized         (err u220)) ;; claim-winnings before all markets finalized
(define-constant err-invalid-token             (err u223)) ;; wrong sBTC token passed

;; data vars
(define-data-var event-nonce uint u0)
(define-data-var market-nonce uint u0)

;; Store the authorized oracle address (defaulting to the mock oracle for testing)
(define-data-var approved-oracle principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mock-pyth)

;; Protocol fee treasury balances (separate per token)
(define-data-var accumulated-fees uint u0)         ;; STX fees
(define-data-var accumulated-sbtc-fees uint u0)    ;; sBTC fees

;; Approved sBTC token contract (only this can be used in sBTC events)
(define-data-var approved-sbtc principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mock-sbtc)

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
        entry-fee: uint,
        use-sbtc: bool,               ;; true = sBTC event, false = STX event
        market-count: uint,
        finalized-market-count: uint,
        is-active: bool,
        total-pool: uint              ;; unified pool (either STX or sBTC, per use-sbtc)
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
        oracle-price: uint,            ;; price fetched at propose-result time (stored for dispute reference)
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

;; Positions: user predictions and stakes (single token amount per event)
(define-map positions
    { market-id: uint, predictor: principal }
    {
        prediction: bool,
        amount: uint,    ;; STX or sBTC depending on event.use-sbtc
        claimed: bool
    }
)

;; Track who claimed winnings for each event
(define-map event-claims
    { event-id: uint, user: principal }
    bool
)

;; -------------------------------------------------------
;; PRIVATE HELPERS & INTERNAL READS
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

;; Admin updates the authorized oracle contract
(define-public (set-approved-oracle (new-oracle principal))
    (begin
        (asserts! (is-admin) err-unauthorized)
        (var-set approved-oracle new-oracle)
        (ok true)
    )
)

;; Admin updates the authorized sBTC token contract
(define-public (set-approved-sbtc (new-sbtc principal))
    (begin
        (asserts! (is-admin) err-unauthorized)
        (var-set approved-sbtc new-sbtc)
        (ok true)
    )
)

;; Admin withdraws accumulated STX protocol fees
(define-public (withdraw-fees (amount uint))
    (let (
        (caller tx-sender)
        (current-fees (var-get accumulated-fees))
    )
        (begin
            (asserts! (is-admin) err-unauthorized)
            (asserts! (<= amount current-fees) (err u419))
            (var-set accumulated-fees (- current-fees amount))
            (as-contract (stx-transfer? amount tx-sender caller))
        )
    )
)

;; Admin withdraws accumulated sBTC protocol fees
(define-public (withdraw-sbtc-fees (amount uint) (sbtc-token <sip-010-trait>))
    (let (
        (caller tx-sender)
        (current-fees (var-get accumulated-sbtc-fees))
    )
        (begin
            (asserts! (is-admin) err-unauthorized)
            (asserts! (is-eq (contract-of sbtc-token) (var-get approved-sbtc)) err-invalid-token)
            (asserts! (<= amount current-fees) (err u419))
            (var-set accumulated-sbtc-fees (- current-fees amount))
            (as-contract (contract-call? sbtc-token transfer amount tx-sender caller none))
        )
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
;; @param entry-fee    Fixed entry cost per prediction (in STX or sBTC microunits)
;; @param use-sbtc     true = sBTC event, false = STX event
;; -------------------------------------------------------
(define-public (create-event
    (title (string-ascii 64))
    (dao-approved bool)
    (blocks-open uint)
    (entry-fee uint)
    (use-sbtc bool)
)
    (let (
        (caller tx-sender)
        (event-id (+ (var-get event-nonce) u1))
        (close-block (+ burn-block-height blocks-open))
    )
        (begin
            (asserts! (is-admin) err-unauthorized)
            ;; Validate entry-fee at creation time, not on every predict
            (asserts! (> entry-fee u0) err-zero-stake)
            (var-set event-nonce event-id)
            (map-set events { event-id: event-id }
                {
                    title: title,
                    creator: caller,
                    dao-approved: dao-approved,
                    close-block: close-block,
                    entry-fee: entry-fee,
                    use-sbtc: use-sbtc,
                    market-count: u0,
                    finalized-market-count: u0,
                    is-active: true,
                    total-pool: u0
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
                    oracle-price: u0,
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
;; FUNCTION 2b: close-event
;; Admin or keeper marks an event as closed so winnings can be claimed.
;; @param event-id  The event to close
;; -------------------------------------------------------
(define-public (close-event (event-id uint))
    (let (
        (event (unwrap! (map-get? events { event-id: event-id }) err-event-not-found))
        (total-pool (get total-pool event))
        (protocol-fee (/ (* total-pool u2) u100))
    )
        (begin
            (asserts! (is-keeper) err-unauthorized)
            (asserts! (get is-active event) (err u218)) ;; err-already-closed
            ;; Betting window must have ended
            (asserts! (>= burn-block-height (get close-block event)) err-event-not-closed)
            ;; All child markets must be finalized before the event can be closed
            (asserts! (is-eq (get finalized-market-count event) (get market-count event)) err-not-all-finalized)
            (map-set events { event-id: event-id }
                (merge event { is-active: false })
            )
            ;; Book the 2% protocol fee to the correct treasury
            (if (get use-sbtc event)
                (var-set accumulated-sbtc-fees (+ (var-get accumulated-sbtc-fees) protocol-fee))
                (var-set accumulated-fees (+ (var-get accumulated-fees) protocol-fee))
            )
            (ok true)
        )
    )
)

;; -------------------------------------------------------
;; FUNCTION 3a: predict-stx
;; User enters a STX-denominated market. Fails if event uses sBTC.
;; @param market-id   Which market
;; @param prediction  true = YES, false = NO
;; -------------------------------------------------------
(define-public (predict-stx
    (market-id uint)
    (prediction bool)
)
    (let (
        (caller tx-sender)
        (contract-addr (as-contract tx-sender))
        (market (unwrap! (map-get? markets { market-id: market-id }) err-market-not-found))
        (event-id (get event-id market))
        (event (unwrap! (map-get? events { event-id: event-id }) err-event-not-found))
        (entry-fee (get entry-fee event))
        (existing-position (map-get? positions { market-id: market-id, predictor: caller }))
    )
        (begin
            (asserts! (not (get use-sbtc event)) err-market-already-resolved) ;; STX-only event
            (asserts! (is-eq (get status market) status-open) err-market-already-resolved)
            (asserts! (< burn-block-height (get close-block market)) err-event-closed)
            (asserts! (is-none existing-position) err-already-predicted)
            (try! (stx-transfer? entry-fee caller contract-addr))
            (map-set positions
                { market-id: market-id, predictor: caller }
                { prediction: prediction, amount: entry-fee, claimed: false }
            )
            (map-set events { event-id: event-id }
                (merge event { total-pool: (+ (get total-pool event) entry-fee) })
            )
            (ok true)
        )
    )
)

;; -------------------------------------------------------
;; FUNCTION 3b: predict-sbtc
;; User enters an sBTC-denominated market. Validates approved-sbtc. Fails if event uses STX.
;; @param market-id   Which market
;; @param prediction  true = YES, false = NO
;; @param sbtc-token  Must match approved-sbtc
;; -------------------------------------------------------
(define-public (predict-sbtc
    (market-id uint)
    (prediction bool)
    (sbtc-token <sip-010-trait>)
)
    (let (
        (caller tx-sender)
        (contract-addr (as-contract tx-sender))
        (market (unwrap! (map-get? markets { market-id: market-id }) err-market-not-found))
        (event-id (get event-id market))
        (event (unwrap! (map-get? events { event-id: event-id }) err-event-not-found))
        (entry-fee (get entry-fee event))
        (existing-position (map-get? positions { market-id: market-id, predictor: caller }))
    )
        (begin
            (asserts! (get use-sbtc event) err-market-already-resolved) ;; sBTC-only event
            (asserts! (is-eq (contract-of sbtc-token) (var-get approved-sbtc)) err-invalid-token)
            (asserts! (is-eq (get status market) status-open) err-market-already-resolved)
            (asserts! (< burn-block-height (get close-block market)) err-event-closed)
            (asserts! (is-none existing-position) err-already-predicted)
            (try! (contract-call? sbtc-token transfer entry-fee caller contract-addr none))
            (map-set positions
                { market-id: market-id, predictor: caller }
                { prediction: prediction, amount: entry-fee, claimed: false }
            )
            (map-set events { event-id: event-id }
                (merge event { total-pool: (+ (get total-pool event) entry-fee) })
            )
            (ok true)
        )
    )
)

;; -------------------------------------------------------
;; FUNCTION 4: propose-result  (Phase 1 of resolution)
;; After close-block, keeper triggers resolution.
;; CONTRACT fetches BTC price directly from the oracle -- keeper submits NO price.
;; Oracle price is stored in the market map for later use by override-result.
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
            (asserts! (is-eq (contract-of oracle) (var-get approved-oracle)) (err u502)) ;; err-invalid-oracle
            (asserts! (is-eq (get status market) status-open) err-not-pending)
            (asserts! (>= burn-block-height (get close-block market)) err-event-not-closed)
            ;; Store oracle-price in market for safe later use by override-result
            (map-set markets { market-id: market-id }
                (merge market {
                    status: status-pending,
                    oracle-price: oracle-price,
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
;; After a dispute, the keeper resolves using the oracle-price already stored
;; by propose-result. This prevents any human from submitting an arbitrary price.
;; @param market-id  The disputed market
;; -------------------------------------------------------
(define-public (override-result (market-id uint))
    (let (
        (market (unwrap! (map-get? markets { market-id: market-id }) err-market-not-found))
        (event (unwrap! (map-get? events { event-id: (get event-id market) }) err-event-not-found))
        ;; Use stored oracle price -- the same one fetched at propose-result time
        (stored-price (get oracle-price market))
        (corrected-outcome (>= stored-price (get target-price market)))
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
            ;; Increment event's finalized-market-count
            (map-set events { event-id: (get event-id market) }
                (merge event { finalized-market-count: (+ (get finalized-market-count event) u1) })
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
        (event (unwrap! (map-get? events { event-id: (get event-id market) }) err-event-not-found))
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
            ;; Increment event's finalized-market-count
            (map-set events { event-id: (get event-id market) }
                (merge event { finalized-market-count: (+ (get finalized-market-count event) u1) })
            )
            (ok true)
        )
    )
)

;; -------------------------------------------------------
;; FUNCTION 8: claim-points  (Gamification)
;; Users who predicted correctly call this to earn 10 points
;; towards the event's Top 5 Leaderboard.
;; @param market-id  The finalized market
;; -------------------------------------------------------
(define-public (claim-points (market-id uint))
    (let (
        (caller tx-sender)
        (market (unwrap! (map-get? markets { market-id: market-id }) err-market-not-found))
        (position (unwrap! (map-get? positions { market-id: market-id, predictor: caller }) err-no-position))
        (final-outcome (unwrap! (get final-outcome market) err-not-pending))
    )
        (begin
            (asserts! (is-eq (get status market) status-final) err-not-pending)
            (asserts! (not (get claimed position)) (err u215)) ;; err-already-claimed
            (asserts! (is-eq (get prediction position) final-outcome) (err u216)) ;; err-wrong-prediction
            
            ;; Mark claimed
            (map-set positions
                { market-id: market-id, predictor: caller }
                (merge position { claimed: true })
            )
            
            ;; Award 10 points on the leaderboard
            (contract-call? .reputation-points add-points (get event-id market) caller u10)
        )
    )
)



;; -------------------------------------------------------
;; FUNCTION 9a: claim-winnings-stx
;; Top 5 users claim their STX share. Fails if event is sBTC-denominated.
;; @param event-id  The finalized STX event
;; -------------------------------------------------------
(define-public (claim-winnings-stx (event-id uint))
    (let (
        (caller tx-sender)
        (event (unwrap! (map-get? events { event-id: event-id }) err-event-not-found))
        (leaderboard (contract-call? .reputation-points get-top-5 event-id))
        (r1 (get rank1 leaderboard))
        (r2 (get rank2 leaderboard))
        (r3 (get rank3 leaderboard))
        (r4 (get rank4 leaderboard))
        (r5 (get rank5 leaderboard))
    )
    (let (
        (is-r1 (match r1 e1 (is-eq (get user e1) caller) false))
        (is-r2 (match r2 e2 (is-eq (get user e2) caller) false))
        (is-r3 (match r3 e3 (is-eq (get user e3) caller) false))
        (is-r4 (match r4 e4 (is-eq (get user e4) caller) false))
        (is-r5 (match r5 e5 (is-eq (get user e5) caller) false))
        (multiplier (if is-r1 u30
                        (if is-r2 u25
                            (if is-r3 u20
                                (if is-r4 u15
                                    (if is-r5 u10 u0))))))
        (has-claimed (default-to false (map-get? event-claims { event-id: event-id, user: caller })))
        (prize-pool (/ (* (get total-pool event) u98) u100))
        (payout-amount (/ (* prize-pool multiplier) u100))
    )
        (begin
            (asserts! (not (get use-sbtc event)) err-invalid-token)     ;; STX-only
            (asserts! (not (get is-active event)) (err u415))           ;; event closed
            (asserts! (is-eq (get finalized-market-count event) (get market-count event)) err-not-all-finalized)
            (asserts! (> multiplier u0) (err u416))
            (asserts! (not has-claimed) (err u417))
            (asserts! (> payout-amount u0) (err u418))
            (map-set event-claims { event-id: event-id, user: caller } true)
            (as-contract (stx-transfer? payout-amount tx-sender caller))
        )
    ))
)

;; -------------------------------------------------------
;; FUNCTION 9b: claim-winnings-sbtc
;; Top 5 users claim their sBTC share. Validates approved-sbtc. Fails if event is STX-denominated.
;; @param event-id    The finalized sBTC event
;; @param sbtc-token  Must match approved-sbtc
;; -------------------------------------------------------
(define-public (claim-winnings-sbtc (event-id uint) (sbtc-token <sip-010-trait>))
    (let (
        (caller tx-sender)
        (event (unwrap! (map-get? events { event-id: event-id }) err-event-not-found))
        (leaderboard (contract-call? .reputation-points get-top-5 event-id))
        (r1 (get rank1 leaderboard))
        (r2 (get rank2 leaderboard))
        (r3 (get rank3 leaderboard))
        (r4 (get rank4 leaderboard))
        (r5 (get rank5 leaderboard))
    )
    (let (
        (is-r1 (match r1 e1 (is-eq (get user e1) caller) false))
        (is-r2 (match r2 e2 (is-eq (get user e2) caller) false))
        (is-r3 (match r3 e3 (is-eq (get user e3) caller) false))
        (is-r4 (match r4 e4 (is-eq (get user e4) caller) false))
        (is-r5 (match r5 e5 (is-eq (get user e5) caller) false))
        (multiplier (if is-r1 u30
                        (if is-r2 u25
                            (if is-r3 u20
                                (if is-r4 u15
                                    (if is-r5 u10 u0))))))
        (has-claimed (default-to false (map-get? event-claims { event-id: event-id, user: caller })))
        (prize-pool (/ (* (get total-pool event) u98) u100))
        (payout-amount (/ (* prize-pool multiplier) u100))
    )
        (begin
            (asserts! (get use-sbtc event) err-invalid-token)                               ;; sBTC-only
            (asserts! (is-eq (contract-of sbtc-token) (var-get approved-sbtc)) err-invalid-token) ;; validated token
            (asserts! (not (get is-active event)) (err u415))
            (asserts! (is-eq (get finalized-market-count event) (get market-count event)) err-not-all-finalized)
            (asserts! (> multiplier u0) (err u416))
            (asserts! (not has-claimed) (err u417))
            (asserts! (> payout-amount u0) (err u418))
            (map-set event-claims { event-id: event-id, user: caller } true)
            (as-contract (contract-call? sbtc-token transfer payout-amount tx-sender caller none))
        )
    ))
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

(define-read-only (get-event-leaderboard (event-id uint))
    (contract-call? .reputation-points get-top-5 event-id)
)
