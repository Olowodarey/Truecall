# TrueCall Question Format Rulebook

## Overview

TrueCall questions must be written in a format that can be resolved clearly, fairly, and consistently using oracle price data.

Every question is resolved by the **admin calling `finalize-question`** after the prediction window closes. At that moment, the contract fetches the **live BTC/USD price from the Pyth oracle** and compares it against the configured `target-price`.

This rulebook defines the approved format for all TrueCall questions.

---

## ⏱ How the Price Snapshot Timing Works

This is critical to understand before writing any question.

```
Admin creates question
  → sets close-block (Bitcoin burn block = prediction deadline)

Users predict YES or NO
  → allowed while burn-block-height < close-block

close-block is reached  (prediction window ends)

Admin calls finalize-question
  → Pyth VAA is fetched from Hermes AT THIS MOMENT
  → The contract reads the live BTC price AT THIS MOMENT
  → Outcome is determined
```

**The price snapshot is taken when the admin finalizes — not at the exact close block.**

The `close-block` only controls **when predictions stop being accepted**. The actual oracle price is read when the admin triggers finalization, which is at or after the close block.

> **How close is it in practice?**  
> Admins should finalize as soon as possible after the close block. On testnet, 1 Bitcoin block ≈ 10 minutes. If an admin finalizes 1 block late, the price could shift.

---

## Core Resolution Principle

Every TrueCall question is resolved using:

- the **live BTC/USD price from the Pyth oracle**
- read **at the moment the admin calls `finalize-question`** (at or after the close block)
- compared against the configured **`target-price`**

The outcome is:
- **YES** → `oracle_price >= target_price`
- **NO** → `oracle_price < target_price`

---

## Approved Standard Format

All questions MUST use one of these two templates:

### Template 1 — Above or Equal
```
Will BTC be at or above $[PRICE] when this question is resolved?
```

### Template 2 — Below
```
Will BTC be below $[PRICE] when this question is resolved?
```

The **prediction deadline** (close block converted to estimated time) is shown separately in the UI — it is NOT the price snapshot time.

---

## ✅ Valid Question Examples

### Above format
- Will BTC be at or above $80,000 when this question is resolved?
- Will BTC be at or above $72,500 when this question is resolved?
- Will BTC be at or above $90,000 when this question is resolved?

### Below format
- Will BTC be below $60,000 when this question is resolved?
- Will BTC be below $58,500 when this question is resolved?
- Will BTC be below $70,000 when this question is resolved?

---

## ❌ Invalid Question Examples

### Do NOT include a specific time in the question
```
Will BTC be at or above $80,000 on March 12, at 18:00 UTC?   ← WRONG
```
Why: The oracle snapshot is NOT guaranteed to be taken at 18:00 UTC.  
The prediction deadline might be at 18:00, but the actual price is read when the admin finalizes — which may be later.

### Do NOT say "when this question closes"
```
Will BTC be at or above $80,000 when this question closes?   ← MISLEADING
```
Why: "Closes" refers to the prediction deadline (when users stop predicting). The price snapshot happens at finalization, which is after the close block.

### Do NOT use vague language
- Will BTC pump this week? ← not measurable
- Will BTC crash tomorrow? ← not objective
- Will BTC hit $70,000? ← path-dependent, not a snapshot

---

## Required Elements of Every Question

Every valid TrueCall question must include:

| Element | Requirement |
|---|---|
| Asset | BTC only (v1) |
| Price threshold | A single whole-dollar number (e.g. $80,000) |
| Direction | "at or above" OR "below" — never "hit", "reach", "touch" |
| Resolution phrasing | "when this question is resolved" — not a specific time |

---

## Admin Workflow

When creating a question:

1. Choose a `target-price` (whole dollars, e.g. 80000 = $80,000)
2. Choose a **close time in minutes** — this is the prediction window  
   _e.g. 1440 min = ~24 hours = ~144 Bitcoin blocks_
3. Write the question using the approved template
4. The UI will show users: *"Predictions close: Mar 12, 18:00 UTC (estimated)"*
5. After the close block passes, admin goes to **Manage Questions** and clicks **🔥 Finalize**
6. The Pyth oracle price at that moment determines YES or NO

---

## Resolution Rule

```
outcome = (oracle_price >= target_price)
```

| Resolved Price | Target | Outcome |
|---|---|---|
| $81,000 | $80,000 | YES ✓ |
| $79,999 | $80,000 | NO ✗ |
| $60,000 | $60,000 | YES ✓ (equal counts as YES) |
| $59,999 | $60,000 | NO ✗ |

For below questions, the question phrasing inverts the user's intuition — but the contract always computes `oracle_price >= target_price`. If a user predicts YES on a "below $60,000" question, they are predicting YES to `price >= 60000` which is the "not below" answer. The question wording should always be in "at or above" form to avoid confusion.

---

## Final Rule

For TrueCall v1, every question must follow:

> **One BTC price. One threshold. One clear direction. Resolved when the admin finalizes.**

Do not promise a specific time in the question text. The prediction deadline is shown in the UI — the question text itself should only reference "when this question is resolved."
