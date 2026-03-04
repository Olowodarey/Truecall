;; title: pyth-oracle-trait
;; description: Trait for on-chain BTC/USD price feeds.
;; Any oracle contract (Pyth, mock) must implement this interface.
;; prediction-market.clar calls this to fetch the verified BTC price.
;; No human submits a price, removing trust from resolution.

(define-trait pyth-oracle-trait
    (
        ;; Returns the current verified BTC/USD price in USD cents
        ;; e.g. 9500000 = $95,000
        (get-btc-price () (response uint uint))
    )
)
