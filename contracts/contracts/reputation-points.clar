;; title: reputation-points
;; description: Gamification engine for TrueCall. Tracks points per user
;; per event, and dynamically maintains the Top 5 leaderboard on-chain.

(define-constant err-unauthorized (err u300))
(define-constant err-invalid-rank (err u301))

;; Admin is the prediction-market contract, which awards points
(define-data-var admin principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.prediction-market)

(define-public (set-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-unauthorized)
        (var-set admin new-admin)
        (ok true)
    )
)

(define-private (is-admin)
    (is-eq tx-sender (var-get admin))
)

(define-constant contract-owner tx-sender)

;; --- MAPS ---

;; Tracks a user's score in a specific event
(define-map user-event-scores
    { event-id: uint, user: principal }
    { score: uint }
)

;; The Top 5 leaderboard for each event
;; rank: u1 = 1st, u2 = 2nd, u3 = 3rd, u4 = 4th, u5 = 5th
(define-map event-leaderboard
    { event-id: uint, rank: uint }
    { user: principal, score: uint }
)

;; --- HELPER: SHIFT LEADERBOARD ---

;; Shifts ranks down to make room for a new entry at `target-rank`
(define-private (shift-down (event-id uint) (target-rank uint))
    (begin
        ;; 4 moves to 5
        (if (<= target-rank u4)
            (match (map-get? event-leaderboard { event-id: event-id, rank: u4 })
                entry (map-set event-leaderboard { event-id: event-id, rank: u5 } entry)
                false
            )
            false
        )
        ;; 3 moves to 4
        (if (<= target-rank u3)
            (match (map-get? event-leaderboard { event-id: event-id, rank: u3 })
                entry (map-set event-leaderboard { event-id: event-id, rank: u4 } entry)
                false
            )
            false
        )
        ;; 2 moves to 3
        (if (<= target-rank u2)
            (match (map-get? event-leaderboard { event-id: event-id, rank: u2 })
                entry (map-set event-leaderboard { event-id: event-id, rank: u3 } entry)
                false
            )
            false
        )
        ;; 1 moves to 2
        (if (<= target-rank u1)
            (match (map-get? event-leaderboard { event-id: event-id, rank: u1 })
                entry (map-set event-leaderboard { event-id: event-id, rank: u2 } entry)
                false
            )
            false
        )
        true
    )
)

;; Removes a user from their old rank if they are already on the board but moving up
(define-private (remove-old-rank (event-id uint) (user principal))
    (let (
        (r1 (map-get? event-leaderboard { event-id: event-id, rank: u1 }))
        (r2 (map-get? event-leaderboard { event-id: event-id, rank: u2 }))
        (r3 (map-get? event-leaderboard { event-id: event-id, rank: u3 }))
        (r4 (map-get? event-leaderboard { event-id: event-id, rank: u4 }))
        (r5 (map-get? event-leaderboard { event-id: event-id, rank: u5 }))
    )
        (if (and (is-some r1) (is-eq (get user (unwrap-panic r1)) user))
            (map-delete event-leaderboard { event-id: event-id, rank: u1 })
            (if (and (is-some r2) (is-eq (get user (unwrap-panic r2)) user))
                (map-delete event-leaderboard { event-id: event-id, rank: u2 })
                (if (and (is-some r3) (is-eq (get user (unwrap-panic r3)) user))
                    (map-delete event-leaderboard { event-id: event-id, rank: u3 })
                    (if (and (is-some r4) (is-eq (get user (unwrap-panic r4)) user))
                        (map-delete event-leaderboard { event-id: event-id, rank: u4 })
                        (if (and (is-some r5) (is-eq (get user (unwrap-panic r5)) user))
                            (map-delete event-leaderboard { event-id: event-id, rank: u5 })
                            true
                        )
                    )
                )
            )
        )
    )
)

;; Re-calculates and inserts a user into the Top 5
(define-private (update-leaderboard (event-id uint) (user principal) (new-score uint))
    (let (
        (r1 (map-get? event-leaderboard { event-id: event-id, rank: u1 }))
        (r2 (map-get? event-leaderboard { event-id: event-id, rank: u2 }))
        (r3 (map-get? event-leaderboard { event-id: event-id, rank: u3 }))
        (r4 (map-get? event-leaderboard { event-id: event-id, rank: u4 }))
        (r5 (map-get? event-leaderboard { event-id: event-id, rank: u5 }))
        (s1 (if (is-some r1) (get score (unwrap-panic r1)) u0))
        (s2 (if (is-some r2) (get score (unwrap-panic r2)) u0))
        (s3 (if (is-some r3) (get score (unwrap-panic r3)) u0))
        (s4 (if (is-some r4) (get score (unwrap-panic r4)) u0))
        (s5 (if (is-some r5) (get score (unwrap-panic r5)) u0))
    )
        (begin
            ;; Remove them from their existing spot so they don't appear twice
            (remove-old-rank event-id user)
            
            ;; Find new rank
            (if (> new-score s1)
                (begin (shift-down event-id u1) (map-set event-leaderboard { event-id: event-id, rank: u1 } { user: user, score: new-score }))
                (if (> new-score s2)
                    (begin (shift-down event-id u2) (map-set event-leaderboard { event-id: event-id, rank: u2 } { user: user, score: new-score }))
                    (if (> new-score s3)
                        (begin (shift-down event-id u3) (map-set event-leaderboard { event-id: event-id, rank: u3 } { user: user, score: new-score }))
                        (if (> new-score s4)
                            (begin (shift-down event-id u4) (map-set event-leaderboard { event-id: event-id, rank: u4 } { user: user, score: new-score }))
                            (if (> new-score s5)
                                (begin (shift-down event-id u5) (map-set event-leaderboard { event-id: event-id, rank: u5 } { user: user, score: new-score }))
                                false
                            )
                        )
                    )
                )
            )
            true
        )
    )
)

;; --- MAIN FUNCTIONS ---

;; Called by prediction-market when a user claims a correct prediction
(define-public (add-points (event-id uint) (user principal) (points uint))
    (let (
        (current-score (default-to u0 (get score (map-get? user-event-scores { event-id: event-id, user: user }))))
        (new-score (+ current-score points))
    )
        (begin
            (asserts! (is-admin) err-unauthorized)
            ;; Update user score
            (map-set user-event-scores { event-id: event-id, user: user } { score: new-score })
            ;; Update leaderboard
            (update-leaderboard event-id user new-score)
            (ok new-score)
        )
    )
)

;; --- READ ONLY ---

(define-read-only (get-user-score (event-id uint) (user principal))
    (default-to u0 (get score (map-get? user-event-scores { event-id: event-id, user: user })))
)

(define-read-only (get-top-5 (event-id uint))
    {
        rank1: (map-get? event-leaderboard { event-id: event-id, rank: u1 }),
        rank2: (map-get? event-leaderboard { event-id: event-id, rank: u2 }),
        rank3: (map-get? event-leaderboard { event-id: event-id, rank: u3 }),
        rank4: (map-get? event-leaderboard { event-id: event-id, rank: u4 }),
        rank5: (map-get? event-leaderboard { event-id: event-id, rank: u5 })
    }
)
