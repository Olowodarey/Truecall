;; title: prediction-market
;; description: Core engine for TrueCall prediction events and markets
;;
;; Structure:
;;   EVENT: top-level container with a close-block and up to 10 child markets.
;;   MARKET: a single binary YES/NO question that resolves via price oracle.
;;
;; Access Model:
;;   Admin creates events (may mark dao-approved=true for DAO-voted questions).
;;   Resolution triggered by admin after close-block is reached.

;; traits
(use-trait sip-010-trait .sip-010-trait.sip-010-trait)

;; constants
(define-constant contract-owner tx-sender)
(define-constant max-markets-per-event u10)

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
(define-constant err-invalid-outcome           (err u209))

;; data vars
(define-data-var event-nonce uint u0)
(define-data-var market-nonce uint u0)

;; --- DATA MAPS ---

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

;; Child market (belongs to an event)
(define-map markets
    { market-id: uint }
    {
        event-id: uint,
        question: (string-ascii 128),
        target-price: uint,
        close-block: uint,
        resolved: bool,
        outcome: (optional bool)
    }
)

;; Index: which markets belong to each event
(define-map event-markets
    { event-id: uint, index: uint }
    { market-id: uint }
)

;; Positions: who bet what on which market
(define-map positions
    { market-id: uint, predictor: principal }
    {
        prediction: bool,
        stx-amount: uint,
        sbtc-amount: uint
    }
)

;; Pool totals per market
(define-map market-pools
    { market-id: uint }
    {
        yes-stx: uint,
        no-stx: uint,
        yes-sbtc: uint,
        no-sbtc: uint
    }
)

;; --- PRIVATE HELPERS ---

(define-private (is-admin)
    (is-eq tx-sender contract-owner)
)

;; --- FUNCTION 1: create-event ---
;; Admin (or DAO-approved flow) creates a prediction event.
;; @param title       Name of the event (max 64 chars)
;; @param dao-approved  Was this question greenlit by DAO vote?
;; @param blocks-open   How many blocks until betting closes
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

;; --- READ ONLY ---

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

;; --- FUNCTION 2: add-market ---
;; Admin adds a binary market (YES/NO question) to an existing event.
;; A market inherits the event's close-block.
;; @param event-id       Parent event
;; @param question       The question text (max 128 chars)
;; @param target-price   The BTC price threshold in USD cents (e.g. 10000000 = $100,000)
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
            ;; Store the market
            (map-set markets { market-id: market-id }
                {
                    event-id: event-id,
                    question: question,
                    target-price: target-price,
                    close-block: (get close-block event),
                    resolved: false,
                    outcome: none
                }
            )
            ;; Index: event -> market slot
            (map-set event-markets
                { event-id: event-id, index: current-count }
                { market-id: market-id }
            )
            ;; Increment market count on event
            (map-set events { event-id: event-id }
                (merge event { market-count: (+ current-count u1) })
            )
            (ok market-id)
        )
    )
)

;; --- FUNCTION 3: predict ---
;; User submits a YES or NO prediction on a market and stakes STX.
;; @param market-id   Which market to predict on
;; @param prediction  true = YES, false = NO
;; @param stx-amount  Amount of STX to stake (must be > 0)
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
            (asserts! (not (get resolved market)) err-market-already-resolved)
            (asserts! (< burn-block-height (get close-block market)) err-event-closed)
            (asserts! (is-none existing-position) err-already-predicted)
            ;; Transfer STX from user to contract
            (try! (stx-transfer? stx-amount caller contract-addr))
            ;; Record the user's position
            (map-set positions
                { market-id: market-id, predictor: caller }
                { prediction: prediction, stx-amount: stx-amount, sbtc-amount: u0 }
            )
            ;; Update pool totals
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
