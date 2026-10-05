# v21 Scoped Customer Security Review

Date: 2026-10-06. Scope: customer adapter, served HTML/stylesheet and existing API protections exercised by automated regressions. This is a targeted review, not an independent penetration test or a complete dependency/supply-chain audit.

## Fixed Findings
1. Medium, defense in depth: local durable request data previously supplied an arbitrary replay path/method. `public/js/customer-v18.js:39` now allowlists only cart, order, waiter and proposal-confirmation paths and validates their bounded bodies/keys, including null cart lines. Existing server role/CSRF/tenant validation already prevented using a guest as an admin; no demonstrated privilege escalation is claimed.
2. Low, availability: malformed stored language could throw during boot. `public/js/customer-v18.js:466` normalizes non-string preferences; theme and pending input are similarly treated as untrusted. Browser regressions cover malformed preference objects, invalid pending destinations and null nested lines.
3. Low, URL/privacy hardening: `public/js/customer-v18.js:203` permits asset paths and explicit external HTTPS images only, rejects URL credentials and supplies `no-referrer`. Missing images do not turn into document/undefined requests on HTTPS. QR bearer text is removed from navigation history; it is not persisted as a browser auth token.

## Preserved Boundaries
- DOM rendering uses created nodes/textContent, not untrusted HTML, inline event handlers or eval. Browser fixtures render hostile menu/chat text without creating injected nodes.
- Session authority stays in HttpOnly, production Secure, SameSite Strict cookies (`src/modules/identity.js:92`). The client stores non-auth request data and a hash-scoped namespace, not cookie credentials or provider keys.
- Mutations recheck the guest session and include CSRF plus durable idempotency. `public/js/customer-v18.js:92` requires storage before submission; acknowledged cleanup failure retains only the already-used key for safe reconciliation.
- Quotes and settlement remain server-authoritative. Tests reject forged paid status, unconfigured gateway selection, foreign tenants/same-table guests, duplicate submission and unauthorized transitions.
- Restrictive CSP/static asset exposure remains unchanged (`src/server/app.js:37`). No weakening to unsafe-inline scripts, unsafe-eval, permissive CORS or bypassed RLS was introduced.

## Residual Risk
Same-origin XSS or a compromised browser remains able to read local non-auth ordering data; storage validation does not replace CSP or server authorization. External HTTPS images contact the configured host. This review does not certify zero vulnerabilities, verified signup emails, live AI behavior, real payment gateways, physical devices or recovery/load readiness. See the release ledger for actual test/deployment results.
