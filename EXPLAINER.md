# Playto Payout Engine - Technical Explainer

This document outlines the architectural decisions and integrity controls implemented in the Playto Payout Engine.

## 1. Double-Entry Accounting & Ledger Integrity
### How do we ensure money isn't created or destroyed?
The system adheres to a strict double-entry model. Instead of simply updating a `balance` column, every movement of funds is recorded in the `ledger_entries` table. 
- **Atomic Transactions**: We use `db.transaction()` in SQLite. Every payout involves:
  1. Moving funds from `available_balance` to `held_balance` in the `merchants` table.
  2. Creating a `pending` record in the `payouts` table.
  3. Recording a debit entry in the `ledger_entries` table.
- **Integer Precision**: All amounts are stored as **Paise (Integers)**. We never use floating-point numbers for currency to avoid the notorious IEEE 754 rounding errors (e.g., 0.1 + 0.2 != 0.3).
- **The Invariant**: At any point, for a merchant:
  `Sum(Credits) - Sum(Debits) == Available_Balance + Held_Balance`.

## 2. Concurrency & Locking
### What happens if two payout requests arrive at the same millisecond?
We handle concurrency at the database level using **Sequential Locking**.
- **The Strategy**: We use `BEGIN IMMEDIATE` for SQLite transactions. This upgrades the database lock from shared to reserved immediately.
- **Race Condition Guard**: Inside the transaction, we first `SELECT available_balance FROM merchants WHERE id = ?`. If two requests hit simultaneously:
  1. Request A acquires the transaction lock.
  2. Request B waits for the lock.
  3. Request A deducts balance and commits.
  4. Request B finally gets the lock, but now its `available_balance` check fails because Request A already consumed the funds.
- **Result**: Only one request succeeds; the other is rejected with a "Insufficient funds" error.

## 3. Idempotency Controls
### How do we handle retries and timeouts?
We implement an `Idempotency-Key` header (scoped to each merchant).
- **Storage**: Keys are stored in the `idempotency_keys` table with the associated response status and body.
- **The Flow**:
  1. If a request arrives with a key we've seen in the last 24 hours, we stop processing and return the cached response.
  2. If the first request timed out but the payout was created: the client retries with the same key, and our engine recognizes it, returning the "Success" response without double-debiting.
- **Safety**: This prevents the "Double Charge" problem common in low-bandwidth or unstable network environments.

## 4. The Payout State Machine
### How do payouts transition and recover from failure?
We use a robust state machine: `pending` -> `processing` -> `completed` OR `failed`.
- **Background Worker**: A simulated process picks up `pending` payouts. It moves them to `processing` immediately to "lock" them from other workers.
- **Atomicity on Success/Failure**:
  - **Success (70%)**: Stays `completed`. Funds are moved out of `held_balance`.
  - **Failure (20%)**: Reverts funds from `held_balance` back to `available_balance` and records the reversal.
  - **Hang (10%)**: If a payout is stuck in `processing` for >30 seconds, a cleanup task (Retry Logic) kicks in. 
- **Crash Recovery**: If the server crashes mid-payout, the next boot-up cycle will see the `processing` or `pending` tasks and either resume or safely fail them based on their timeout.

## 5. AI Audit
- **AI-Generated Parts**: The initial landing page layout and the basic Express boilerplate were scaffolded with AI assistance.
- **Manual Engineering**: 
  - **Locking Logic**: I had to manually refine the `BEGIN IMMEDIATE` usage in SQLite to ensure true sequential behavior, as standard `BEGIN` can lead to deadlocks in high-concurrency Node.js environments.
  - **State Machine Transitions**: Hand-tuned the retry and reversal logic to ensure no "lost funds" occur when a payout transitions to `failed` after max retries.
  - **Paise Centricity**: Ensured every single math operation uses integer math to maintain financial precision.
