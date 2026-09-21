# Release Readiness

Verdict: **PUBLIC_TESTING_DEPLOYED, NOT_PRODUCTION_ACCEPTED**. Updated 2026-09-21.

The owner authorized publication. The v18 candidate is deployed to Vercel at `https://nativeaiodma-v18.vercel.app` with a connected Neon PostgreSQL database, runtime secrets, applied migrations and two published test merchants. Vercel reported deployment `dpl_GQhX7MCCX8yXrET7RK8BwDFZ8YL7` as Ready.

Local v18 evidence: 61 unit tests and 34 PostgreSQL integration tests passed. Customer contract browser tests passed at 390x844 and 1440x1000, the real local API customer journey passed with PostgreSQL persistence, and the admin browser journey passed. Static exposure and CSP boundaries are covered by integration tests. These results do not establish live AI intelligence or production reliability.

Blocking production acceptance work includes full mandatory feature acceptance, live AI and 240-case evaluations, expanded permission/adversarial coverage, container execution, recovery/load/soak exercises and complete public journey acceptance. Gateway and vision remain disabled. The public deployment is suitable for controlled MVP testing, not an assertion of zero bugs or completed G5 acceptance.

See [implementation tracker](docs/IMPLEMENTATION_TRACKER_v18.md) and [execution backlog](docs/EXECUTION_BACKLOG_v18.md) for scope and evidence gaps. No zero-bug guarantee is made.
