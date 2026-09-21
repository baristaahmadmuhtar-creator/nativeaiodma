# Legacy Baseline and G0 Evidence

Recorded 21 September 2026 (Asia/Brunei). Baseline commit: `d8884b195f3a6144191568a2e1513916d314c4c3`. Read [PRD v18](../PRD_v18_PRODUCTION_MVP.md) and [execution backlog](../EXECUTION_BACKLOG_v18.md). This report concerns the tracked legacy snapshot, not the parent's concurrently developed v18 modules.

**G0: PARTIAL.** T00 inventory and T02 decisions are documented; T01 has actual legacy-suite and customer-screen evidence, but J1-J5 are not verified end-to-end. No staging, production, live AI, PostgreSQL/RLS, or new authentication claim follows from this baseline.

## Final Reproducible Entry Point

Run `node scripts/capture-baseline.cjs`. Default `BASELINE_REF` is the exact commit above; overriding it intentionally changes the snapshot under test. `BASELINE_BROWSER` can select an existing executable. `BASELINE_TESTS_ONLY=1` explicitly skips browser work and records that fact. There is no browser install/download step.

The harness copies tracked application source, test files, data JSON, CSS/JS, assets, root images/QRs and package metadata from Git into a new OS temp directory. It uses the workspace's installed `node_modules` through `NODE_PATH` and `createRequire`; no dependency directory is copied or linked. Identical asset files share hard links only with other files inside that new temp directory. Data JSON is a separate regular file, never a link to the original. Snapshot file hashes, not JSON contents, are recorded.

Port 8080 is mandatory because legacy tests hardcode it. Before launch, the harness probes IPv4/IPv6 availability; an occupied port is a blocker and its owner is not stopped. A disposable preload forces the unchanged legacy server to bind `127.0.0.1:8080`. Readiness comes from that child's IPC listener acknowledgement, avoiding requests to another process during a startup race. The server, each legacy suite, and browser use the disposable application; suite mutations share one disposable DB in the original runner's sequence. Each suite has the runner's 30-second timeout. Screenshots precede test mutations.

The preload rejects external Node socket/fetch requests; browser requests permit the local origin and external HTTPS images/fonts/stylesheets only. No responses, provider answers, orders, or payments are mocked by the harness. Legacy application fallback/simulation remains observable legacy behavior, not live-provider verification. This is a guard for inspected legacy code, not an OS security sandbox for arbitrary untrusted programs. External asset availability may vary.

Only allowlisted environment variables reach server/tests. Raw test/server logs are discarded; structured evidence includes exit codes, safe numeric counts/check IDs, source-literal failure labels and limited error classes. JSON contents, credentials, provider request URLs and dynamic error payloads are not printed or retained. Customer screenshots show public menu/UI states, not admin configuration.

The `finally` cleanup stops owned test/server/browser processes and removes only the newly created, resolved `aiodma-baseline-*` direct child of the OS temp directory. It verifies the workspace `data/db.json` checksum is unchanged. Interrupted/failed runs also report cleanup status where the process can execute `finally`; an OS kill or power loss cannot guarantee JavaScript cleanup. No existing cache or user directory is deleted.

## Latest Evidence

Authoritative full run: [report.json](../../output/playwright/baseline-1789921303234/report.json), 2026-09-20 16:21:43Z to 16:22:14Z (21 September local). Harness exit code **0**. Node `v24.12.0`, Puppeteer `25.11.0`, installed Chrome `153.0.8010.37`, Windows. The report contains the working-tree status at execution, baseline/source hashes and installed browser/runtime versions. The tree was dirty with parent-owned `.gitignore`, package/lockfile, DB, source and test additions; those changes were not part of the Git snapshot.

All 12 original runner suites executed in order and returned exit code 0:

| Suite | Recorded result |
|---|---|
| `e2e_qe_audit.js` | Exit 0; reported 25 passed, 0 failed |
| `verify_zero_simulation_production.js` | Exit 0 |
| `verify_multi_tenant_coffeenity.js` | Exit 0 |
| `simulation_e2e_deep.js` | Exit 0; reported 16 passed, 0 failed |
| `verify_all_11_admin_modules.js` | Exit 0 |
| `verify_menu_modifiers_admin.js` | Exit 0; reported 15 passed, 0 failed |
| `verify_ai_sommelier_and_a11y.js` | Exit 0 |
| `verify_menu_card_recommendations.js` | Exit 0 |
| `verify_apple_dark_mode.js` | Exit 0 |
| `test_user_experience_flow.js` | Exit 0; reported 20 passed, 0 failed |
| `verify_enterprise_rag_and_cors.js` | Exit 0 |
| `verify_frontend_logic_cors_and_memory.js` | Exit 0 |

These are legacy results, not v18 acceptance. Counts are supplied only where parsed unambiguously; a missing count is unknown. The suites were invoked individually, using the unchanged master runner's file list and order, to avoid its raw failure logging and overbroad production-success banner.

Final checks: original data unchanged **true**; owned server stopped **true**; temp removed **true**; cleanup errors **none**. Logical snapshot size 20,214,908 bytes; deduplicated file payload 12,851,205 bytes (filesystem/profile overhead additional). Screenshots are small JPEGs at quality 65 and device scale 1, not lossless pixel-diff goldens. The script checks available disk space and retains a 12 MiB reserve before screenshot writes, with a 16 MiB snapshot allocation cap. Disk checks are best effort and do not reserve space against other processes.

Final full-run artifacts total **795,771 bytes**. A separate [occupied-port check](../../output/playwright/baseline-1789921544722/report.json) returned `BLOCKED_PORT_8080_IN_USE`, with zero suites/captures, no snapshot/server created, and the independently owned probe listener still running until the probe itself closed it. This validates the final explicit-loopback preflight. An earlier wildcard-only probe (`baseline-1789921356876`) reached a server-readiness timeout on Windows, ran no tests, and cleaned up; adding the exact `127.0.0.1` availability check corrected that harness limitation. The final script also passed `node --check`.

## Customer Screens

URL: `/?merchant=coffeenity&table=5`; language chosen through the existing Indonesian language control. Light/dark changes use the existing UI. Fresh browser contexts prevent cart/history carryover. States are reached through visible controls observed in `index.html` and `js/app.js`, without calling internal application state setters.

| Viewport | Light | Dark |
|---|---|---|
| 390 x 844 | language, chat, menu, modifier, cart | language, chat, menu, modifier, cart |
| 1440 x 1000 | language, chat, menu, modifier, cart | language, chat, menu, modifier, cart |

All **20 screenshots** are in `output/playwright/baseline-1789921303234/`, named `{width}-{theme}-{state}.jpg`. Each screenshot has adjacent report evidence for active screen/dialog, theme, menu element count, image loading, overflow and browser errors. All four contexts recorded zero page errors and no body-width overflow. This does not prove every element is legible, all offscreen lazy images loaded, or accessibility conformance.

Representative evidence: [mobile dark cart](../../output/playwright/baseline-1789921303234/390-dark-cart.jpg), [desktop light menu](../../output/playwright/baseline-1789921303234/1440-light-menu.jpg), [desktop dark cart](../../output/playwright/baseline-1789921303234/1440-dark-cart.jpg).

Visual findings reproduced in the preceding complete same-commit capture and retained in the final screenshots: the Coffeenity URL renders 36 local catalog cards with IDR-scale values formatted with a dollar sign, e.g. `$28000.00`; dark cart item names and totals have visibly poor contrast. Source inspection explains the catalog mismatch: `server.js:610` returns a raw array when `?merchant=` is supplied, while `js/app.js:4867` expects `data.success` and `data.data`, leaving the local catalog in place. This is a baseline defect, not an approved appearance or canonical price. Cart captures also include the application's transient add toast; no toast was fabricated or masked.

Chat captures show the empty conversation screen only. No live conversation, quote, checkout, settlement, tracker, receipt, offline recovery or new guest invitation is exercised by these screenshots.

## Assertions to Replace or Reclassify

| Existing evidence | Classification and required replacement |
|---|---|
| `verify_zero_simulation_production.js:135`, `verify_multi_tenant_coffeenity.js:200` expect digital orders immediately `PAID` | Unsafe regression expectation. Require cashier-authorized settlement or verified gateway evidence; forged client status must fail. |
| Shared default token accepted in `verify_zero_simulation_production.js:111` and audit login | Demonstrates legacy behavior only; does not prove individual identity, expiry, revocation or tenant RBAC. |
| QR checks at `verify_zero_simulation_production.js:88`, `verify_all_11_admin_modules.js:107` inspect SVG markup | Structural smoke only. Decode QR payload and verify exchange/revocation; markup does not prove scannability or secure table ownership. |
| `verify_all_11_admin_modules.js:189` accepts any ping status from 200 through 599 | False-positive connectivity assertion. Distinguish successful provider response, disabled, rejected credentials, timeout and actual usage. |
| Model/source strings in `verify_ai_sommelier_and_a11y.js:46` onward | Neither model availability nor intelligence evidence. Use configured live-provider smoke and behavioral evaluation. |
| Role/ARIA strings and focus helper existence in `verify_ai_sommelier_and_a11y.js:96` onward | Static hints only. Require keyboard/focus behavior, contrast and accessibility audits. Dark cart screenshot demonstrates the gap. |
| CSS substring tests in `test_user_experience_flow.js:102` onward | Unscoped matching can succeed on unrelated rules; cannot prove computed styling or ergonomic targets. Use DOM/computed-style and interaction checks. |
| `test_user_experience_flow.js:140` checks absence of `menuItemChangeLang` | Stale selector: real ID is `menuItemChangeLanguage`. A pass does not prove the language action was removed. |
| Exact catalog counts, response numeric types and SVG/static HTTP 200 checks | Useful fixture/contract smoke within their narrow scope, not tenant isolation, finance reconciliation, QR validity, or production readiness. |
| `e2e_qe_audit.js:418` checks adversarial reply contains a phrase | Does not assert absence of forbidden side effects or leaks. Verify tool authorization and persisted state under adversarial prompts. |

Retain and strengthen meaningful behavior checks such as unauthenticated mutation rejection, malformed JSON/empty-cart rejection, server-calculated totals, cashier transition and KDS updates. They remain narrow legacy observations until rerun against the actual v18 services and negative-path invariants.

## Inventory and Gap Register

Legacy runtime: one Express server with 54 explicit GET/POST/PUT/PATCH/DELETE registrations, JSON persistence, process-local idempotency and SSE. Routes cover merchant/health/menu, table QR, orders, waiter calls, admin login/orders/payment/KDS/menu/promos/credits/staff/keys/webhook/audit/config, customer memory and AI. Customer assets are `index.html`, `js/app.js`, `css/styles.css`, `sw.js`, manifest and product images; admin is separate HTML/JS/CSS. Swift exists but was not built. Baseline dependencies are Express, CORS, body-parser, Puppeteer and qrcode; versions used at runtime come from the current installed workspace, not a baseline lockfile installation.

All gaps remain **OPEN in this legacy snapshot**. References are baseline line numbers, not moving parent-source references.

| PRD gap | Source evidence and implication |
|---|---|
| GAP-01 | `server.js:146`, `js/admin.js:getAdminToken`: shared default admin authority |
| GAP-02 | `server.js:298`: merchant inference/default is not trusted principal scope |
| GAP-03 | `server.js:456`: global broadcast/SSE audience needs isolation |
| GAP-04 | `server.js:707`: canonical items/modifiers and server quote needed |
| GAP-05 | Order creation/payment handlers: client-driven payment truth must be replaced |
| GAP-06 | `server.js:282`, `:496`: JSON debounce and Map are not durable transactions |
| GAP-07 | `server.js:2635`, Dockerfile/nginx: repository static exposure and runtime deployment boundary |
| GAP-08 | `js/app.js:2291` and provider paths: browser credentials/orchestration must move server-side |
| GAP-09 | `server.js:1993`: model/key selection and simulated fallback provenance |
| GAP-10 | `server.js:1837`: customer profile ownership/consent/tenant boundary |
| GAP-11 | `js/app.js:2481`: browser tool execution and optimistic waiter outcome |
| GAP-12 | `server.js:631`: predictable table credential and QR validity requirements |
| GAP-13 | `server.js:1571`: webhook test success does not prove delivery |
| GAP-14 | Legacy tests above: broad production claims exceed assertion coverage |
| GAP-15 | `js/app.js:saveChatSession`, `restoreChatSession`: shared storage/history rendering |
| GAP-16 | Baseline `.gitignore`, README/package: lockfile/reproducibility and documentation drift |
| GAP-17 | Swift `NetworkService.swift:mapMenuItems`: decimal-to-Int conversion risk; native build unverified |

## Journey and Gate Status

| Journey | What ran | Remaining evidence |
|---|---|---|
| J1 | Language -> chat -> menu -> modifier -> cart; separate legacy API tests | Real QR/session -> canonical quote -> order/payment -> KDS -> served -> receipt in one browser journey |
| J2 | Empty chat UI; legacy source/API assertions | Grounded multi-turn recommendation, consent and canonical cart with live provider |
| J3 | Not run | Invitation/onboarding -> published tenant -> valid QR -> first order |
| J4 | Legacy in-process idempotency checks only | Offline/unknown response, lookup/reconciliation, restart/two-instance durability |
| J5 | External provider network intentionally blocked during legacy API tests | User-visible timeout/degraded mode, manual checkout and actual staff handoff end-to-end |

All five journeys are `NOT_VERIFIED_END_TO_END`. G0 completion still requires the missing journey baseline evidence and owner review of known gaps. [ADRs](decisions-v18.md) contain decisions and required tests; they do not claim the parent's new foundation is implemented or verified.

## Earlier Attempts and Ownership

Earlier evidence is retained, not relabeled: `baseline-1789871404774` stopped at the original 8 MiB snapshot cap; `baseline-1789871487815` captured 17/20 images before the low-disk reserve blocked the final desktop-dark states. `baseline-1789871563192` is a tests-only run. `baseline-1789921156670` captured all 20 images after disk space was restored; `baseline-1789921273562` isolated failed audit check `TC-24` (24 pass, 1 fail). Its missing root QR image was a harness copy-list omission, not a legacy application defect. Adding tracked root images resolved it; the authoritative full run above is 12/12 exit zero. No prohibited cache deletion or browser installation was used.

Owned files: `scripts/capture-baseline.cjs`, this document, `docs/architecture/decisions-v18.md`, and generated artifacts under `output/playwright/`. No server, package, customer, parent DB/auth module, or existing test was edited. Generated evidence may be ignored by the parent's current `.gitignore`; it remains available locally at the linked paths and is not claimed to be committed.
