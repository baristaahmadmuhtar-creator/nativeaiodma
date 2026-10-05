# v20: Operations, notifications and AI governance

## Scope
- Durable, paginated inbox derived from committed outbox events. Guest audience is
  session-scoped; staff inbox is outlet-scoped and role-filtered. Read watermark is
  persisted per user/outlet (guest per session), monotonic and CSRF protected.
- Notification links open canonical current orders/calls, never mutate from old
  event snapshots. Refresh preserves filters, editor input and scroll position.
- Customer status announcements for new order versions and waiter responses,
  without browser permission prompts or claims of background push delivery.
- Owner-configurable AI enabled flag and UTC daily admitted-request limit, enforced
  atomically across sessions. Disabled/exhausted AI falls back without proposals;
  manual ordering remains available. No secrets exposed in dashboard.
- Durable AI accounting separate from deletable conversation memory: actual reported
  tokens, completeness, modes, admitted requests, limits and UTC reset time. No
  invented token estimates, costs or billing balances. Maximum provider calls per
  admitted request remains bounded by the existing orchestrator (3).
- Verified Coffeenity login, preserving existing owners and mandatory MFA.

## Acceptance
Real PostgreSQL tests cover isolation, role filtering, CSRF, monotonic reads,
pagination, concurrency, retry and memory deletion/accounting. Real browser tests
cover inbox-to-current-order flow, policy save, mobile overflow, owner and customer
sessions. Existing order/payment/idempotency/UI suites must remain green. Publish
only after build and automated regression checks; record exact release evidence.

## Not Included / Production Gates
Background web push, transactional email, payment gateway, paid AI credit billing
and provider cost calculations require configured external services. Live AI quality,
restore/load/soak and real cafe/device acceptance remain release gates. This scope
does not make an unverifiable zero-bug or full production certification claim.
