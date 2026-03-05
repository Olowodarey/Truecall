;; title: staking
;; description: Staking Contract for TrueCall

;; traits
(use-trait sip-010-trait .sip-010-trait.sip-010-trait)

;; constants
(define-constant err-zero-amount (err u100))
(define-constant err-insufficient-balance (err u101))
(define-constant err-stake-locked (err u102))
(define-constant err-unauthorized (err u103))

;; Only the governance contract may call lock-stake.
;; Stored as a data var so it can be set once after deployment.
(define-data-var governance-contract principal tx-sender)

(define-public (set-governance-contract (addr principal))
    (begin
        (asserts! (is-eq tx-sender (var-get governance-contract)) err-unauthorized)
        (var-set governance-contract addr)
        (ok true)
    )
)

;; data maps
(define-map stx-balances
    { user: principal }
    { balance: uint, staked-at: uint }
)
(define-map sbtc-balances
    { user: principal }
    { balance: uint, staked-at: uint }
)
;; Tracks the latest block until which a user's stake is locked (due to open votes)
(define-map locked-until { user: principal } { until: uint })

;; public functions

;; @desc Deposit STX into the staking contract
;; @param amount The amount of STX to deposit
(define-public (deposit-stx (amount uint))
    (let (
        (caller tx-sender)
        (existing (default-to { balance: u0, staked-at: burn-block-height }
                               (map-get? stx-balances { user: caller })))
        (current-balance (get balance existing))
        (staked-at (if (is-eq current-balance u0) burn-block-height (get staked-at existing)))
    )
        (begin
            (asserts! (> amount u0) err-zero-amount)
            (try! (stx-transfer? amount caller (as-contract tx-sender)))
            (map-set stx-balances { user: caller }
                { balance: (+ current-balance amount), staked-at: staked-at })
            (ok true)
        )
    )
)

;; @desc Withdraw STX from the staking contract
;; @param amount The amount of STX to withdraw
(define-public (withdraw-stx (amount uint))
    (let (
        (caller tx-sender)
        (existing (default-to { balance: u0, staked-at: burn-block-height }
                               (map-get? stx-balances { user: caller })))
        (current-balance (get balance existing))
        (lock-until (get until (default-to { until: u0 } (map-get? locked-until { user: caller }))))
    )
        (begin
            (asserts! (> amount u0) err-zero-amount)
            (asserts! (>= current-balance amount) err-insufficient-balance)
            ;; Cannot withdraw while stake is locked by an open vote
            (asserts! (>= burn-block-height lock-until) err-stake-locked)
            (try! (as-contract (stx-transfer? amount tx-sender caller)))
            (map-set stx-balances { user: caller }
                (merge existing { balance: (- current-balance amount) }))
            (ok true)
        )
    )
)

;; @desc Deposit sBTC into the staking contract
;; @param amount The amount of sBTC to deposit
;; @param token The sip-010 token contract
(define-public (deposit-sbtc (amount uint) (token <sip-010-trait>))
    (let (
        (caller tx-sender)
        (existing (default-to { balance: u0, staked-at: burn-block-height }
                               (map-get? sbtc-balances { user: caller })))
        (current-balance (get balance existing))
        (staked-at (if (is-eq current-balance u0) burn-block-height (get staked-at existing)))
    )
        (begin
            (asserts! (> amount u0) err-zero-amount)
            (try! (contract-call? token transfer amount caller (as-contract tx-sender) none))
            (map-set sbtc-balances { user: caller }
                { balance: (+ current-balance amount), staked-at: staked-at })
            (ok true)
        )
    )
)

;; @desc Withdraw sBTC from the staking contract
;; @param amount The amount of sBTC to withdraw
;; @param token The sip-010 token contract
(define-public (withdraw-sbtc (amount uint) (token <sip-010-trait>))
    (let (
        (caller tx-sender)
        (existing (default-to { balance: u0, staked-at: burn-block-height }
                               (map-get? sbtc-balances { user: caller })))
        (current-balance (get balance existing))
        (lock-until (get until (default-to { until: u0 } (map-get? locked-until { user: caller }))))
    )
        (begin
            (asserts! (> amount u0) err-zero-amount)
            (asserts! (>= current-balance amount) err-insufficient-balance)
            (asserts! (>= burn-block-height lock-until) err-stake-locked)
            (try! (as-contract (contract-call? token transfer amount tx-sender caller none)))
            (map-set sbtc-balances { user: caller }
                (merge existing { balance: (- current-balance amount) }))
            (ok true)
        )
    )
)

;; @desc Called by governance to lock a staker's withdrawal until a vote ends.
;; @param user       The voter whose stake must remain locked
;; @param until      The burn block after which the stake is free again
(define-public (lock-stake (user principal) (until uint))
    (begin
        (asserts! (is-eq tx-sender (var-get governance-contract)) err-unauthorized)
        ;; Only extend the lock, never shorten it
        (let ((current-lock (get until (default-to { until: u0 } (map-get? locked-until { user: user })))))
            (if (> until current-lock)
                (map-set locked-until { user: user } { until: until })
                false
            )
        )
        (ok true)
    )
)

;; read only functions
(define-read-only (get-stx-balance (user principal))
    (get balance (default-to { balance: u0, staked-at: u0 } (map-get? stx-balances { user: user })))
)

(define-read-only (get-sbtc-balance (user principal))
    (get balance (default-to { balance: u0, staked-at: u0 } (map-get? sbtc-balances { user: user })))
)

;; Returns full stake info: balance, block when staking began, and locked-until block.
(define-read-only (get-stake-info (user principal))
    {
        stx-balance: (get balance (default-to { balance: u0, staked-at: u0 } (map-get? stx-balances { user: user }))),
        stx-staked-at: (get staked-at (default-to { balance: u0, staked-at: u0 } (map-get? stx-balances { user: user }))),
        locked-until: (get until (default-to { until: u0 } (map-get? locked-until { user: user })))
    }
)
