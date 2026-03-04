;; title: mock-pyth
;; description: Mock Pyth oracle for local testing.
;; In production this is replaced by the real Pyth Stacks bridge contract.
;; Admin can set the BTC price to simulate different oracle outcomes in tests.

(impl-trait .pyth-oracle-trait.pyth-oracle-trait)

;; Current simulated BTC price in USD cents (default: $90,000)
(define-data-var btc-price uint u9000000)

;; Admin-only: set a new BTC price (simulates Pyth publishing a new price)
(define-public (set-btc-price (price uint))
    (begin
        (asserts! (is-eq tx-sender (var-get admin)) (err u500))
        (var-set btc-price price)
        (ok price)
    )
)

;; Oracle interface: return the current BTC price
(define-read-only (get-btc-price)
    (ok (var-get btc-price))
)

;; Deployer stored as admin
(define-data-var admin principal tx-sender)
