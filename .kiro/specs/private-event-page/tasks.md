# Implementation Plan: Private Event Page

## Overview

Implement the private event feature as three Next.js App Router pages under `/private-events`, two reusable components, and a set of pure utility functions that are independently testable. Tasks are ordered so each step produces runnable, integrated code before moving to the next.

## Tasks

- [x] 1. Create utility functions and pure logic helpers
  - Create `frontend/lib/private-event-utils.ts` exporting:
    - `hashInviteCode(code: string): Promise<Uint8Array>` — SHA-256 via `window.crypto.subtle`
    - `encodeInviteCode(code: string): Uint8Array` — UTF-8 TextEncoder pass-through
    - `minutesToAbsoluteBlock(minutes: number, currentBlock: number): number` — `currentBlock + Math.ceil(minutes / 10)`
    - `stxToMicroStx(stx: number): number` — `Math.round(stx * 1_000_000)`
    - `deriveStatusLabel(isActive: boolean, ended: boolean): "Pending" | "Active" | "Ended"`
    - `deriveBadges(wallet: string | null, creator: string, isMember: boolean): { isCreator: boolean; isJoined: boolean }`
    - `deriveJoinFormVisible(s: { isParticipant: boolean; isActive: boolean; ended: boolean; currentBlock: number; joinDeadline: number }): boolean`
    - `deriveVisibleActions(s: { status: ChainRound["status"]; isCreator: boolean; isParticipant: boolean; submitter: string; wallet: string | null; currentBlock: number; submissionDeadline: number; answerCloseBlock: number; hasAnswered: boolean; pointsClaimed: boolean }): string[]`
    - `deriveClaimState(answer: ChainRoundAnswer): "claimable" | "claimed" | "none"`
    - `derivePayoutButtons(s: { ended: boolean; refundMode: boolean; isParticipant: boolean; refundClaimed: boolean }): ("winnings" | "refund" | "refundClaimed" | null)`
    - `renderLeaderboard(entries: LeaderboardEntry[], wallet: string | null): Array<LeaderboardEntry & { isMe: boolean }>`
  - _Requirements: 1.5, 1.10, 1.11, 2.4, 2.5, 2.6, 3.4, 3.5, 3.7, 4.1–4.3, 4.6, 5.1, 5.3, 5.5, 6.1, 6.3, 7.1, 7.3, 8.1–8.3, 9.2, 9.3_

  - [~]\* 1.1 Write property tests for utility functions
    - Install `fast-check` as a dev dependency
    - Create `frontend/lib/__tests__/private-event-utils.test.ts`
    - **Property 1: Invite code hash determinism** — Validates: Requirements 1.5
    - **Property 2: Join encoding preserves byte length** — Validates: Requirements 3.5
    - **Property 3: Block deadline conversion is monotone** — Validates: Requirements 1.10
    - **Property 4: Entry fee conversion is lossless for whole STX** — Validates: Requirements 1.11
    - **Property 5: Status badge derivation is total and mutually exclusive** — Validates: Requirements 2.4
    - **Property 6: Creator and joined badge correctness** — Validates: Requirements 2.5, 2.6
    - **Property 7: Join form visibility is a pure function of event state** — Validates: Requirements 3.4, 3.7
    - **Property 8: Round action visibility is role-exclusive** — Validates: Requirements 4.1–4.3, 4.6, 5.1, 5.3, 5.5, 6.1, 6.3, 7.1
    - **Property 9: Claim points state is idempotent** — Validates: Requirements 7.3
    - **Property 10: Payout button visibility covers all end states** — Validates: Requirements 8.1–8.3
    - **Property 11: Leaderboard rendering is correct for any entries** — Validates: Requirements 9.2, 9.3

- [x] 2. Build `PrivateEventCard` component
  - Create `frontend/components/PrivateEventCard.tsx`
  - Accept props: `event: ChainPrivateEvent`, `isCreator: boolean`, `isJoined: boolean`, `onClick: () => void`
  - Render: title, truncated creator address, entry fee in STX, participant count, round progress (`currentRound / maxRounds`), status badge using `deriveStatusLabel`, optional "Your Event" and "Joined" badges
  - _Requirements: 2.4, 2.5, 2.6_

  - [ ]\* 2.1 Write unit tests for PrivateEventCard
    - Test that "Your Event" badge renders when `isCreator=true`
    - Test that "Joined" badge renders when `isJoined=true`
    - Test all three status badge variants
    - _Requirements: 2.4, 2.5, 2.6_

- [x] 3. Build `PrivateRoundPanel` component
  - Create `frontend/components/PrivateRoundPanel.tsx`
  - Accept props per the design's `PrivateRoundPanelProps` interface
  - Use `deriveVisibleActions` to determine which controls to render
  - Render the correct section for each round state:
    - `"pending-sub"` + is submitter + window open → question/target-price form calling `submitRoundQuestionTxOptions`
    - `"pending-sub"` + is creator + deadline passed → "Skip Missed Round" button calling `skipMissedRoundTxOptions`
    - `"open-answer"` + is participant + not answered + window open → YES/NO buttons calling `answerRoundTxOptions`
    - `"open-answer"` + is creator + answer window closed → resolve form calling `resolveRoundTxOptions`
    - `"final"` + is participant + answered + not claimed → "Claim Points" button calling `claimRoundPointsTxOptions`
    - `"final"` + is participant + `pointsClaimed=true` → "Points Claimed ✓" indicator
  - All `openContractCall` calls follow the existing pattern (dynamic import, `onFinish` calls `onActionComplete`, `onCancel` restores idle state)
  - _Requirements: 4.1–4.6, 5.1–5.5, 6.1–6.5, 7.1–7.3_

  - [ ]\* 3.1 Write unit tests for PrivateRoundPanel action visibility
    - For each `(status, isCreator, isParticipant, windowOpen)` combination, assert the correct controls render
    - Test that "Points Claimed ✓" renders and button is absent when `pointsClaimed=true`
    - _Requirements: 4.6, 5.5, 7.3_

- [x] 4. Build the Private Events list page
  - Create `frontend/app/private-events/page.tsx`
  - On mount: call `getAllPrivateEvents()`, fetch current block from Hiro API, and for each event call `isEventMember(id, userAddress)` to build a membership map
  - Render loading spinner while fetching, error banner + retry on failure
  - Render filter tabs: All / Active / Pending / Ended — filter using `deriveStatusLabel`
  - Render a grid of `PrivateEventCard` components; clicking navigates to `/private-events/[id]`
  - Include a "Create Private Event" button linking to `/private-events/create`
  - _Requirements: 2.1–2.9_

  - [ ]\* 4.1 Write unit tests for list page states
    - Test loading spinner renders while fetching
    - Test error banner + retry button renders on fetch failure
    - Test empty state message when no events exist
    - _Requirements: 2.2, 2.3_

- [x] 5. Build the Create Private Event page
  - Create `frontend/app/private-events/create/page.tsx`
  - Show connect-wallet prompt when `!isConnected`
  - Form fields: title (max 64 chars), entry fee (STX), join deadline (minutes), max rounds, interval blocks, submission window (blocks), answer window (blocks), invite code (plaintext)
  - On submit:
    1. Validate all fields (non-empty, positive integers where required)
    2. Fetch current block from Hiro API via `minutesToAbsoluteBlock`
    3. Call `hashInviteCode` on the invite code
    4. Call `openContractCall` with `createPrivateEventTxOptions`
    5. `onFinish` → redirect to `/private-events`
    6. `onCancel` → restore form, show cancellation message
  - Show inline validation errors per field; disable submit while pending
  - _Requirements: 1.1–1.11_

  - [-]\* 5.1 Write unit tests for create form validation
    - Test that submitting with empty title shows an error
    - Test that submitting with negative entry fee shows an error
    - Test that submitting with zero max rounds shows an error
    - _Requirements: 1.6_

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Build the Private Event detail page
  - Create `frontend/app/private-events/[id]/page.tsx`
  - On mount: call `getPrivateEvent(id)`, `getPrivateLeaderboard(id)`, `getPrivateParticipant(id, userAddress)`, `getRound(id, event.currentRound)`, `getRoundAnswer(id, currentRound, userAddress)`, and fetch current block
  - Show "not found" + back button if `getPrivateEvent` returns null
  - Render event overview panel: all fields from Requirement 3.3, status badges
  - Render join section (using `deriveJoinFormVisible`): invite code input + join button calling `joinPrivateEventTxOptions` with `encodeInviteCode`; hide with "Join deadline passed" notice when deadline has passed
  - Render "Start Event" button for creator when event not yet started and `participantCount >= 1` (calls `startPrivateEventTxOptions`)
  - Render `PrivateRoundPanel` for the current round
  - Render payout section using `derivePayoutButtons`: "Claim Winnings" / "Claim Refund" / "Refund Claimed ✓"
  - Render leaderboard panel using `renderLeaderboard`; auto-refresh every 30 s; manual refresh button
  - Back link to `/private-events`
  - _Requirements: 3.1–3.8, 4.1–4.6, 5.1–5.5, 6.1–6.5, 7.1–7.3, 8.1–8.4, 9.1–9.6_

  - [ ]\* 7.1 Write unit tests for detail page conditional sections
    - Test "not found" renders when event is null
    - Test join form hidden when `isParticipant=true`
    - Test "Join deadline passed" notice when `currentBlock > joinDeadline`
    - Test "Start Event" button visible only for creator when event not started
    - Test leaderboard "YOU" badge appears for connected wallet
    - _Requirements: 3.2, 3.7, 3.8, 4.1, 9.3_

- [x] 8. Add "Private Events" link to Header
  - Edit `frontend/components/Header.tsx` to add a navigation link to `/private-events`
  - _Requirements: 10.5_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All `openContractCall` calls use dynamic import of `@stacks/connect` following the existing pattern in `events/[id]/page.tsx`
- `fast-check` must be added as a dev dependency before running property tests: `npm install -D fast-check`
- The `private-event-utils.ts` module exports pure functions with no React dependencies, making them straightforward to unit and property test in Node
- Each property test references its design document property number in a comment tag
