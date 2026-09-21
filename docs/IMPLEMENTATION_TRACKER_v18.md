# AIODMA v18 Implementation Tracker

Updated: 2026-09-21. Scope authorized through publication; production promotion remains gate-controlled.
Baseline: d8884b195f3a6144191568a2e1513916d314c4c3. Deployed candidate: `18b5fd9dde8e79d2b8f6150917b8e5a063f709d9`.

## Gate Status

| Gate | Status | Evidence and remaining acceptance |
|---|---|---|
| G0 | PARTIAL | Baseline inventory/ADRs and 20 screenshots captured; J1-J5 baseline journeys not complete. |
| G1 | PARTIAL | PostgreSQL RLS, sessions, roles, audit and migrations implemented. Container, full permission matrix, reset and migration rehearsal incomplete. |
| G2 | PARTIAL | Canonical pricing/cart/quote/order, manual payment, durable idempotency and scoped SSE pass local tests. Stock concurrency, restart/expiry, refunds, compatibility/native acceptance incomplete. |
| G3 | PARTIAL | Bounded provider/orchestrator, consented profile and explicit proposal confirmation implemented. Customer contract and real local API browser journeys pass; 240-case corpus/live provider evaluation remains missing. |
| G4 | PARTIAL, DEPENDENCIES NOT PASSED | Admin browser journey passes locally. Complete onboarding, reporting, external integrations and production PWA acceptance remain. |
| G5 | PARTIAL | Local automated suites pass, CI exists, and Vercel production build applied Neon migrations and seed data. Soak, restore drill, load testing, live AI evaluation and complete public journey acceptance remain. |
| G6 | CONTROLLED PILOT DEPLOYED | Vercel deployment `dpl_E4jMLcWxRkquF681svvmhJ4BJaHa` is Ready at `https://nativeaiodma-v18.vercel.app`. Public customer smoke passed session, 62-item menu/assets, cart and BND quote without confirming an order; this does not waive incomplete G5 evidence. |

## Task Coverage

T00/T02: implemented, partial local verification. T01: partial baseline.
T03-T11/T13: partial implementation and local tests, not full task acceptance.
T12: gateway disabled; no live gateway claimed.
T14: customer adapter in progress; OpenAPI/native review missing.
T15-T18/T20: partial implementation; live runtime and full intelligence acceptance missing.
T19: not complete; 30 mocked AI unit tests do not replace the required evaluation corpus.
T21: vision disabled.
T22-T26/T28: provisional admin services/UI, not complete or accepted.
T27/T29: integration/onboarding acceptance not implemented completely.
T30-T35: incomplete. T36: authorized and partially complete; customer public smoke passed, while full admin/order/KDS/receipt and operational acceptance remain.

## Verified Local Evidence

- `npm run test:unit`: 62 passed, 0 failed.
- `npm run test:integration`: 34 passed, 0 failed, actual local PostgreSQL.
- `npm run test:customer`: passed at 390x844 and 1440x1000.
- `npm run test:customer:live`: passed against the real local API with PostgreSQL persistence.
- `node tests/e2e/admin-v18.cjs`: passed; evidence under `output/admin-v18/` (ignored local artifacts).
- Vercel production build: migrations applied and two published test merchants seeded on Neon; least-privilege runtime database role verified; deployment status Ready.
- Public customer smoke: QR exchange and session passed for Coffeenity Table 1; 62 products and production images loaded; cart persistence and BND 1.50 quote passed; no order was confirmed and browser console errors were empty.
- Integration scope: non-superuser application role, private-file boundary, QR/session/CSRF checks, tenant and same-table guest isolation, cart/order idempotency, exact manual settlement, scoped SSE/replay/revocation and transaction context reset.
- Baseline evidence: `output/playwright/baseline-1789921303234/report.json` (local ignored artifacts). Legacy 12 tests passed but contain unsafe assumptions; not production evidence.
- Browser contract suites now pass after fixing asynchronous Puppeteer executable resolution and deterministic capture handling.

## External and Environment Constraints

- Runtime provider key/model and a separate staging target are not configured/verified. Production AI therefore uses bounded local degraded mode. Never put secrets in this tracker.
- Windows environment cannot establish native iOS device acceptance.
- Local disk remains constrained. Avoid browser downloads and large local image builds until space is expanded.
- Default `npm start` and `npm run dev` now use the v18 runtime. Legacy commands are retained only as explicit `start:legacy` and `dev:legacy` scripts.

Acceptance remains governed by the PRD/backlog, not this implementation summary. Missing mandatory evidence cannot be waived by local test success.
