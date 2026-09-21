# Release Readiness

Verdict: **LOCAL_CANDIDATE_ONLY**. Updated 2026-09-21.

G6 publication is now authorized by the owner, but production promotion is still blocked by missing hosted PostgreSQL configuration, runtime secrets and staging evidence. No public deployment has been completed yet.

Local v18 evidence: 61 unit tests and 34 PostgreSQL integration tests passed. Customer contract browser tests passed at 390x844 and 1440x1000, the real local API customer journey passed with PostgreSQL persistence, and the admin browser journey passed. Static exposure and CSP boundaries are covered by integration tests. These results do not establish live AI intelligence or production reliability.

Blocking production work includes full mandatory feature acceptance, live AI and 240-case evaluations, expanded permission/adversarial coverage, container execution, migration/recovery/load/soak exercises and HTTPS staging acceptance. Gateway and vision remain disabled. The default `npm start` now uses the v18 runtime; the legacy runtime is explicit as `npm run start:legacy`.

See [implementation tracker](docs/IMPLEMENTATION_TRACKER_v18.md) and [execution backlog](docs/EXECUTION_BACKLOG_v18.md) for scope and evidence gaps. No zero-bug guarantee is made.
