;; title: prediction-market
;; description: TrueCall competition engine with live Pyth resolution on Stacks
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
;;
;; Pyth Oracle (Testnet - STR738QQX1PVTM6WTDF833Z18T8R0ZB791TCNEFM.*):
;; - finalize-question accepts price-feed-bytes (buff 8192) -- a signed VAA from Hermes
;; - target-price is a WHOLE-DOLLAR integer e.g. 80000 = $80,000
;; - The caller of finalize-question must allow a 1 uSTX Pyth update fee
;; - Get VAA: curl "https://hermes.pyth.network/api/latest_price_feeds?ids[]=e62df6...&binary=true"

;; -------------------------------------------------------
;; CONSTANTS
;; -------------------------------------------------------

(define-constant question-status-open   "open")
(define-constant question-status-final  "final")

(define-constant max-questions-per-event u50)
(define-constant min-participants        u5)

;; Official BTC/USD price feed id (same on testnet and mainnet)
(define-constant btc-feed-id 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43)

;; -------------------------------------------------------
;; PYTH TESTNET CONTRACT ADDRESSES
;; Source: https://github.com/stx-labs/stacks-pyth-bridge
;; -------------------------------------------------------

(define-constant pyth-oracle-v4   'STR738QQX1PVTM6WTDF833Z18T8R0ZB791TCNEFM.pyth-oracle-v4)
(define-constant pyth-storage-v4  'STR738QQX1PVTM6WTDF833Z18T8R0ZB791TCNEFM.pyth-storage-v4)
(define-constant pyth-decoder-v3  'STR738QQX1PVTM6WTDF833Z18T8R0ZB791TCNEFM.pyth-pnau-decoder-v3)
(define-constant wormhole-core-v4 'STR738QQX1PVTM6WTDF833Z18T8R0ZB791TCNEFM.wormhole-core-v4)

;; Payout percentages (must sum to 98)
(define-constant payout-rank1 u30)
(define-constant payout-rank2 u25)
(define-constant payout-rank3 u20)
(define-constant payout-rank4 u15)
(define-constant payout-rank5 u8)

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
(define-constant err-amount-too-large        (err u223))
(define-constant err-question-not-final      (err u224))
(define-constant err-not-all-finalized       (err u225))
(define-constant err-invalid-event-window    (err u226))
(define-constant err-not-refundable          (err u227))
(define-constant err-refund-already-claimed  (err u228))
(define-constant err-event-still-active      (err u230))
(define-constant err-invalid-expo            (err u231))
(define-constant err-invalid-price           (err u232))

;; -------------------------------------------------------
;; DATA VARS
;; -------------------------------------------------------

(define-data-var admin            principal tx-sender)
(define-data-var event-nonce      uint      u0)
(define-data-var question-nonce   uint      u0)
(define-data-var accumulated-fees uint      u0)

(define-map approved-keepers { keeper: principal } { active: bool })

;; -------------------------------------------------------
;; MAPS
;; -------------------------------------------------------

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
    participant_count:        uint,
    total-pool:               uint,
    is-active:                bool,
    fee-booked:               bool,
    refund-mode:              bool
  }
)

(define-map events-by-title
  { title: (string-ascii 64) }
  { event-id: uint }
)

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

(define-map event-questions
  { event-id: uint, index: uint }
  { question-id: uint }
)

(define-map participants
  { event-id: uint, user: principal }
  { joined: bool, refund-claimed: bool }
)

(define-map answers
  { question-id: uint, user: principal }
  { prediction: bool, points-claimed: bool }
)

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
          participant_count:        u0,
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
          participant_count: (+ (get participant_count event) u1),
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
;; FINALIZE QUESTION WITH LIVE PYTH ORACLE (TESTNET)
;;
;; 1. Keeper fetches a fresh VAA from Hermes off-chain and passes it as price-feed-bytes.
;; 2. verify-and-update-price-feeds validates Wormhole signatures, stores price.
;;    The Pyth contract charges 1 uSTX from tx-sender for this.
;; 3. get-price reads the freshly stored BTC/USD price.
;; 4. Price normalisation: Pyth returns e.g. price=10603557773590 expo=-8
;;    denomination = 10^8 = 100000000
;;    normalized   = 10603557773590 / 100000000 = 106035  (whole-dollar)
;; 5. outcome = (normalized-price >= target-price)
;; -------------------------------------------------------

(define-public (finalize-question
  (question-id uint)
  (price-feed-bytes (buff 8192))
)
  (let (
    (q (unwrap! (map-get? questions { question-id: question-id }) err-question-not-found))
    (event (unwrap! (map-get? events { event-id: (get event-id q) }) err-event-not-found))

    ;; Step 1 -- submit VAA, validate and store fresh price
    (update-status
      (try!
        (contract-call?
          'STR738QQX1PVTM6WTDF833Z18T8R0ZB791TCNEFM.pyth-oracle-v4
          verify-and-update-price-feeds
          price-feed-bytes
          {
            pyth-storage-contract:  pyth-storage-v4,
            pyth-decoder-contract:  pyth-decoder-v3,
            wormhole-core-contract: wormhole-core-v4
          }
        )
      )
    )

    ;; Step 2 -- read the freshly stored BTC/USD price
    (price-data
      (try!
        (contract-call?
          'STR738QQX1PVTM6WTDF833Z18T8R0ZB791TCNEFM.pyth-oracle-v4
          get-price
          btc-feed-id
          'STR738QQX1PVTM6WTDF833Z18T8R0ZB791TCNEFM.pyth-storage-v4
        )
      )
    )

    (price-int (get price price-data))
    (expo      (get expo  price-data))

    ;; Step 3 -- normalise fixed-point to whole-dollar integer
    ;; expo is negative (e.g. -8); (* expo -1) gives the positive exponent value
    (expo-abs         (to-uint (* expo -1)))
    (denomination     (pow u10 expo-abs))
    (normalized-price (/ (to-uint price-int) denomination))

    (outcome (>= normalized-price (get target-price q)))
  )
    (begin
      (asserts! (is-keeper) err-unauthorized)
      (asserts! (is-eq (get status q) question-status-open) err-question-closed)
      (asserts! (>= burn-block-height (get close-block q)) err-question-closed)
      (asserts! (> price-int 0) err-invalid-price)
      (asserts! (< expo 0)     err-invalid-expo)

      (map-set questions { question-id: question-id }
        (merge q {
          status:        question-status-final,
          oracle-price:  normalized-price,
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
;; POINTS
;; -------------------------------------------------------

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
      (map-set answers
        { question-id: question-id, user: caller }
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
;; EVENT CLOSING
;; -------------------------------------------------------

(define-public (close-event (event-id uint))
  (let (
    (event (unwrap! (map-get? events { event-id: event-id }) err-event-not-found))
    (enough-participants (>= (get participant_count event) min-participants))
    (protocol-fee (/ (* (get total-pool event) u2) u100))
  )
    (begin
      (asserts! (is-keeper) err-unauthorized)
      (asserts! (get is-active event) err-event-closed)
      (asserts! (>= burn-block-height (get end-block event)) err-event-not-ended)
      (asserts! (is-eq (get question-count event) (get finalized-question-count event)) err-not-all-finalized)
      (asserts! (not (get fee-booked event)) err-fee-already-booked)
      (if enough-participants
        (begin
          (map-set events { event-id: event-id }
            (merge event { is-active: false, fee-booked: true, refund-mode: false })
          )
          (var-set accumulated-fees (+ (var-get accumulated-fees) protocol-fee))
          (ok false)
        )
        (begin
          (map-set events { event-id: event-id }
            (merge event { is-active: false, fee-booked: true, refund-mode: true })
          )
          (ok true)
        )
      )
    )
  )
)

;; -------------------------------------------------------
;; REFUND
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
      (try! (as-contract (stx-transfer? payout-amount tx-sender caller)))
      (ok payout-amount)
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
    admin:             (var-get admin),
    pyth-oracle-v4:    pyth-oracle-v4,
    pyth-storage-v4:   pyth-storage-v4,
    pyth-decoder-v3:   pyth-decoder-v3,
    wormhole-core-v4:  wormhole-core-v4,
    btc-feed-id:       btc-feed-id,
    max-questions:     max-questions-per-event,
    min-participants:  min-participants,
    accumulated-fees:  (var-get accumulated-fees)
  }
)