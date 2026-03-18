# Design Document: Private Event Page

## Overview

The Private Event Page feature adds a self-contained section to the TrueCall Next.js frontend under the `/private-events` route prefix. It lets any connected wallet create, join, and manage invite-only prediction events on the Stacks blockchain using the existing `private-stacks.ts` read/write helpers.

The feature consists of three route segments:

| Route                    | Purpose                                  |
| ------------------------ | ---------------------------------------- |
| `/private-events`        | List all private events with filter tabs |
| `/private-events/create` | Form to create a new private event       |
| `/private-events/[id]`   | Full lifecycle detail page for one event |

All pages follow the existing TrueCall conventions: `"use client"` directive, `useWallet()` for wallet state, `openContractCall` from `@stacks/connect` for transactions, and the dark-gradient Tailwind layout with `Header` / `Footer`.

---

## Architecture

```
frontend/app/
  private-events/
    page.tsx                  ← list page
    create/
      page.tsx                ← creation form
    [id]/
      page.tsx                ← detail / lifecycle page

frontend/lib/
  private-stacks.ts           ← existing read helpers + tx builders (unchanged)
  types.ts                    ← existing types (unchanged)

frontend/components/
  PrivateEventCard.tsx        ← reusable card for the list page
  PrivateRoundPanel.tsx       ← round state + actions panel for detail page
```

No new libraries are required. SHA-256 hashing uses the browser-native `window.crypto.subtle.digest` API (already available in all modern browsers and Next.js server/client environments).

---

## Components and Interfaces

### `PrivateEventCard`

Props:

```ts
interface PrivateEventCardProps {
  event: ChainPrivateEvent;
  isCreator: boolean; // wallet === event.creator
  isJoined: boolean; // result of isEventMember
  onClick: () => void;
}
```

Renders: title, truncated creator, entry fee (STX), participant count, round progress (`currentRound / maxRounds`), status badge, and optional "Your Event" / "Joined" badges.

### `PrivateRoundPanel`

Props:

```ts
interface PrivateRoundPanelProps {
  event: ChainPrivateEvent;
  round: ChainRound | null;
  userAddress: string | null;
  isCreator: boolean;
  isParticipant: boolean;
  currentBlock: number;
  onActionComplete: () => void; // triggers full data refresh
}
```

Renders the correct UI section based on `round.status` and the caller's role:

- `"pending-sub"` + is submitter → question submission form
- `"pending-sub"` + is creator + deadline passed → Skip button
- `"open-answer"` + is participant + not answered → YES/NO buttons
- `"open-answer"` + is creator + answer window closed → Resolve form
- `"final"` + is participant + answered + not claimed → Claim Points button

---

## Data Models

All data models are already defined in `frontend/lib/types.ts`. No new types are needed.

Key fields used by the UI:

```ts
// ChainPrivateEvent (from types.ts)
{
  (id,
    creator,
    title,
    inviteHash,
    entryFee, // microSTX
    joinDeadline, // burn block height
    maxRounds,
    intervalBlocks,
    submissionWindow,
    answerWindow,
    participantCount,
    totalPool,
    currentRound,
    completedRounds,
    nextSubmitterIndex,
    isActive,
    ended,
    feeBooked,
    refundMode);
}

// ChainRound (from types.ts)
{
  (eventId,
    roundNumber,
    submitter,
    question, // null until submitted
    targetPrice, // whole USD dollars
    submissionOpenBlock,
    submissionDeadline,
    answerCloseBlock,
    status, // "pending-sub" | "open-answer" | "final" | "skipped"
    oraclePrice,
    finalOutcome);
}
```

### Invite Code Hashing

The contract stores `inviteHash` as a 32-byte SHA-256 digest. The frontend must hash the plaintext invite code before calling `createPrivateEventTxOptions`:

```ts
async function hashInviteCode(code: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(code);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", encoded);
  return new Uint8Array(hashBuffer);
}
```

When joining, the raw UTF-8 bytes of the invite code are passed directly (the contract hashes them internally):

```ts
function encodeInviteCode(code: string): Uint8Array {
  return new TextEncoder().encode(code);
}
```

### Block Height Conversion

Join deadline is collected as "minutes from now" and converted to an absolute block height:

```ts
async function minutesToAbsoluteBlock(minutes: number): Promise<number> {
  const resp = await fetch(`${HIRO_API}/v2/info`);
  const info = await resp.json();
  const currentBlock: number = info.burn_block_height ?? 0;
  return currentBlock + Math.ceil(minutes / 10);
}
```

Entry fee is collected in STX and converted to microSTX:

```ts
const microStx = Math.round(stxAmount * 1_000_000);
```

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Invite code hash determinism

_For any_ non-empty invite code string, calling `hashInviteCode` twice with the same input must produce two identical 32-byte `Uint8Array` results — the SHA-256 digest is deterministic and always exactly 32 bytes.

**Validates: Requirements 1.5**

### Property 2: Join encoding preserves byte length

_For any_ invite code string, `encodeInviteCode(code).length` must equal `new TextEncoder().encode(code).length` — the encoding is a pure UTF-8 pass-through with no truncation or mutation.

**Validates: Requirements 3.5**

### Property 3: Block deadline conversion is monotone

_For any_ two minute durations `a` and `b` and any current block height, if `a ≤ b` then `currentBlock + Math.ceil(a / 10) ≤ currentBlock + Math.ceil(b / 10)` — longer deadlines always produce equal or later block heights.

**Validates: Requirements 1.10**

### Property 4: Entry fee conversion is lossless for whole STX

_For any_ non-negative integer STX amount `n` (up to 1,000,000 STX), `Math.round(n * 1_000_000)` must equal `n * 1_000_000` exactly — no floating-point drift for whole-number inputs.

**Validates: Requirements 1.11**

### Property 5: Status badge derivation is total and mutually exclusive

_For any_ combination of `isActive` and `ended` booleans, `deriveStatusLabel(isActive, ended)` must return exactly one of `"Pending"`, `"Active"`, or `"Ended"` — the mapping covers all four boolean combinations and no two labels can be assigned simultaneously.

Mapping:

- `isActive === true` → "Active"
- `isActive === false && ended === false` → "Pending"
- `ended === true` → "Ended"

**Validates: Requirements 2.4**

### Property 6: Creator and joined badge correctness

_For any_ event, wallet address, and membership status, the "Your Event" badge appears if and only if `walletAddress === event.creator`, and the "Joined" badge appears if and only if `isEventMember` returned true — the two badges are computed independently and may coexist.

**Validates: Requirements 2.5, 2.6**

### Property 7: Join form visibility is a pure function of event state

_For any_ combination of `(isParticipant, isActive, ended, currentBlock, joinDeadline)`, the join form must be visible if and only if `!isParticipant && !isActive && !ended && currentBlock <= joinDeadline` — all four conditions must hold simultaneously.

**Validates: Requirements 3.4, 3.7**

### Property 8: Round action visibility is role-exclusive

_For any_ combination of `(round.status, isCreator, isParticipant, currentBlock, windowBlocks, hasAnswered, pointsClaimed)`, the set of rendered action controls must be exactly the minimal set permitted by the role and window checks — no action button for a role the wallet does not hold must ever be rendered, and no button for a closed window must appear.

**Validates: Requirements 4.1, 4.2, 4.3, 4.6, 5.1, 5.3, 5.5, 6.1, 6.3, 7.1**

### Property 9: Claim points state is idempotent

_For any_ `ChainRoundAnswer` where `pointsClaimed === true`, `deriveClaimState(answer)` must always return `"claimed"` — the "Points Claimed ✓" indicator is shown and no "Claim Points" button is rendered, regardless of re-renders.

**Validates: Requirements 7.3**

### Property 10: Payout button visibility covers all end states

_For any_ combination of `(ended, refundMode, isParticipant, refundClaimed)`, the payout UI must show exactly one of: "Claim Winnings" (ended=true, refundMode=false, isParticipant=true), "Claim Refund" (ended=true, refundMode=true, isParticipant=true, refundClaimed=false), "Refund Claimed ✓" (refundClaimed=true), or nothing — no two payout controls may be shown simultaneously.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 11: Leaderboard rendering is correct for any entries

_For any_ leaderboard array of up to 5 entries and any connected wallet address, the rendered output must contain at most 5 items, each item must include a rank medal, a truncated address, and a point total, and if the wallet address matches any entry exactly one "YOU" badge must appear.

**Validates: Requirements 9.2, 9.3**

---

## Error Handling

| Scenario                                           | Handling                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| `getAllPrivateEvents` fetch fails                  | Show error banner + retry button on list page                       |
| `getPrivateEvent` returns null                     | Show "Event not found" + back button on detail page                 |
| `openContractCall` `onCancel` fires                | Restore form/button to idle state, show cancellation message        |
| Hiro API `/v2/info` fails during form submit       | Show "Could not fetch current block height" error, block submission |
| `hashInviteCode` throws (SubtleCrypto unavailable) | Show "Crypto API unavailable — use a modern browser" error          |
| Invalid form fields on submit                      | Inline field-level validation errors, no tx initiated               |
| Join deadline already passed                       | Hide join form, show "Join deadline passed" notice                  |
| Submission window expired                          | Hide submission form, show "Submission window closed" notice        |
| Answer window closed                               | Hide answer buttons, show "Answer window closed" notice             |

---

## Testing Strategy

### Unit Tests

Unit tests cover pure utility functions and deterministic UI logic:

- `hashInviteCode`: verify output is 32 bytes, verify determinism across two calls with the same input.
- `encodeInviteCode`: verify byte length matches `TextEncoder` directly.
- `minutesToAbsoluteBlock`: mock the Hiro API fetch, verify the returned block equals `currentBlock + Math.ceil(minutes / 10)`.
- Entry fee conversion: verify `Math.round(n * 1_000_000)` for a set of whole-number STX values.
- Status badge derivation: verify all three branches (`isActive`, `!isActive && !ended`, `ended`) map to the correct label.
- Round action visibility: for each combination of `(status, isCreator, isParticipant, windowOpen)`, assert the correct set of action controls is rendered.

### Property-Based Tests

Property-based testing uses **fast-check** (add as a dev dependency: `npm install -D fast-check`). Each property test runs a minimum of **100 iterations**.

Each test is tagged with:
`// Feature: private-event-page, Property N: <property text>`

**Property 1 — Invite code hash determinism**

```ts
// Feature: private-event-page, Property 1: invite code hash determinism
fc.assert(
  fc.asyncProperty(fc.string({ minLength: 1 }), async (code) => {
    const h1 = await hashInviteCode(code);
    const h2 = await hashInviteCode(code);
    return h1.length === 32 && h1.every((b, i) => b === h2[i]);
  }),
  { numRuns: 100 },
);
```

**Property 2 — Join encoding preserves byte length**

```ts
// Feature: private-event-page, Property 2: join encoding preserves byte length
fc.assert(
  fc.property(fc.string(), (code) => {
    return (
      encodeInviteCode(code).length === new TextEncoder().encode(code).length
    );
  }),
  { numRuns: 100 },
);
```

**Property 3 — Block deadline monotonicity**

```ts
// Feature: private-event-page, Property 3: block deadline conversion is monotone
fc.assert(
  fc.property(
    fc.integer({ min: 0, max: 10000 }),
    fc.integer({ min: 0, max: 10000 }),
    fc.integer({ min: 0, max: 1_000_000 }),
    (a, b, currentBlock) => {
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      return (
        currentBlock + Math.ceil(lo / 10) <= currentBlock + Math.ceil(hi / 10)
      );
    },
  ),
  { numRuns: 100 },
);
```

**Property 4 — Entry fee conversion lossless**

```ts
// Feature: private-event-page, Property 4: entry fee conversion is lossless for whole STX
fc.assert(
  fc.property(fc.integer({ min: 0, max: 1_000_000 }), (n) => {
    return Math.round(n * 1_000_000) === n * 1_000_000;
  }),
  { numRuns: 100 },
);
```

**Property 5 — Status badge totality and mutual exclusivity**

```ts
// Feature: private-event-page, Property 5: status badge derivation is total and mutually exclusive
fc.assert(
  fc.property(
    fc.record({ isActive: fc.boolean(), ended: fc.boolean() }),
    ({ isActive, ended }) => {
      const label = deriveStatusLabel(isActive, ended);
      const valid = ["Pending", "Active", "Ended"];
      return (
        valid.includes(label) && valid.filter((l) => l === label).length === 1
      );
    },
  ),
  { numRuns: 100 },
);
```

**Property 6 — Creator and joined badge correctness**

```ts
// Feature: private-event-page, Property 6: creator and joined badge correctness
fc.assert(
  fc.property(
    fc.string(),
    fc.string(),
    fc.boolean(),
    (walletAddress, creatorAddress, isMember) => {
      const badges = deriveBadges(walletAddress, creatorAddress, isMember);
      return (
        badges.isCreator === (walletAddress === creatorAddress) &&
        badges.isJoined === isMember
      );
    },
  ),
  { numRuns: 100 },
);
```

**Property 7 — Join form visibility**

```ts
// Feature: private-event-page, Property 7: join form visibility is a pure function of event state
fc.assert(
  fc.property(
    fc.record({
      isParticipant: fc.boolean(),
      isActive: fc.boolean(),
      ended: fc.boolean(),
      currentBlock: fc.integer({ min: 0, max: 1_000_000 }),
      joinDeadline: fc.integer({ min: 0, max: 1_000_000 }),
    }),
    (s) => {
      const visible = deriveJoinFormVisible(s);
      const expected =
        !s.isParticipant &&
        !s.isActive &&
        !s.ended &&
        s.currentBlock <= s.joinDeadline;
      return visible === expected;
    },
  ),
  { numRuns: 100 },
);
```

**Property 8 — Round action visibility is role-exclusive**

```ts
// Feature: private-event-page, Property 8: round action visibility is role-exclusive
fc.assert(
  fc.property(
    fc.record({
      status: fc.constantFrom("pending-sub", "open-answer", "final", "skipped"),
      isCreator: fc.boolean(),
      isParticipant: fc.boolean(),
      windowOpen: fc.boolean(),
      hasAnswered: fc.boolean(),
      pointsClaimed: fc.boolean(),
    }),
    (s) => {
      const actions = deriveVisibleActions(s);
      if (!s.isCreator) {
        if (
          actions.includes("resolve") ||
          actions.includes("skip") ||
          actions.includes("start")
        )
          return false;
      }
      if (!s.isParticipant) {
        if (actions.includes("answer") || actions.includes("claimPoints"))
          return false;
      }
      return true;
    },
  ),
  { numRuns: 100 },
);
```

**Property 9 — Claim points state is idempotent**

```ts
// Feature: private-event-page, Property 9: claim points state is idempotent
fc.assert(
  fc.property(
    fc.record({ prediction: fc.boolean(), pointsClaimed: fc.constant(true) }),
    (answer) =>
      deriveClaimState(answer) === "claimed" &&
      deriveClaimState(answer) === deriveClaimState(answer),
  ),
  { numRuns: 100 },
);
```

**Property 10 — Payout button visibility covers all end states**

```ts
// Feature: private-event-page, Property 10: payout button visibility covers all end states
fc.assert(
  fc.property(
    fc.record({
      ended: fc.boolean(),
      refundMode: fc.boolean(),
      isParticipant: fc.boolean(),
      refundClaimed: fc.boolean(),
    }),
    (s) => {
      const buttons = derivePayoutButtons(s);
      // At most one payout control visible at a time
      return buttons.filter(Boolean).length <= 1;
    },
  ),
  { numRuns: 100 },
);
```

**Property 11 — Leaderboard rendering correctness**

```ts
// Feature: private-event-page, Property 11: leaderboard rendering is correct for any entries
fc.assert(
  fc.property(
    fc.array(fc.record({ user: fc.string(), points: fc.integer({ min: 0 }) }), {
      maxLength: 5,
    }),
    fc.string(),
    (entries, walletAddress) => {
      const rendered = renderLeaderboard(entries, walletAddress);
      if (rendered.length > 5) return false;
      const youBadges = rendered.filter((r) => r.isMe).length;
      const walletInEntries = entries.some((e) => e.user === walletAddress);
      return walletInEntries ? youBadges === 1 : youBadges === 0;
    },
  ),
  { numRuns: 100 },
);
```
