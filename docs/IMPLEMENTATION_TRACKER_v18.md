# AIODMA v18 Implementation Tracker

Updated: 2026-10-06. Scope authorized through publication; production promotion remains gate-controlled.
Baseline: d8884b195f3a6144191568a2e1513916d314c4c3. Deployed native customer layer code: `593a263c36453d370388a17b577f608228f7ba36`, preserving v20 operations.

## Gate Status

| Gate | Status | Evidence and remaining acceptance |
|---|---|---|
| G0 | PARTIAL | Baseline inventory/ADRs and 20 screenshots captured; J1-J5 baseline journeys not complete. |
| G1 | PARTIAL | PostgreSQL RLS, sessions, roles, audit and migrations implemented. Container, full permission matrix, reset and migration rehearsal incomplete. |
| G2 | PARTIAL | Canonical pricing/cart/quote/order, manual payment, durable idempotency and scoped SSE pass local tests. Stock concurrency, restart/expiry, refunds, compatibility/native acceptance incomplete. |
| G3 | PARTIAL | Bounded provider/orchestrator, consented profile and explicit proposal confirmation implemented. Customer contract and real local API browser journeys pass; 240-case corpus/live provider evaluation remains missing. |
| G4 | PARTIAL, DEPENDENCIES NOT PASSED | Admin browser journey passes locally. Self-service signup/MFA/outlet publication passed locally and publicly. Email verification, reporting, external integrations and complete production PWA acceptance remain. |
| G5 | PARTIAL | Local automated suites pass, CI exists, and Vercel production build applied Neon migrations and seed data. Soak, restore drill, load testing, live AI evaluation and complete public journey acceptance remain. |
| G6 | CUSTOMER AND SELF-SERVICE PILOT LIVE VERIFIED | Vercel deployment `dpl_GtKuaqdL2gEa7cGS5WKJt5HncaUy` is Ready at `https://nativeaiodma-v18.vercel.app`. Public disposable-outlet full role flow and original Coffeenity customer QR/menu/native grabbers/preferences passed. Original owner requires their enrolled MFA code; no authenticator reset. G5 remains partial. |

## Task Coverage

T00/T02: implemented, partial local verification. T01: partial baseline.
T03-T11/T13: partial implementation and local tests, not full task acceptance.
T12: gateway disabled; no live gateway claimed.
T14: customer adapter and expanded browser regressions verified locally/CI/publicly; OpenAPI/native review missing.
T15-T18/T20: partial implementation; live runtime and full intelligence acceptance missing.
T19: not complete; 30 mocked AI unit tests do not replace the required evaluation corpus.
T21: vision disabled.
T22-T26/T28: provisional admin services/UI, not complete or accepted.
T27: external integration acceptance incomplete. T29: self-service signup, MFA, setup, publication and QR locally/publicly verified; email verification and email recovery remain unconfigured.
T30-T35: incomplete. T36: automated public admin/order/KDS/receipt and distinct-role handoffs passed; real cafe operator/device acceptance remains.

## Verified Local Evidence

- `npm run test:unit`: 63 passed, 0 failed.
- `npm run test:integration`: 43 passed, 0 failed, actual local PostgreSQL.
- `npm run test:customer`: four journey contracts, four refinements and four native layer configurations passed, plus long scrolling, PDF, storage failures and catalog burst coalescing. See v21/v22 acceptance.
- `npm run test:customer:live`: passed against the real local API with PostgreSQL persistence.
- `node tests/e2e/admin-v18.cjs`: passed; notifications/policy/current-order links, waiter service-only transition and mobile screenshots at `output/admin-v18/d3365111e199/`.
- `node tests/e2e/onboarding-v19.cjs`: passed mobile/desktop with production MFA; final public smoke passed with its test outlet returned to draft. See `release-readiness.md` and the v19 PRD.
- GitHub CI `37342663796` passed every suite on deployed code `593a263`, including native customer layers and distinct-role onboarding/order smoke on Linux.
- Vercel production build: migrations applied and two published test merchants seeded on Neon; least-privilege runtime database role verified; deployment status Ready.
- Public customer smoke: QR exchange and session passed for Coffeenity Table 1; 62 products and production images loaded; cart persistence and BND 1.50 quote passed; no order was confirmed and browser console errors were empty.
- Integration scope: non-superuser application role, private-file boundary, QR/session/CSRF checks, tenant and same-table guest isolation, cart/order idempotency, exact manual settlement, scoped SSE/replay/revocation and transaction context reset.
- Baseline evidence: `output/playwright/baseline-1789921303234/report.json` (local ignored artifacts). Legacy 12 tests passed but contain unsafe assumptions; not production evidence.
- Browser contract suites now pass after fixing asynchronous Puppeteer executable resolution and deterministic capture handling.

## v20 Operations Evidence

- PRD and acceptance: `docs/PRD_v20_OPERATIONS_NOTIFICATIONS_AI.md`, `docs/UX_ACCEPTANCE_v20.md`.
- Migration 007 adds scoped notification read state, AI policy and a separate accounting ledger.
- Notification pagination/read/relogin/CSRF/audience isolation and role permissions pass real DB tests.
- Concurrent AI requests cannot over-admit the daily request cap; disabled AI never calls the provider or offers proposals. Manual ordering remains available.
- Accounting survives deleted memory, and retries of retired message IDs return 409 rather than spending again or crashing.
- Local production-policy distinct-role flow passed at 390/1440: `output/playwright/onboarding-1791208851378/`.
- Public distinct-role flow, notifications, AI pause and return-to-draft passed: `output/playwright/onboarding-1791209099079/`.
- Coffeenity owner login/default outlet/MFA guard/logout verified publicly. Existing owner preserved; new credentials remain private and out of Git/deployment files. One-time provisioning environment entries were removed after verification.
- Background push, live AI, email, gateway/vision, billing and operator/device/load/recovery acceptance remain unverified or unavailable. No zero-bug certification.

## v21 Customer Evidence

- Modal history/focus/layering, fixed CTA and scroll regions, short landscape shell clipping, visual viewport sizing, glass/contrast/reduced motion and bounded controls are verified by expanded customer tests.
- Malformed preferences/replay requests, clicked chat drafts, late profile responses, expired quotes, pre-mutation storage failure, acknowledged cleanup failure and an 80-event catalog burst have regression coverage.
- Final deterministic evidence: `C:/Users/Alpha/AppData/Local/Temp/aiodma-customer-v18-xEiQJs/`.
- Public full-role smoke: `output/playwright/onboarding-1791216130884/`; original Coffeenity 320/390/1440 read-only customer smoke: `output/playwright/coffeenity-customer-1791216743382/`.
- Coffeenity password/default outlet recognized; enrolled MFA must be supplied by the user. Original-owner full session was not automated on this release. See `release-readiness.md` for precise scope.

## v22 Native Layer Evidence

- Native-style grabbers, drag/snap/cancel/touch, transient feedback, persistent errors, pinned preferences, compact search/cart/send, theme-aware proposal contrast and keyboard/mode state are verified. Acceptance: `docs/UX_ACCEPTANCE_v22_NATIVE_SHEETS.md`.
- Final local customer evidence: `C:/Users/Alpha/AppData/Local/Temp/aiodma-customer-v18-3mxqEl/`; local admin: `output/admin-v18/acfd8a3fbbf0/`; local full-role MFA/order flow: `output/playwright/onboarding-1791218357469/`.
- Public full-role smoke: `output/playwright/onboarding-1791218795368/`; original Coffeenity 320/390/1440 non-ordering touch/visual smoke: `output/playwright/coffeenity-customer-1791218907903/`.
- Actual Safari/IME/VoiceOver/operator acceptance remains open. No zero-bug certification, live provider credential, external payment or guaranteed background push is claimed.

## External and Environment Constraints

- Runtime provider key/model and a separate staging target are not configured/verified. Production AI therefore uses bounded local degraded mode. Never put secrets in this tracker.
- Email delivery is unconfigured; signup emails are unverified and account recovery uses single-use MFA codes.
- Windows environment cannot establish native iOS device acceptance.
- Local disk remains constrained. Avoid browser downloads and large local image builds until space is expanded.
- Default `npm start` and `npm run dev` now use the v18 runtime. Legacy commands are retained only as explicit `start:legacy` and `dev:legacy` scripts.

Acceptance remains governed by the PRD/backlog, not this implementation summary. Missing mandatory evidence cannot be waived by local test success.
