# TrueCall 🌍

**Fair Prediction Challenges with Borderless Payments — Powered by Stellar**

TrueCall is an on-chain prediction and reward platform that enables creators, communities, and friends to run **fair, transparent prediction challenges** and **pay winners instantly across borders**, without gambling, staking, or financial risk to participants.

TrueCall leverages the Stellar network to provide **immutable timestamps**, **trust-minimized reward settlement**, and **low-cost global payments**, making it easy for creators in any region to reward participants seamlessly.

---

## 🚨 The Problem

Prediction contests today are broken.

### Informal & Unverifiable

- Group chats
- Twitter replies
- Spreadsheets
- Manual tracking

These methods:

- Can't prove who predicted first
- Are easy to manipulate
- Break down as audiences grow

### Gambling-Based Platforms

- Require user staking
- Introduce financial risk
- Are restricted by regulation
- Exclude many regions globally

👉 People who simply want to **test prediction skill and reward correctness** have no fair, global, non-gambling solution.

---

## 💡 The Solution

**TrueCall** provides **skill-based prediction infrastructure** where:

- Participation is always free
- Rewards are optional and creator-funded
- Predictions are timestamped on-chain
- Outcomes are transparent and verifiable
- Winners are paid instantly in their local currency

No betting.
No wagering.
No participant risk.

---

## 🧠 How TrueCall Works

### 🔹 1. Create a Prediction Challenge

Anyone can create a prediction event, such as:

- Football match outcomes
- Tournament winners
- Award results
- Esports matches

Creators can:

- Run challenges **just for fun**
- Or lock a **reward pool** (XLM or USDC) using Stellar

---

### 🔹 2. Free Prediction Submission

Participants:

- Submit predictions for free
- Do not stake or deposit funds
- Only pay minimal Stellar transaction fees

Each prediction:

- Is recorded on Stellar
- Receives an immutable ledger timestamp
- Is publicly verifiable

This provides **proof of participation and proof of timing**.

---

### 🔹 3. Result Verification

After an event concludes:

- A designated verifier submits the final outcome
- Results are sourced from public, authoritative data
- Submissions are transparent and auditable

This removes:

- Manual winner selection
- Bias accusations
- Disputes at scale

---

### 🔹 4. Automatic Scoring & Settlement

Once results are confirmed:

- Correct predictions are identified
- Ties are resolved using **earliest on-chain timestamps**
- Winners are finalized automatically

If rewards are enabled:

- Creator-funded rewards are released
- Winners receive instant payouts via Stellar

---

## 🌍 Cross-Border Payment Features

TrueCall is built as a **payments-first prediction platform**, enabling creators to reward participants across **countries and currencies** using Stellar's global anchor network.

Creators fund rewards once, and winners receive payouts in their **preferred local currency** — without banks or intermediaries.

---

## 🏆 Leaderboards & Competitions

TrueCall supports:

### 🟢 Single Prediction Events

- One-off challenges
- Optional creator-funded rewards
- Instant settlement

### 🔵 Ongoing Competitions

- Weekly, monthly, or tournament-long leaderboards
- Points awarded for correct predictions
- Transparent ranking logic
- Automatic reward distribution

Leaderboards are computed off-chain for efficiency, while **all critical proofs remain on-chain**.

---

## ❌ Not Gambling

TrueCall is **not a betting platform**.

- No user staking
- No wagering
- No financial risk to participants
- Rewards are optional and creator-funded
- Outcomes are based on correctness and timing

This is **skill-based prediction**, not gambling.

---

## 🧱 Architecture Overview

### On-Chain (Stellar / Soroban)

- Prediction submission records
- Immutable timestamps
- Creator-funded reward escrow
- Automatic cross-border payouts

### Off-Chain

- Scoring logic
- Leaderboard aggregation
- Event indexing
- UI optimization



---

## 🎯 Use Cases

### Friends & Family

Free prediction challenges, leaderboards, and bragging rights.

### Sports Creators & Influencers

Global audiences, creator-funded rewards, instant payouts.

### Brand Activations

Transparent campaigns with automated multi-country reward distribution.

### Communities & DAOs

Tournament-long competitions with decentralized settlement.

### Creator-to-Creator Gifting

Reward fans across borders with instant local payouts.

---

## 🟢 Why Stellar

TrueCall is built on Stellar because it provides:

- Low transaction fees
- Fast settlement
- Strong stablecoin support
- Reliable cross-border payments
- Financial inclusion for emerging markets

Stellar is used **only where it adds real value**.

---

## 🌍 Vision

To become the **standard global infrastructure for fair prediction challenges**, enabling creators and communities everywhere to run transparent competitions and reward participants instantly — with borderless payments powered by Stellar.

---

## 📌 Status

TrueCall is under active development as a **Stellar-based consumer application**, focused on:

- Simplicity
- Fairness
- Financial inclusion
- Real-world adoption

---

## 🚀 Getting Started

### Prerequisites

**For Smart Contracts:**

- Rust 1.84.0 or higher
- Stellar CLI 23.4.1 or higher
- WebAssembly target `wasm32v1-none`

**For Frontend:**

- Node.js 18.0 or higher
- npm, yarn, pnpm, or bun

### Build the Contract

```bash
stellar contract build
```

### Run Contract Tests

```bash
stellar contract test
```

### Deploy to Testnet

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/hello_world.wasm \
  --network testnet
```

### Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

---

## 📚 Resources

- [Stellar Smart Contracts Documentation](https://developers.stellar.org/docs/build/smart-contracts/overview)
- [Soroban Examples](https://github.com/stellar/soroban-examples)
- [Stellar CLI Reference](https://developers.stellar.org/docs/tools/cli/stellar-cli)
- [Next.js Documentation](https://nextjs.org/docs)

---

## 📄 License

TBD

---
