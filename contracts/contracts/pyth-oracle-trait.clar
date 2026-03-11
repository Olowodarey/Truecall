;; title: pyth-oracle-trait
;; description: Pyth oracle v4 traits for prediction-market.clar integration.
;;
;; These traits mirror the actual interface of:
;;   STR738QQX1PVTM6WTDF833Z18T8R0ZB791TCNEFM.pyth-oracle-v4  (testnet)
;;   SP1CGXWEAMG6P6FT04W66NVGJ7PQWMDAC19R7PJ0Y.pyth-oracle-v4  (mainnet)
;;
;; Included here for simnet/mock usage. The production contract calls in
;; prediction-market.clar use literal hardcoded addresses (not trait dispatch)
;; as required by Clarity's static analysis rules.

;; Pyth storage trait — used by pyth-oracle-v4 internally
(define-trait pyth-storage-trait
  (
    ;; Store a verified price update
    (update-price-feeds
      (
        (list 64 {
          price-identifier: (buff 32),
          price:            int,
          conf:             uint,
          expo:             int,
          ema-price:        int,
          ema-conf:         uint,
          publish-time:     uint,
          prev-publish-time: uint
        })
      )
      (response bool uint)
    )
    ;; Read a stored price
    (read-price-feed
      ((buff 32))
      (response {
        price:            int,
        conf:             uint,
        expo:             int,
        ema-price:        int,
        ema-conf:         uint,
        publish-time:     uint,
        prev-publish-time: uint
      } uint)
    )
  )
)

;; Main Pyth oracle trait — exposed by pyth-oracle-v4
(define-trait pyth-oracle-trait
  (
    ;; Verify a Wormhole VAA, decode the PNAU payload, and persist fresh prices.
    ;; Charges 1 uSTX from tx-sender.
    (verify-and-update-price-feeds
      (
        (buff 8192)
        {
          pyth-storage-contract:  principal,
          pyth-decoder-contract:  principal,
          wormhole-core-contract: principal
        }
      )
      (response
        (list 64 {
          price-identifier:  (buff 32),
          price:             int,
          conf:              uint,
          expo:              int,
          ema-price:         int,
          ema-conf:          uint,
          publish-time:      uint,
          prev-publish-time: uint
        })
        uint
      )
    )
    ;; Read a previously stored price for a given feed id.
    (get-price
      ((buff 32) principal)
      (response {
        price:             int,
        conf:              uint,
        expo:              int,
        ema-price:         int,
        ema-conf:          uint,
        publish-time:      uint,
        prev-publish-time: uint
      } uint)
    )
  )
)
