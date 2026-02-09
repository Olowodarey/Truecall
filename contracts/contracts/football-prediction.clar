;; Football Prediction Contract
;; A smart contract for football match predictions with access code control and leaderboard system

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-unauthorized (err u102))
(define-constant err-already-exists (err u103))
(define-constant err-invalid-code (err u104))
(define-constant err-event-closed (err u105))
(define-constant err-event-not-closed (err u106))
(define-constant err-already-predicted (err u107))
(define-constant err-event-not-settled (err u108))
(define-constant err-event-already-settled (err u109))

;; Data Variables
(define-data-var event-nonce uint u0)

;; Outcome types: u1 = home win, u2 = draw, u3 = away win
(define-constant outcome-home u1)
(define-constant outcome-draw u2)
(define-constant outcome-away u3)

;; Points awarded for correct prediction
(define-constant points-per-correct-prediction u10)

;; Data Maps

;; Events storage
(define-map events
    { event-id: uint }
    {
        event-name: (string-ascii 100),
        creator: principal,
        access-code-hash: (buff 32),
        home-team: (string-ascii 50),
        away-team: (string-ascii 50),
        match-time: uint,
        oracle: principal,
        status: (string-ascii 10), ;; "open", "closed", "settled"
        final-result: (optional uint)
    }
)

;; Predictions storage - key is event-id + participant
(define-map predictions
    { event-id: uint, participant: principal }
    {
        event-name: (string-ascii 100),
        predicted-outcome: uint,
        timestamp: uint
    }
)

;; Leaderboard storage
(define-map leaderboard
    { participant: principal }
    {
        total-points: uint,
        correct-predictions: uint,
        total-predictions: uint
    }
)

;; Event participants list
(define-map event-participants
    { event-id: uint, participant: principal }
    { joined: bool }
)

;; Track participant count per event
(define-map event-participant-count
    { event-id: uint }
    { count: uint }
)

;; Store participants by index for retrieval
(define-map event-participant-by-index
    { event-id: uint, index: uint }
    { participant: principal }
)

;; Read-only functions

;; Get event details
(define-read-only (get-event (event-id uint))
    (map-get? events { event-id: event-id })
)

;; Get prediction for a specific event and participant
(define-read-only (get-prediction (event-id uint) (participant principal))
    (map-get? predictions { event-id: event-id, participant: participant })
)

;; Get user statistics
(define-read-only (get-user-stats (participant principal))
    (default-to 
        { total-points: u0, correct-predictions: u0, total-predictions: u0 }
        (map-get? leaderboard { participant: participant })
    )
)

;; Check if user has joined an event
(define-read-only (has-joined-event (event-id uint) (participant principal))
    (is-some (map-get? event-participants { event-id: event-id, participant: participant }))
)

;; Get participant count for an event
(define-read-only (get-participant-count (event-id uint))
    (default-to u0 
        (get count (map-get? event-participant-count { event-id: event-id }))
    )
)

;; Get participant by index
(define-read-only (get-participant-at-index (event-id uint) (index uint))
    (get participant (map-get? event-participant-by-index { event-id: event-id, index: index }))
)

;; Public functions

;; Create a new event
(define-public (create-event 
    (event-name (string-ascii 100))
    (access-code (string-ascii 50))
    (home-team (string-ascii 50))
    (away-team (string-ascii 50))
    (match-time uint)
    (oracle principal)
)
    (let
        (
            (event-id (+ (var-get event-nonce) u1))
            (code-hash (sha256 (unwrap-panic (to-consensus-buff? access-code))))
        )
        ;; Update nonce
        (var-set event-nonce event-id)
        
        ;; Create event
        (map-set events
            { event-id: event-id }
            {
                event-name: event-name,
                creator: tx-sender,
                access-code-hash: code-hash,
                home-team: home-team,
                away-team: away-team,
                match-time: match-time,
                oracle: oracle,
                status: "open",
                final-result: none
            }
        )
        (ok event-id)
    )
)

;; Join event and place prediction
(define-public (join-event 
    (event-id uint)
    (access-code (string-ascii 50))
    (predicted-outcome uint)
)
    (let
        (
            (event (unwrap! (get-event event-id) err-not-found))
            (code-hash (sha256 (unwrap-panic (to-consensus-buff? access-code))))
        )
        ;; Verify access code
        (asserts! (is-eq code-hash (get access-code-hash event)) err-invalid-code)
        
        ;; Verify event is open
        (asserts! (is-eq (get status event) "open") err-event-closed)
        
        ;; Verify user hasn't already predicted
        (asserts! (is-none (get-prediction event-id tx-sender)) err-already-predicted)
        
        ;; Verify valid outcome
        (asserts! (or (is-eq predicted-outcome outcome-home)
                     (or (is-eq predicted-outcome outcome-draw)
                         (is-eq predicted-outcome outcome-away)))
                 err-unauthorized)
        
        ;; Record participation
        (let
            (
                (current-count (get-participant-count event-id))
            )
            (map-set event-participants
                { event-id: event-id, participant: tx-sender }
                { joined: true }
            )
            
            ;; Add participant to indexed list
            (map-set event-participant-by-index
                { event-id: event-id, index: current-count }
                { participant: tx-sender }
            )
            
            ;; Increment participant count
            (map-set event-participant-count
                { event-id: event-id }
                { count: (+ current-count u1) }
            )
        )
        
        ;; Store prediction
        (map-set predictions
            { event-id: event-id, participant: tx-sender }
            {
                event-name: (get event-name event),
                predicted-outcome: predicted-outcome,
                timestamp: stacks-block-height
            }
        )
        
        ;; Initialize leaderboard entry if new user
        (if (is-none (map-get? leaderboard { participant: tx-sender }))
            (map-set leaderboard
                { participant: tx-sender }
                { total-points: u0, correct-predictions: u0, total-predictions: u1 }
            )
            ;; Increment total predictions
            (let
                (
                    (stats (unwrap-panic (map-get? leaderboard { participant: tx-sender })))
                )
                (map-set leaderboard
                    { participant: tx-sender }
                    {
                        total-points: (get total-points stats),
                        correct-predictions: (get correct-predictions stats),
                        total-predictions: (+ (get total-predictions stats) u1)
                    }
                )
            )
        )
        
        (ok true)
    )
)

;; Close event (stop accepting predictions)
(define-public (close-event (event-id uint))
    (let
        (
            (event (unwrap! (get-event event-id) err-not-found))
        )
        ;; Only creator can close
        (asserts! (is-eq tx-sender (get creator event)) err-unauthorized)
        
        ;; Verify event is open
        (asserts! (is-eq (get status event) "open") err-event-closed)
        
        ;; Update status
        (map-set events
            { event-id: event-id }
            (merge event { status: "closed" })
        )
        (ok true)
    )
)

;; Submit result (oracle only) and award points
(define-public (submit-result (event-id uint) (final-result uint))
    (let
        (
            (event (unwrap! (get-event event-id) err-not-found))
        )
        ;; Only oracle can submit
        (asserts! (is-eq tx-sender (get oracle event)) err-unauthorized)
        
        ;; Verify event is closed
        (asserts! (is-eq (get status event) "closed") err-event-not-closed)
        
        ;; Verify valid outcome
        (asserts! (or (is-eq final-result outcome-home)
                     (or (is-eq final-result outcome-draw)
                         (is-eq final-result outcome-away)))
                 err-unauthorized)
        
        ;; Update event with result
        (map-set events
            { event-id: event-id }
            (merge event { 
                status: "settled",
                final-result: (some final-result)
            })
        )
        
        (ok true)
    )
)

;; Award points to a participant (called after result submission)
(define-public (award-points (event-id uint) (participant principal))
    (let
        (
            (event (unwrap! (get-event event-id) err-not-found))
            (prediction (unwrap! (get-prediction event-id participant) err-not-found))
            (final-result (unwrap! (get final-result event) err-event-not-settled))
            (stats (get-user-stats participant))
        )
        ;; Verify event is settled
        (asserts! (is-eq (get status event) "settled") err-event-not-settled)
        
        ;; Check if prediction was correct
        (if (is-eq (get predicted-outcome prediction) final-result)
            ;; Award points for correct prediction
            (begin
                (map-set leaderboard
                    { participant: participant }
                    {
                        total-points: (+ (get total-points stats) points-per-correct-prediction),
                        correct-predictions: (+ (get correct-predictions stats) u1),
                        total-predictions: (get total-predictions stats)
                    }
                )
                (ok { awarded: true, points: points-per-correct-prediction })
            )
            ;; No points for incorrect prediction
            (ok { awarded: false, points: u0 })
        )
    )
)

;; Update oracle address (creator only)
(define-public (update-oracle (event-id uint) (new-oracle principal))
    (let
        (
            (event (unwrap! (get-event event-id) err-not-found))
        )
        ;; Only creator can update
        (asserts! (is-eq tx-sender (get creator event)) err-unauthorized)
        
        ;; Cannot update after settlement
        (asserts! (not (is-eq (get status event) "settled")) err-event-already-settled)
        
        ;; Update oracle
        (map-set events
            { event-id: event-id }
            (merge event { oracle: new-oracle })
        )
        (ok true)
    )
)
