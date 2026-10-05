# v21 Customer UX Acceptance

Scope: the production customer adapter and its scoped stylesheet; existing identity, photography, financial authority and admin composition are preserved.

## Implemented Contracts
- Payment back returns to cart; modal dismissals consume one history entry. Rapid close cannot skip layers. Background is inert and focus is trapped/restored; popup menus also support arrow keys and Escape.
- Cart/payment/tracker have separate scroll content and a reachable close control. Checkout actions remain outside the scroll region. Modifier header and options share a scroll region, with quantity/add controls pinned.
- Fixed shell containers use clipping rather than hidden programmatic scroll, preventing focus from moving the header off-screen in short landscape. Header controls remain at least 44px. Chat draft/composer cannot push action icons outside the screen.
- Visual-viewport sizing accommodates browser/keyboard height changes without disabling native pinch zoom. Safe areas, light/dark contrast, restrained glass, solid-glass fallback and reduced-motion behavior are supported.
- Server quote expiry and invalidation expose a fresh review action. Payment options reflect outlet configuration. Stock, same-variant quantity limits and available modifiers disable invalid controls. Clear cart remains an actual durable action.
- Late quote/profile responses cannot reopen or overwrite a dismissed layer. History-forward memory reloads the current profile. Chat captures the clicked message, preserves later draft edits and restores an unsent draft on failure.
- Invalid stored preferences/pending requests cannot crash startup or replay arbitrary API endpoints. Required pre-mutation persistence fails closed; post-commit storage cleanup cannot misreport an accepted order as failed.
- Replayed catalog-event bursts are coalesced rather than queueing a menu read for every event; reconnect/recovery refreshes the current catalog. Order reads check session ownership and cannot overwrite a newly accepted order with an older in-flight result.
- Receipt print mode releases fixed/overflow constraints and hides unrelated chrome/buttons. PDF generation is exercised by browser contracts.

## Evidence
Browser contracts cover 320x740, 390x844, 844x390 and 1440x1000; additional refinement covers 320x568 (reduced motion), 390x844, 844x320 and 1440x1000 plus simulated reduced viewport height, long text and long catalog/modifier scrolling. Bounds and hit testing check controls are on-screen and unoccluded. The deterministic fixture uses an intercepted HTTPS origin; it is not TLS, live AI or database evidence.

Separate suites exercise actual local PostgreSQL customer submission (exactly one unpaid order), admin workflow, and production-MFA onboarding with distinct cashier/kitchen/waiter accounts. Release identifiers, final evidence paths, CI and public smoke results belong in `release-readiness.md` after verification.

## Unverified Gates
Real iOS/Safari/IME/pinch gestures, physical cafe staff/customer acceptance, accessibility assistive-technology audit, load/soak/restore and external AI/email/payment/printing integrations remain separate acceptance gates. This is a supervised MVP pilot, not a zero-bug certification.
