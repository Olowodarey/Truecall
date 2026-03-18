# Requirements Document

## Introduction

The Private Event Page feature enables any connected wallet user to create invite-only prediction events on the Stacks blockchain. Unlike public events (managed by the deployer), private events are fully self-managed: the creator sets all parameters, shares an invite code with friends, and drives the full round lifecycle — from starting the event through submitting questions, resolving rounds, and distributing winnings. This feature adds three main surfaces to the frontend: a creation form, an event list page, and a per-event detail page with lifecycle management.

## Glossary

- **Private_Event**: An on-chain prediction event created by any user, gated by an invite code, with a fixed number of rounds.
- **Creator**: The wallet address that called `create-private-event`; has exclusive access to start, resolve, and skip rounds.
- **Participant**: A wallet that has joined a Private_Event by supplying the correct invite code and paying the entry fee.
- **Invite_Code**: A plaintext secret string chosen by the Creator; its SHA-256 hash is stored on-chain as `inviteHash`.
- **Invite_Hash**: The SHA-256 digest of the Invite_Code, stored on-chain to verify joiners without revealing the code.
- **Round**: A single prediction cycle within a Private_Event consisting of a submission window, an answer window, and a resolution step.
- **Submitter**: The Participant whose turn it is to post the round question and target BTC price.
- **Entry_Fee**: The amount in microSTX each Participant pays when joining; pooled into `totalPool`.
- **Join_Deadline**: The block height after which no new Participants may join.
- **Interval_Blocks**: The number of blocks between consecutive round openings.
- **Submission_Window**: The number of blocks the Submitter has to post a question after a round opens.
- **Answer_Window**: The number of blocks Participants have to submit their true/false prediction after a question is posted.
- **Oracle_Price**: The BTC/USD price (whole dollars) supplied by the Creator when resolving a round.
- **Leaderboard**: The top-5 Participants ranked by accumulated points within a Private_Event.
- **Refund_Mode**: A contract state where the event ended with too few participants, allowing each Participant to reclaim their Entry_Fee.
- **Page**: A Next.js App Router page component rendered at a specific URL route.
- **WalletContext**: The React context providing `isConnected`, `stxAddress`, and `connectWallet` to all client components.

---

## Requirements

### Requirement 1: Create Private Event

**User Story:** As a connected user, I want to fill in a form and create a new private prediction event on-chain, so that I can host a private game with friends.

#### Acceptance Criteria

1. THE Page SHALL render a creation form at the route `/private-events/create` accessible to any connected wallet.
2. WHEN a user visits `/private-events/create` without a connected wallet, THE Page SHALL display a connect-wallet prompt instead of the form.
3. THE Page SHALL include form fields for: event title (max 64 ASCII characters), entry fee in STX, join deadline in minutes from now, max rounds (integer ≥ 1), interval blocks (integer ≥ 1), submission window in blocks (integer ≥ 1), and answer window in blocks (integer ≥ 1).
4. THE Page SHALL include an invite code field where the user enters a plaintext secret string.
5. WHEN the user submits the form, THE Page SHALL compute the SHA-256 hash of the invite code using the Web Crypto API and pass the resulting 32-byte buffer as `inviteHash` to `createPrivateEventTxOptions`.
6. WHEN the user submits the form with any required field empty or invalid, THE Page SHALL display a descriptive inline validation error and prevent the transaction from being initiated.
7. WHEN the user submits a valid form, THE Page SHALL call `openContractCall` with the options returned by `createPrivateEventTxOptions` and display a "waiting for wallet" state on the submit button.
8. WHEN the transaction is confirmed (`onFinish` fires), THE Page SHALL redirect the user to `/private-events`.
9. WHEN the transaction is cancelled (`onCancel` fires), THE Page SHALL restore the form to its editable state and display a cancellation message.
10. THE Page SHALL convert the join deadline from minutes to an absolute block height by fetching the current burn block height from the Hiro API and adding `Math.ceil(minutes / 10)` blocks.
11. THE Page SHALL convert the entry fee from STX to microSTX by multiplying by 1,000,000 before passing to the tx builder.

---

### Requirement 2: Private Events List

**User Story:** As a user, I want to browse all private events and quickly see which ones I created or joined, so that I can navigate to the ones relevant to me.

#### Acceptance Criteria

1. THE Page SHALL render a list of all private events at the route `/private-events` by calling `getAllPrivateEvents`.
2. WHILE data is loading, THE Page SHALL display a loading spinner and suppress the event list.
3. IF `getAllPrivateEvents` throws an error, THEN THE Page SHALL display an error message and a retry button.
4. THE Page SHALL display each event as a card showing: event title, creator address (truncated), entry fee in STX, participant count, current round / max rounds, and a status badge (Pending / Active / Ended).
5. WHEN the connected wallet address matches the event's `creator` field, THE Page SHALL display a "Your Event" badge on that card.
6. WHEN the connected wallet is a member of an event (via `isEventMember`), THE Page SHALL display a "Joined" badge on that card.
7. THE Page SHALL include filter tabs for: All, Active, Pending (not yet started), and Ended events.
8. WHEN a user clicks an event card, THE Page SHALL navigate to `/private-events/[id]`.
9. THE Page SHALL include a prominent "Create Private Event" button that navigates to `/private-events/create`.

---

### Requirement 3: Private Event Detail — Overview and Join

**User Story:** As a user, I want to view the details of a private event and join it using an invite code, so that I can participate in the prediction rounds.

#### Acceptance Criteria

1. THE Page SHALL render event details at the route `/private-events/[id]` by calling `getPrivateEvent(id)`.
2. IF the event is not found, THEN THE Page SHALL display a "not found" message and a back button.
3. THE Page SHALL display: title, creator address, entry fee in STX, total pool in STX, participant count, join deadline block, max rounds, interval blocks, submission window, answer window, current round, completed rounds, and status badges for `isActive`, `ended`, and `refundMode`.
4. WHEN the connected wallet is not a Participant and the event has not started (`isActive` is false and `ended` is false), THE Page SHALL display a join form with an invite code input and a join button.
5. WHEN the user submits the join form, THE Page SHALL encode the plaintext invite code to a UTF-8 `Uint8Array` and pass it to `joinPrivateEventTxOptions`.
6. WHEN the join transaction is confirmed, THE Page SHALL refresh the event data and participant status.
7. IF the join deadline block has passed (current block > `joinDeadline`), THEN THE Page SHALL hide the join form and display a "Join deadline passed" notice.
8. WHEN the connected wallet is already a Participant, THE Page SHALL display a "You have joined" confirmation and hide the join form.

---

### Requirement 4: Private Event Detail — Creator Lifecycle Actions

**User Story:** As the event creator, I want to start the event, resolve rounds, and skip missed rounds from the detail page, so that I can manage the full event lifecycle.

#### Acceptance Criteria

1. WHEN the connected wallet matches the event's `creator` and the event has not started (`isActive` is false, `ended` is false, `participantCount` ≥ 1), THE Page SHALL display a "Start Event" button that calls `startPrivateEventTxOptions(eventId)`.
2. WHEN the current round's status is `"open-answer"` and the answer window has closed (current block > round's `answerCloseBlock`), THE Page SHALL display a "Resolve Round" form for the creator with a BTC price input (whole dollars) and a resolve button that calls `resolveRoundTxOptions(eventId, roundNumber, oraclePrice)`.
3. WHEN the current round's status is `"pending-sub"` and the submission deadline has passed (current block > round's `submissionDeadline`), THE Page SHALL display a "Skip Missed Round" button for the creator that calls `skipMissedRoundTxOptions(eventId, roundNumber)`.
4. WHEN any creator action transaction is confirmed, THE Page SHALL refresh the event and round data.
5. WHEN any creator action transaction is pending, THE Page SHALL disable the corresponding button and show a "Waiting for wallet…" label.
6. IF the connected wallet is not the creator, THEN THE Page SHALL not render any creator-only action buttons.

---

### Requirement 5: Private Event Detail — Submitter Round Question

**User Story:** As the designated round submitter, I want to post a question and target BTC price for the current round, so that other participants can make their predictions.

#### Acceptance Criteria

1. WHEN the current round's status is `"pending-sub"` and the connected wallet matches the round's `submitter` field, THE Page SHALL display a question submission form with a question text input (max 64 ASCII characters) and a target BTC price input (whole dollars).
2. WHEN the user submits the question form with valid inputs, THE Page SHALL call `submitRoundQuestionTxOptions(eventId, roundNumber, question, targetPrice)`.
3. WHEN the submission window has expired (current block > round's `submissionDeadline`), THE Page SHALL hide the submission form and display a "Submission window closed" notice.
4. WHEN the question submission transaction is confirmed, THE Page SHALL refresh the round data.
5. IF the connected wallet is not the current round's submitter, THEN THE Page SHALL not render the question submission form.

---

### Requirement 6: Private Event Detail — Participant Answer

**User Story:** As a participant, I want to submit my true/false prediction for the current round's question, so that I can earn points.

#### Acceptance Criteria

1. WHEN the current round's status is `"open-answer"` and the connected wallet is a Participant and has not yet answered, THE Page SHALL display the round question, target price, and two answer buttons: "YES (≥ target)" and "NO (< target)".
2. WHEN the user clicks an answer button, THE Page SHALL call `answerRoundTxOptions(eventId, roundNumber, prediction)` where `prediction` is `true` for YES and `false` for NO.
3. WHEN the answer window has closed (current block > round's `answerCloseBlock`), THE Page SHALL hide the answer buttons and display a "Answer window closed" notice.
4. WHEN the user has already answered (via `getRoundAnswer`), THE Page SHALL display their recorded prediction and hide the answer buttons.
5. WHEN the answer transaction is confirmed, THE Page SHALL refresh the round answer state.

---

### Requirement 7: Private Event Detail — Claim Points

**User Story:** As a participant, I want to claim my points after a round is resolved, so that my score is recorded on-chain and reflected in the leaderboard.

#### Acceptance Criteria

1. WHEN a round's status is `"final"` and the connected wallet is a Participant and has answered that round and has not yet claimed points (`pointsClaimed` is false), THE Page SHALL display a "Claim Points" button for that round that calls `claimRoundPointsTxOptions(eventId, roundNumber)`.
2. WHEN the claim points transaction is confirmed, THE Page SHALL refresh the round answer state and the leaderboard.
3. WHEN points have already been claimed (`pointsClaimed` is true), THE Page SHALL display a "Points Claimed ✓" indicator instead of the button.

---

### Requirement 8: Private Event Detail — Claim Winnings and Refund

**User Story:** As a participant, I want to claim my winnings or refund when the event ends, so that I receive my STX payout.

#### Acceptance Criteria

1. WHEN the event's `ended` field is true and `refundMode` is false and the connected wallet is a Participant, THE Page SHALL display a "Claim Winnings" button that calls `claimPrivateWinningsTxOptions(eventId)`.
2. WHEN the event's `ended` field is true and `refundMode` is true and the connected wallet is a Participant and `refundClaimed` is false, THE Page SHALL display a "Claim Refund" button that calls `claimPrivateRefundTxOptions(eventId)`.
3. WHEN the refund has already been claimed (`refundClaimed` is true), THE Page SHALL display a "Refund Claimed ✓" indicator.
4. WHEN any payout transaction is confirmed, THE Page SHALL refresh the participant and event data.

---

### Requirement 9: Leaderboard

**User Story:** As a user, I want to see the top-5 leaderboard for a private event, so that I can track standings.

#### Acceptance Criteria

1. THE Page SHALL display the leaderboard on the event detail page by calling `getPrivateLeaderboard(eventId)`.
2. THE Page SHALL render up to 5 entries showing rank medal, truncated wallet address, and point total.
3. WHEN the connected wallet appears in the leaderboard, THE Page SHALL highlight that entry and append a "YOU" badge.
4. THE Page SHALL auto-refresh the leaderboard every 30 seconds without a full page reload.
5. WHEN the leaderboard is empty, THE Page SHALL display a "No points yet" placeholder.
6. THE Page SHALL provide a manual refresh button that re-fetches the leaderboard on demand.

---

### Requirement 10: Navigation and Layout

**User Story:** As a user, I want consistent navigation and layout across all private event pages, so that the experience feels cohesive with the rest of the app.

#### Acceptance Criteria

1. THE Page SHALL include the existing `Header` and `Footer` components on all private event routes.
2. THE Page SHALL use the same dark gradient background (`from-gray-900 via-black to-gray-900`) as existing pages.
3. THE Page SHALL include a back-navigation link on the detail page that returns the user to `/private-events`.
4. WHEN the user is not connected, THE Page SHALL display a connect-wallet prompt consistent with the existing pattern used on `/events/[id]`.
5. THE Page SHALL add a "Private Events" navigation link to the `Header` component pointing to `/private-events`.
