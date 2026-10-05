# Release Readiness

Verdict: **SELF-SERVICE CAFE PILOT LIVE VERIFIED, NOT FULL PRODUCTION ACCEPTED**. Updated 2026-10-05.

The owner authorized publication. Candidate `de9457bfd3ec55255afb94e20da4bf71f3ed52ba` is deployed to Vercel at `https://nativeaiodma-v18.vercel.app` with connected Neon PostgreSQL, a least-privilege runtime role and applied migrations including `006_self_service.sql`. Vercel reported production deployment `dpl_GHwJUVtiTZNndxigHy1M17Yatefn` as Ready. The deployment now explicitly excludes local databases, credentials, environment files and browser evidence through `.vercelignore`.

Local evidence: 62 unit tests and 38 PostgreSQL integration tests passed. Customer contract browser tests passed at 390x844 and 1440x1000, the real local API customer journey passed with PostgreSQL persistence, and the admin browser journey passed. Self-service onboarding passed at 390 and 1440 pixels with production MFA enabled. Static exposure and CSP boundaries are covered by integration tests. GitHub CI passed on the deployed commit: https://github.com/baristaahmadmuhtar-creator/nativeaiodma/actions/runs/37302515251.

New public paths: `/register`, `/admin.html`, and `/recover`. Signup atomically creates an owner, draft outlet, default membership, tables, audit and login session. Owner access still requires MFA in production. Publication requires available menu items and active tables; withdrawing publication revokes customer sessions. Recovery consumes one MFA recovery code and revokes all account sessions.

Final public browser smoke passed registration, MFA enrollment/verification, draft readiness, menu creation, publication, QR exchange in a separate customer browser, unpublication, and login without an outlet ID using a recovery code. No order or payment was created. The smoke outlet was returned to draft; browser exceptions were empty. Evidence is local at `output/playwright/onboarding-1791199394657/`. Mobile setup actions were visually checked after replacing the clipped table with responsive rows.

The post-deploy public browser smoke passed for QR exchange, guest session, the 62-item Coffeenity catalog, production image and stylesheet delivery, table-bound labels, persisted cart and canonical BND quote. The checked quote was BND 1.50 and was deliberately not confirmed, so no test order was submitted. Browser console errors were empty.

The production environment has no live model-provider credential, so conversational AI currently uses bounded local degraded mode. No transactional-email provider is configured: signup email addresses are unverified, invitations are shared directly, and password recovery uses MFA recovery codes. Full production acceptance still requires email verification/delivery, live AI and 240-case evaluations, expanded permission/adversarial coverage, container execution, recovery/load/soak exercises and complete public order/KDS/receipt acceptance. Gateway and vision remain disabled. The deployment is suitable for a supervised cafe MVP pilot; G5 acceptance remains partial.

See [implementation tracker](docs/IMPLEMENTATION_TRACKER_v18.md) and [execution backlog](docs/EXECUTION_BACKLOG_v18.md) for scope and evidence gaps. No zero-bug guarantee is made.
