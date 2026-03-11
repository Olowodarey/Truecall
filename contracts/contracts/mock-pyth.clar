;; title: mock-pyth
;; description: Simnet mock for pyth-oracle-v4.
;;
;; Implements the same two functions that prediction-market.clar calls on the
;; real STR738QQX1PVTM6WTDF833Z18T8R0ZB791TCNEFM.pyth-oracle-v4 contract,
;; so that clarinet check / simnet tests can resolve the calls.
;;
;; In production this contract is NOT used - the contract calls the live
;; STR738... Pyth testnet contracts directly via hardcoded literals.

;; Mutable price store - tests set this via set-mock-price before calling
;; finalize-question.
(define-data-var mock-price        int  i10000000000000) ;; default ~$100,000 (expo -8)
(define-data-var mock-expo         int  i-8)
(define-data-var mock-publish-time uint u0)

;; -- Admin helper for tests ----------------------------------------------------

(define-public (set-mock-price (price int) (expo int))
  (begin
    (var-set mock-price price)
    (var-set mock-expo  expo)
    (var-set mock-publish-time burn-block-height)
    (ok true)
  )
)

;; -- pyth-oracle-v4 interface --------------------------------------------------

;; verify-and-update-price-feeds
;; Accepts the VAA buffer and dependency contracts (ignored in mock).
;; Returns a list with a single mock price update so the (try! ...) in the
;; main contract succeeds.
(define-public (verify-and-update-price-feeds
  (price-feed-bytes (buff 8192))
  (contracts {
    pyth-storage-contract:  principal,
    pyth-decoder-contract:  principal,
    wormhole-core-contract: principal
  })
)
  (ok
    (list
      {
        price-identifier:  0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43,
        price:             (var-get mock-price),
        conf:              u100000,
        expo:              (var-get mock-expo),
        ema-price:         (var-get mock-price),
        ema-conf:          u100000,
        publish-time:      (var-get mock-publish-time),
        prev-publish-time: u0
      }
    )
  )
)

;; get-price
;; Returns the mock BTC/USD price (ignores price-feed-id and storage principal).
(define-public (get-price
  (price-feed-id (buff 32))
  (pyth-storage-address principal)
)
  (ok {
    price:             (var-get mock-price),
    conf:              u100000,
    expo:              (var-get mock-expo),
    ema-price:         (var-get mock-price),
    ema-conf:          u100000,
    publish-time:      (var-get mock-publish-time),
    prev-publish-time: u0
  })
)
