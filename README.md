# TrueCall – Decentralized Hybrid Prediction Platform on Stacks

![TrueCall Logo](./logo.png)

**Fair, transparent prediction challenges for creators & communities.**
Hybrid resolution using **Pyth Oracle** for numeric events and **creator-submitted answers verified by a trusted admin** for major events (sports, competitions, etc.)
Built on **Stacks blockchain** with **Clarity smart contracts**.

---

## Key Features (Updated)

### Hybrid Resolution

- **Pyth Oracle:** Automatic resolution for numeric events (crypto/price-based predictions).
- **Creator-Submitted Answers Verified by Admin:** For major events like sports, the **creator provides the correct outcome**, and the **trusted admin only confirms** it on-chain. The admin **cannot modify or choose outcomes**, ensuring full transparency and fairness.

### Prediction Mechanics

- Users submit **predictions on-chain**.
- Each event must have **at least 3 prediction options**.
- On-chain timestamps prevent disputes.
- **Admin role is limited to verifying creator-submitted answers**, never arbitrarily resolving events.

---

## Event & Prediction Flow (Updated)

1. **Event Creation (Creator)**
   - Define `title`, `prediction options` (≥3), start & end block.
   - Creator submits the **correct answer** after event ends (or before for scheduled events).
   - Optional reward locked (STX) for winners.

2. **User Participation**
   - Submit a prediction on-chain before the event ends.
   - Prediction stored with timestamp for transparency.

3. **Event Resolution**
   - After event ends:
     - **Numeric predictions:** Resolved automatically via **Pyth Oracle**.
     - **Major events:** Creator submits the correct outcome. **Admin only verifies and confirms** it on-chain.

   - Contract calculates points based on correct predictions.

4. **Leaderboard Update**
   - Users earn points based on correct predictions.
   - Leaderboards update in real-time for each event or season.

5. **Rewards & NFT Badges**
   - Winners automatically receive STX rewards (if enabled).
   - Optional NFT badges minted as proof of skill.

---

**Notes:**

- `creator-submitted-answer` is the definitive outcome.
- `admin-verified` confirms the answer is valid and accepted on-chain.
- Admin cannot change the answer, only verify it.

---

## 🔑 Admin Role

- Admin **cannot modify predictions or outcomes**.
- Admin **only verifies** the answer submitted by the creator.
- This ensures that all events remain **transparent, fair, and verifiable**.

---

This makes the **hybrid model fully transparent**:

- Pyth handles numeric data automatically.
- Creator submits the outcome for non-numeric events.
- Admin confirms it.
- Users’ predictions are scored automatically and leaderboard updated.

---

## 🚀 Getting Started (Mono-repo)

This is a mono-repo structure:

- `contracts/`: Stacks/Clarity smart contracts (Clarinet project).
- `frontend/`: Next.js web application.

### Prerequisites

- Clarinet (for contracts)
- Node.js & npm (for frontend)

### Scripts

Run these from the root:

- `npm run frontend:dev`: Start Next.js dev server.
- `npm run contracts:check`: Check Clarity contracts.
