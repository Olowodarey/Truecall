```markdown
# TrueCall Question Format Rulebook

## Overview

TrueCall questions must be written in a format that can be resolved clearly, fairly, and consistently using oracle price data.

Because TrueCall resolves questions using the **BTC price from the approved oracle at the scheduled question close time**, every question must follow a strict and objective structure.

This rulebook defines the approved format for all official and private TrueCall questions.

---

## Core Resolution Principle

Every TrueCall question is resolved using:

- the **BTC price from the approved oracle**
- read **at or after the scheduled close time**
- compared against the configured **target price**

This means every question must be framed around a **single BTC price threshold** at a **specific date and time**.

---

## Approved Standard Format

All TrueCall questions should use one of these two formats:

### Format A
**Will BTC be at or above $[PRICE] on [DATE], at [TIME] UTC?**

### Format B
**Will BTC be below $[PRICE] on [DATE], at [TIME] UTC?**

These are the official supported question templates for TrueCall v1.

---

## Examples of Valid Questions

### Above format
- Will BTC be at or above $80,000 on March 12, 2026, at 18:00 UTC?
- Will BTC be at or above $72,500 on March 15, 2026, at 12:00 UTC?
- Will BTC be at or above $90,000 on April 2, 2026, at 00:00 UTC?

### Below format
- Will BTC be below $60,000 on March 12, 2026, at 18:00 UTC?
- Will BTC be below $58,500 on March 20, 2026, at 09:00 UTC?
- Will BTC be below $70,000 on April 1, 2026, at 21:00 UTC?

---

## Why This Format Is Required

This format works because it is:

- **binary**
- **clear**
- **measurable**
- **time-specific**
- **oracle-resolvable**

Each question depends on only:

1. one BTC price  
2. one threshold  
3. one exact resolution time  

This removes ambiguity and makes settlement straightforward.

---

## Required Elements of Every Question

Every valid TrueCall question must include:

- **BTC** as the asset
- a **single price threshold**
- a **specific date**
- a **specific UTC time**
- a **clear comparison direction**
  - at or above
  - below

If any of these are missing, the question should not be used.

---

## Recommended Writing Rules

Questions should always be:

- short
- direct
- objective
- specific
- easy to resolve from one oracle price read

### Good examples
- Will BTC be at or above $80,000 on March 12, 2026, at 18:00 UTC?
- Will BTC be below $60,000 on March 12, 2026, at 18:00 UTC?
- Will BTC be at or above $75,500 on March 18, 2026, at 09:00 UTC?

### Bad examples
- Will BTC pump this week?
- Will BTC crash tomorrow?
- Will BTC perform strongly this month?
- Will BTC surprise the market?

These are too vague and cannot be resolved objectively.

---

## Unsupported Question Types

The following question types are not supported in TrueCall v1.

### 1. Path-dependent questions
These depend on whether BTC crossed a level at any point during a period.

**Do not use**
- Will BTC hit $70,000 on March 11?
- Will BTC touch $80,000 this week?
- Will BTC drop below $55,000 tomorrow?

These are not supported because the current oracle logic resolves using a single price at a specific time, not full historical price movement.

---

### 2. Multi-condition questions
These combine more than one condition.

**Do not use**
- Will BTC be above $70,000 and ETH be above $4,000 on March 12?
- Will BTC be below $60,000 and dominance rise above 60%?

Each question must test only one condition.

---

### 3. Subjective questions
These cannot be verified objectively.

**Do not use**
- Will BTC have a bullish day?
- Will BTC perform well this week?
- Will BTC market sentiment improve tomorrow?

These are opinion-based and not machine-resolvable.

---

### 4. Non-price questions
Unless additional oracle feeds are added, non-price questions should not be used.

**Do not use**
- Will Bitcoin dominance rise on March 12?
- Will ETF inflows be positive this week?
- Will on-chain activity increase tomorrow?

These require data beyond the current BTC price oracle.

---

## Resolution Rule

Each question is resolved by comparing the oracle BTC price at the scheduled resolution time with the configured threshold.

### Example
Question:
**Will BTC be at or above $80,000 on March 12, 2026, at 18:00 UTC?**

Resolution:
- **YES** if the oracle BTC price at resolution is greater than or equal to $80,000
- **NO** otherwise

Another example:

Question:
**Will BTC be below $60,000 on March 12, 2026, at 18:00 UTC?**

Resolution:
- **YES** if the oracle BTC price at resolution is less than $60,000
- **NO** otherwise

---

## Admin Formatting Checklist

Before publishing any question, confirm the following:

- Is the question only about **BTC price**?
- Does it use **at or above** or **below**?
- Does it include a **specific date**?
- Does it include a **specific UTC time**?
- Does it use only **one price threshold**?
- Can the answer be determined from **one oracle price read**?

If the answer to any of these is no, the question should be rejected.

---

## Official TrueCall Templates

Admins should preferably create questions only from these templates.

### Template 1
**Will BTC be at or above $[PRICE] on [DATE], at [TIME] UTC?**

### Template 2
**Will BTC be below $[PRICE] on [DATE], at [TIME] UTC?**

These two templates are sufficient for a clean and fair v1 system.

---

## Examples for Official Events

- Will BTC be at or above $80,000 on March 12, 2026, at 18:00 UTC?
- Will BTC be below $60,000 on March 12, 2026, at 18:00 UTC?
- Will BTC be at or above $85,000 on March 16, 2026, at 12:00 UTC?
- Will BTC be below $58,000 on March 20, 2026, at 09:00 UTC?

---

## Examples for Private Events

- Will BTC be at or above $78,000 on March 14, 2026, at 15:00 UTC?
- Will BTC be below $62,500 on March 15, 2026, at 20:00 UTC?
- Will BTC be at or above $90,000 on March 30, 2026, at 10:00 UTC?

---

## Future Expansion

Future versions of TrueCall may support more advanced market formats if new oracle feeds or historical price data are added.

Possible future market types may include:

- intraday high/low questions
- first-to-hit price questions
- dominance questions
- ETF flow questions
- on-chain metric questions

Until then, all TrueCall v1 questions should follow the approved standard format only.

---

## Final Rule

For TrueCall v1, every question must follow this rule:

**One BTC price. One threshold. One exact date and time. One objective outcome.**

That is the format that keeps TrueCall fair, simple, and fully resolvable on-chain.
```
