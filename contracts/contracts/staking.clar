;; title: staking
;; description: Staking Contract for TrueCall

;; traits
(use-trait sip-010-trait .sip-010-trait.sip-010-trait)

;; constants
(define-constant err-zero-amount (err u100))

;; data maps
(define-map stx-balances { user: principal } { balance: uint })
(define-map sbtc-balances { user: principal } { balance: uint })

;; public functions

;; @desc Deposit STX into the staking contract
;; @param amount The amount of STX to deposit
(define-public (deposit-stx (amount uint))
    (let (
        (caller tx-sender)
        (current-balance (get balance (default-to { balance: u0 } (map-get? stx-balances { user: caller }))))
    )
        (begin
            (asserts! (> amount u0) err-zero-amount)
            (try! (stx-transfer? amount caller (as-contract tx-sender)))
            (map-set stx-balances { user: caller } { balance: (+ current-balance amount) })
            (ok true)
        )
    )
)

;; read only functions
(define-read-only (get-stx-balance (user principal))
    (get balance (default-to { balance: u0 } (map-get? stx-balances { user: user })))
)
