# v23 Focused Customer Security Review

Updated 2026-10-06. Scope: the customer theme/viewport/notification/tracker change, not a comprehensive penetration test.

## Hardening

- `public/js/customer-v18.js` validates a complete bounded order view before assigning `state.order`. Malformed snapshots previously could mutate state before rendering failed inside the SSE catch. New checks include canonical tenant/table, UUID, version, status, payment method/status, item/modifier arrays, strings, timestamp and safe-integer amounts. Stale views are ignored; malformed HTTP order lists/snapshots report reconnect instead of mutating the display.
- Remote names, status/notification copy and receipt content still use DOM text APIs. Existing hostile HTML fixture names are rendered literally, not interpreted. No `innerHTML`, replay-URL expansion, token storage or new external origin was added.
- The first-paint theme script reads only a validated light/dark preference with a storage exception fallback. Existing `src/server/app.js` hashes its constant inline source for CSP. No `unsafe-inline` script, attribute handler or weaker CSP was introduced.
- No financial/authentication/permission route or secret was changed. Server minor-unit pricing, quotes, explicit confirmation, durable idempotency, guest isolation, cookie/CSRF/origin checks, restricted PostgreSQL RLS and owner MFA remain authoritative.
- Background notifications cannot clear a persistent error; unknown waiter-event states cannot clear existing feedback. Disconnection is not presented as live/current status, and refunded/unpaid status is not presented as paid.

## Evidence and Limits

The customer suite includes hostile HTML, corrupted storage/replay, bounded malformed/foreign-table/stale order events and visual error-priority tests. Actual PostgreSQL integration tests cover static-file/CSP boundaries, tenant and same-table isolation, CSRF, idempotency, scoped SSE/replay/revocation and role guards. Current execution evidence is recorded in `release-readiness.md`.

No claim is made of complete vulnerability coverage, full dependency audit, every device, every provider or production load/restore acceptance. Unconfigured AI, transactional email and gateway capabilities remain explicitly unavailable; public tests must use a disposable outlet rather than modify the original cafe's ledger, passwords or authenticator.
