# Release Readiness

Verdict: **SELF-SERVICE CAFE PILOT LIVE VERIFIED, NOT FULL PRODUCTION ACCEPTED**. Updated 2026-10-05.

Current operations release `d09e83ba40293ad8bcc5c6f4b9c563731a2863d5` is deployed with owner authorization at `https://nativeaiodma-v18.vercel.app`. Vercel reports deployment `dpl_BmZ9NqTkMm67mpRDQixFUYV9mGX8` as Ready; immutable URL: `https://nativeaiodma-v18-qf2afx90b-alphas-projects-9d57a19f.vercel.app`. Connected Neon PostgreSQL, restricted runtime and migration `007_operations.sql` are in use. Secrets, local databases and screenshots remain excluded by `.vercelignore`.

## v21 Customer Refinement Local Verification

The customer refinement is locally verified; the live deployment metadata above still describes v20 until v21 promotion is recorded. See `docs/PRD_v21_CUSTOMER_REFINEMENT.md`, `docs/UX_ACCEPTANCE_v21.md` and `docs/SECURITY_REVIEW_v21_CUSTOMER.md`.

- 63 unit and 43 real PostgreSQL integration tests passed. Customer contracts/refinements passed all eight viewport configurations, long scrolling, receipt PDF generation, reduced-motion/reduced-height checks and storage/catalog-event boundaries. Final fixture evidence: `C:/Users/Alpha/AppData/Local/Temp/aiodma-customer-v18-xEiQJs/`.
- Actual local customer API persisted exactly one unpaid order. Real admin evidence: `output/admin-v18/df51259e92d0/`; production-MFA distinct-role onboarding/order evidence: `output/playwright/onboarding-1791215292773/` (390/1440).
- Local browser evidence is not real iOS/IME/operator acceptance or a vulnerability-free guarantee. Full production gates below remain open.

## v20 Operations Verification

- 63 unit and 43 restricted-runtime PostgreSQL integration tests passed. Existing customer contract tests passed at 320x740, 390x844, 844x390 and 1440x1000 plus long catalog/modifier scrolling.
- Real admin browser tests passed current-order inbox links, persistent reads, AI policy save, owner/waiter/kitchen navigation and permissions, manual settlement and screenshots without mobile overflow or browser exceptions. Local evidence: `output/admin-v18/d3365111e199/`.
- Distinct invited cashier, kitchen and waiter accounts passed the full flow: guest unpaid receipt -> cashier synthetic settlement -> kitchen accepted/preparing/ready -> waiter served -> owner completed. Inbox acknowledgement, AI pause and permission guards also passed. Local production-MFA evidence: `output/playwright/onboarding-1791208851378/` (390/1440).
- The same flow passed on the public alias at 390px in a disposable smoke tenant: `output/playwright/onboarding-1791209099079/`. No external funds or real Coffeenity orders were touched. The smoke outlet was returned to draft and guest sessions revoked.
- New Coffeenity owner access passed actual public login, automatic default outlet, mandatory MFA guard and logout: `output/coffeenity-login-live/mfa-gate-mobile.png`. Existing accounts were preserved. The user's authenticator has not been enrolled by automation; the user must enroll it on first login. The three one-time provisioning environment entries were removed after verification. Passwords are not included in tracked documentation.
- Notifications are in-app, persisted from scoped committed events, not guaranteed background push. AI controls cap admitted daily requests (UTC), not an invented bill or hard provider token budget. Actual reported tokens are shown with completeness; accounting survives conversation deletion. Live model credentials, email, gateway, billing and full production gates below remain open.
- GitHub CI passed every suite on the deployed code: https://github.com/baristaahmadmuhtar-creator/nativeaiodma/actions/runs/37321696500.

## Previous v19 Evidence

Previous UX release `0a64d8e095fd475c5e6621558854fa0a4fb0ce61` deployed at production deployment `dpl_62ypu1VejXNu34uEvTV5XpoHo7zF`. The following records describe that earlier release, not the latest code.

Local evidence: 62 unit tests and 40 PostgreSQL integration tests passed. Customer contracts passed at 320x740, 390x844, 844x390 and 1440x1000, including long catalog/modifier scrolling. Real admin and self-service onboarding/order journeys passed with PostgreSQL persistence, shared-browser sessions and production MFA policy. Static exposure and CSP boundaries are covered by integration tests. GitHub CI passed every suite on the deployed code commit: https://github.com/baristaahmadmuhtar-creator/nativeaiodma/actions/runs/37308218969. An earlier CI timeout during knowledge-form submission prompted deterministic initial focus and native form-validity assertions before this successful run.

New public paths: `/register`, `/admin.html`, and `/recover`. Signup atomically creates an owner, draft outlet, default membership, tables, audit and login session. Owner access still requires MFA in production. Publication requires available menu items and active tables; withdrawing publication revokes customer sessions. Recovery consumes one MFA recovery code and revokes all account sessions.

Current public browser smoke passed registration, MFA enrollment/verification, draft readiness, menu creation, publication, and QR exchange in both a separate customer browser and the same browser as the owner. A disposable AIODMA Smoke Test outlet exercised an unpaid BND 3.50 receipt, explicitly synthetic manual cash ledger, accepted/preparing/ready/served/completed, persisted paid/completed guest status and the report. No external payment or real cafe funds were involved. Unpublication revoked guest sessions and returned the smoke outlet to draft. Login without an outlet ID using a recovery code and the recovery entry passed; browser exceptions were empty. Evidence is local at `output/playwright/onboarding-1791202580315/`. Public mobile screenshots and primary-button hover contrast were verified.

An earlier public browser smoke passed QR exchange, guest session, the 62-item Coffeenity catalog, production image and stylesheet delivery, table-bound labels, persisted cart and a canonical BND 1.50 quote. That original-cafe quote was deliberately not confirmed. The current order/settlement exercise above used only a separate disposable tenant.

The production environment has no live model-provider credential, so conversational AI currently uses bounded local degraded mode. No transactional-email provider is configured: signup email addresses are unverified, invitations are shared directly, and password recovery uses MFA recovery codes. Environment names were rechecked on 2026-10-05 without reading or exposing values. Full production acceptance still requires email verification/delivery, live AI and 240-case evaluations, expanded permission/adversarial coverage, container execution, recovery/load/soak exercises and real-device/operator acceptance. Gateway and vision remain disabled. The deployment is suitable for a supervised cafe MVP pilot; G5 acceptance remains partial.

See [implementation tracker](docs/IMPLEMENTATION_TRACKER_v18.md) and [execution backlog](docs/EXECUTION_BACKLOG_v18.md) for scope and evidence gaps. No zero-bug guarantee is made.

## v19 UX Verification

The navigation/layering release has 62 passing unit tests and 40 passing PostgreSQL integration tests. Customer browser coverage is expanded to 320x740, 390x844, 844x390 and 1440x1000, including a long catalog/modifier scroll exercise and late-quote cancellation. Real admin evidence is at `output/admin-v18/19b248fb5778/`; the suite verifies shared-browser owner/guest sessions, role-aware kitchen navigation, operational SSE notices without filter loss, unsaved edits, deterministic focus, primary hover contrast and manual payments/KDS/reports. Full local production-policy onboarding/order evidence is at `output/playwright/onboarding-1791202390147/`. Public deployment verification is recorded above. See [UX acceptance](docs/UX_ACCEPTANCE_v19.md).
