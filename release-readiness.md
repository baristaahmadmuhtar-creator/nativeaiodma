# Release Readiness

Verdict: **CONTROLLED CAFE PILOT READY, NOT FULL PRODUCTION ACCEPTED**. Updated 2026-09-21.

The owner authorized publication. Candidate `18b5fd9dde8e79d2b8f6150917b8e5a063f709d9` is deployed to Vercel at `https://nativeaiodma-v18.vercel.app` with a connected Neon PostgreSQL database, a least-privilege runtime role, applied migrations and two published test merchants. Vercel reported production deployment `dpl_E4jMLcWxRkquF681svvmhJ4BJaHa` as Ready.

Local v18 evidence: 62 unit tests and 34 PostgreSQL integration tests passed. Customer contract browser tests passed at 390x844 and 1440x1000, the real local API customer journey passed with PostgreSQL persistence, and the admin browser journey passed. Static exposure and CSP boundaries are covered by integration tests.

The post-deploy public browser smoke passed for QR exchange, guest session, the 62-item Coffeenity catalog, production image and stylesheet delivery, table-bound labels, persisted cart and canonical BND quote. The checked quote was BND 1.50 and was deliberately not confirmed, so no test order was submitted. Browser console errors were empty.

The production environment has no live model-provider credential, so conversational AI currently uses the bounded local degraded mode and must not be described as live-model intelligence. Full production acceptance still requires live AI and 240-case evaluations, expanded permission/adversarial coverage, container execution, recovery/load/soak exercises and complete public admin/order/KDS/receipt acceptance. Gateway and vision remain disabled. The deployment is suitable for a supervised cafe MVP pilot, not an assertion of zero bugs or completed G5 acceptance.

See [implementation tracker](docs/IMPLEMENTATION_TRACKER_v18.md) and [execution backlog](docs/EXECUTION_BACKLOG_v18.md) for scope and evidence gaps. No zero-bug guarantee is made.
