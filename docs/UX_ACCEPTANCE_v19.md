# v19 Cafe Pilot UX Acceptance

Updated: 2026-10-05. This addendum records the requested navigation, comfort,
layering and end-to-end audit. It does not waive the remaining v18 production gates.

## Implemented Acceptance Criteria

- Staff navigation exposes only permitted modules; server authorization remains authoritative.
- Owner and guest cookies coexist in one browser. Customer requests explicitly select guest authority, including SSE. Neither guest logout nor opening a QR replaces the owner session. Legacy guest cookies remain readable without granting staff authority to the customer surface.
- The admin customer shortcut opens the QR module rather than an unusable tokenless guest page.
- Admin dialogs focus their first editable control, reset their scroll position, retain unsaved edits when closing is declined, and restore focus on cancellation. Saving blocks dialog dismissal/navigation until the mutation resolves.
- Admin refresh and navigation respect unsaved edits. Module filters and per-module scroll positions are retained within the session and cleared when leaving the outlet. Skip-to-content no longer changes the active module.
- Admin notifications are in document flow, not fixed over primary actions. Dialog errors appear inside the active layer.
- Staff operational updates arrive through tenant-scoped SSE. A refresh notice preserves the current form/filter instead of replacing its contents. Initial stream setup precedes the data snapshot; reconnects request a fresh snapshot. The new `latest` cursor skips historical events while honoring `Last-Event-ID` for subsequent replay.
- Customer Back/Forward restores screens and sheets. Escape and close controls dismiss the active layer. Background screens/header become inert during sheets, with keyboard focus contained and returned on dismissal.
- Header popups are mutually exclusive, dismiss outside/on Escape, and keep `aria-expanded` synchronized. Category tabs support arrow/Home/End keys without losing focus or horizontal visibility.
- Catalog scrolling is preserved when opening/closing a modifier or returning from another screen. Long modifier content scrolls inside its own panel and resets for the next item.
- A delayed quote cannot reopen checkout after the customer leaves. A completed cart mutation cannot dismiss a different, newly opened layer.
- Browser zoom is permitted. Narrow, portrait, landscape and desktop layouts retain the existing customer visual shell.
- Preferences, consent fields, table information and notifications use existing theme tokens. Dark-mode modal backgrounds, labels and destructive controls have regression checks.

## Verification

- `npm run test:unit`: 62 passing tests. Provider/planner tests remain explicitly mocked; they are not evidence of production AI quality.
- `npm run test:integration`: 40 passing PostgreSQL tests, including staff/guest cookie isolation, CSRF, restricted runtime/RLS, concurrent idempotency, payments, invitations, recovery and SSE isolation/replay/latest cursor.
- `npm run test:customer`: browser contracts at 320x740, 390x844, 844x390 and 1440x1000, plus a 36-item catalog and 24-option modifier scroll exercise. Contracts cover history/focus, delayed checkout cancellation, offline/uncertain requests, no duplicate submission, canonical quotes, unpaid receipts, AI proposal confirmation, consent and dark mode. These use fixture transport, not a live provider/database.
- `node tests/e2e/admin-v18.cjs`: real HTTP/PostgreSQL browser journey, same-browser owner/guest usage, unsaved-edit cancellation, focus return, in-flow feedback, operational update notices without filter loss, kitchen navigation, menu/modifiers, QR, waiter handling, manual settlement, KDS transitions and reports. Admin widths 320, 390 and 1440 are captured.
- `ONBOARDING_ORDER_SMOKE=1 node tests/e2e/onboarding-v19.cjs`: disposable tenants with production MFA policy, signup, publication, same-browser QR/cart, unpaid receipt, explicitly synthetic cash ledger, accepted/preparing/ready/served/completed, persisted guest status/report, unpublication/revocation, recovery-code login and recovery entry. No external payment is made.
- CI now runs customer, admin and onboarding journeys after unit/integration suites. Browser discovery supports installed Chrome, Puppeteer and Playwright.

Local screenshots and fixture databases are excluded from deployment. Production
verification is recorded separately in `release-readiness.md`; do not infer a
successful deployment from local tests alone.

## Remaining Release Gates

This is a supervised cafe pilot, not an unconditional full-production signoff.
Live model credentials and model evaluation, transactional email/verification,
load/soak, restore drills, broader adversarial permissions and native/device
acceptance remain open. Payment gateway and vision are disabled. Outlet switching
currently uses explicit sign-out/sign-in rather than a multi-outlet account picker.
No zero-bug, zero-crash or actual Safari/device certification is asserted.
