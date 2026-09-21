# v18 Architecture Decisions

Status: **DECIDED; implementation and verification tracked separately.** These decisions follow PRD v18 and the explicitly authorized Astra task. This bounded sidecar implements only the disposable baseline harness and evidence documents. The parent owns database, auth, migrations, dependency changes, and application integration. Their presence in a dirty working tree is not evidence that these decisions have passed a release gate.

## ADR-01: Modular Express Monolith

Keep Node/Express and split HTTP/configuration, identity/tenancy, catalog, pricing/cart, orders/payments, KDS, AI, and infrastructure by domain ownership. HTTP handlers validate inputs, obtain trusted principals, and invoke services; repositories receive explicit tenant scope. Legacy customer URLs and DTOs remain supported through adapters calling the same services. Serve only approved public assets.

Reason: preserve the customer experience and deployment simplicity while replacing unsafe boundaries incrementally. Tradeoff: module boundaries require review discipline; one process remains a shared failure domain. Verification required: route/DTO contracts, forbidden static paths, error handling, shutdown and container startup. Status: decision only in this document; legacy snapshot remains a monolithic `server.js`.

## ADR-02: PostgreSQL, node-postgres, SQL Migrations

Choose PostgreSQL as the source of truth and the real `pg` (node-postgres) driver with parameterized SQL. Use ordered, checked-in SQL migrations with an applied-version/checksum ledger and a database advisory lock around the migration runner. Execute each transactional migration atomically; explicitly isolate operations that cannot run in a transaction. Do not introduce a custom ORM. Pool connections are checked out for whole transactions and released in `finally` after commit or rollback.

Reason: order, price snapshots, reservations, idempotency, audit, and outbox must commit atomically. SQL makes constraints and tenant relationships reviewable. Tradeoff: developers own query evolution and migration compatibility. Use separate migration credentials and restricted application credentials; never run request traffic as migration owner. Versions and the lockfile are the parent implementation's responsibility, not invented here.

Verification required: fresh install, upgrade, repeat/no-op, checksum mismatch, concurrent migration attempts, rollback on failure, unique/FK constraints, and crash/restart persistence against real disposable PostgreSQL. A JSON legacy suite does not verify any of these.

## ADR-03: Money With decimal.js

Choose `decimal.js` for arithmetic, using decimal strings at boundaries instead of binary floating-point money operations. Preserve currency on every amount. Store posted amounts in integer minor units (with range checks and a lossless API representation) and immutable quote/order line snapshots. Define supported currency exponents and rounding policy explicitly; calculate percentages in decimal and round at the documented business boundary. Do not combine currencies in reports.

Reason: fractional BND and percentage calculations must survive JS/SQL/client round trips. Tradeoff: conversions and rounding policy become explicit responsibilities. Verification required: PRD FIN fixtures, BND 10.50 -> 1050 minor units, IDR fixture 49,500, boundary rounding, discount allocation, negative/overflow rejection, and Swift fractional-price contracts. Status: chosen, not established by legacy source assertions or this harness.

## ADR-04: Same-Origin Opaque Sessions and CSRF

Use database-backed opaque sessions for staff and guest/table ownership, delivered by same-origin cookies. Generate tokens with a standard cryptographic random API; store token hashes, expiry, revocation, and server-derived principal/tenant association. Use `HttpOnly`, `Secure` on HTTPS, `SameSite=Lax`, a host-only scope and `Path=/`; production can use a `__Host-` cookie name. A separate explicitly local HTTP configuration must not weaken production validation. Never accept the legacy shared PIN/token as ongoing authority.

Enforce synchronizer CSRF tokens tied to the session on unsafe methods, together with trusted Origin validation. SameSite alone is insufficient as the chosen protection. Protect login/session-establishing mutations too. Do not expose bearer session tokens to localStorage or URLs. Rotate sessions on authentication/privilege changes; logout/revoke/expiry must invalidate API and stream access. Membership and table-session permissions are server-side checks. Use maintained password/auth primitives, not custom crypto.

Reason: browser cookies and same-origin deployment simplify credential handling while server sessions support immediate revocation. Tradeoff: session storage, cleanup, rotation, and CSRF become required infrastructure. Verification required: missing/invalid CSRF, forged Origin, expired/revoked sessions, privilege changes, fixation, guest ownership and cross-tenant negative tests. The baseline does not implement this decision.

## ADR-05: RLS With a Restricted App Role

Use PostgreSQL row-level security as defense in depth, plus explicit tenant predicates and composite tenant foreign keys. The runtime app role must not own tenant tables and must not have superuser or `BYPASSRLS` privileges. Apply policies consistently and use `FORCE ROW LEVEL SECURITY` where appropriate. Establish trusted tenant context transaction-locally on the checked-out connection, including reads; deny access when scope is absent. Never derive this authority directly from a client header or query parameter.

Workers must establish scope too. Cross-tenant administrative operations require a separately authorized path and audit trail, not a general bypass role exposed to HTTP handlers. Reason: missed predicates and pooled connections must not cross tenant boundaries. Tradeoff: policies, migrations, and connection lifecycle need integration tests. Verification required: role privilege inspection, two-tenant forged IDs, absent context, transaction rollback, pool reuse, background jobs, and foreign-key isolation on real PostgreSQL. Status: decision; not verified by this sidecar.

## ADR-06: Durable Outbox and Scoped SSE

Write the business mutation, audit record, idempotency result, and outbox event in one database transaction. A worker claims events with a durable lease, attempts delivery, and records acknowledgement, retry/backoff, bounded attempts, dead-letter state, and authorized replay. Use stable event IDs and consumer deduplication; delivery is at least once. A crash after delivery and before acknowledgement must be expected.

SSE is a transport, not the source of truth. Authorize tenant and audience/session on subscription and delivery, recheck revocation, bound queues, and support event resume or canonical snapshot reconciliation. Webhook delivery status follows actual attempts; network delivery is not claimed to be exactly once.

Reason: a process-local Map and shared broadcast set cannot provide durable retry or tenant isolation. Tradeoff: worker operations and duplicate handling are necessary. Verification required: crash windows, two workers, stale leases, retry exhaustion/replay, unauthorized subscriptions, reconnect gaps, and same event delivered twice without a duplicate order/payment.

## ADR-07: Provider Boundary, Compatibility and Rollout

Keep provider credentials, model configuration, tool authorization and orchestration on the server. Provider adapters report actual model/usage provenance; disabled/degraded capabilities must be explicit. Tools invoke the same domain services as manual flows. Do not choose an unverified model ID based on strings in legacy tests. Live provider evaluation remains a separate gate requiring working credentials.

Preserve customer presentation through contract adapters; replace unsafe behavior rather than treating it as compatibility. Import JSON privately with a dry run, checksums, validation exceptions, and count/amount reconciliation. Use expand -> migrate -> switch -> contract, with a write freeze for the final cutover. Once new transactions exist in PostgreSQL, rollback must preserve that source of truth; returning to stale JSON is not an acceptable rollback. Keep optional integrations disabled until verified.

Tradeoff: adapters and phased rollout temporarily increase coordination work. Verification required: before/after browser evidence, canonical cart/quote/payment behavior, migration reconciliation, rollback rehearsal, J1-J5, live AI eval, and public smoke only when deployment is authorized. None is inferred from creating this ADR.

## Gate Ownership

T02 has concrete choices and acceptance criteria. Acceptance of installed versions, runtime integration and operational proof belongs to the parent implementation and subsequent G1-G6 evidence. See [baseline](baseline.md) for what this sidecar actually ran. No production, staging, live-provider, RLS, authentication, or durable-outbox implementation claim is made by this document.
