# v25 Customer Layer and Recovery Resilience

Updated 2026-10-08. Scope: the existing customer glass interface, gesture lifecycle, layer reachability and last-known tracking. Preserve cafe imagery, canonical prices, order/payment authority, staff permissions and original owner MFA. Visual thesis: keep the existing readable glass/depth, with stable reachable controls. Interaction thesis: interruptible direct manipulation, anchored sheet actions and honest offline recovery.

## Layer Contracts

- Header popovers rise above the tracking banner only while a menu is open. Background order progress is announced without a toast covering that menu. Opening a menu clears an existing transient success toast, not a persistent actionable error.
- Framed sheet content has sufficient selector specificity to shrink into its scroll area. Tracker and table close actions are pinned outside that area. This fixes clipped controls on short screens, including when a persistent error occupies the sheet. The error is readable in normal flow after the grabber, not positioned over content.
- Sheet dismissal requires a vertically dominant gesture. A recent downward flick can dismiss; sideways, upward, held-short or reversed movements do not count as dismissal. A fresh deliberate pointer gesture can tap the grabber after a cancelled drag, while the cancelled movement's generated click remains suppressed.
- Blur, hidden-page transitions, window/visual-viewport resize, motion-preference changes, non-primary touch and pagehide release sheet/banner capture and transient transforms. Viewport scroll alone does not globally cancel gestures. A banner dismissal already accepted at pointer release is committed even if its exit animation is interrupted. Cancellation before acceptance does not hide it.

## Recovery and Access Contracts

- Offline tracking may open only an already validated order under the retained matching guest principal. It performs no API request, shows last-known/offline wording and does not synthesize a fresher status. It is an in-memory view, not a promise to bootstrap the app offline or provide background push.
- Waiter commands are disabled and guarded during offline, invalid-session, busy or durable-pending states. An outlet ordering pause alone does not disable requesting assistance. Offline ordering/payment remain blocked by existing server-backed confirmation and durable-request guards.
- Online reopening still verifies the session, reloads canonical orders and validates the requested individual order. A malformed or mismatched live response is not treated as permission to open a cached fallback. Reconnection refreshes the canonical snapshot and connection label separately.
- A known 401 or changed principal closes private order layers and hides tracking entry points. History cannot reopen a receipt/tracker under a denied principal. Late transport events after denial are ignored. A changed hashed session namespace clears the old order before cart/order hydration, preventing a former session's snapshot from becoming readable during the new session's load.
- Cached state is never treated as payment authority or permission to mutate. No authentication, financial, SSE-scoping, pricing, RLS, MFA or secret configuration route is relaxed.

## Verification Contract

Retain the 22 prior customer groups and add four resilience groups at 320x568, 390x844, 844x320 and 1440x1000. Controlled fixtures cover directional/interrupted/multi-touch drags, fresh tap after cancellation, committed interrupted swipe, both-theme offline reads, menu hit testing, pinned close, reconnect, absence of offline requests, malformed live responses, known denial/history, late events and changed-principal hydration.

Synthetic lifecycle events establish handler contracts, not physical Safari behavior. Real Chromium multi-touch establishes browser pointer capture behavior, not a certification of every touch device. Separate actual PostgreSQL/production-MFA role flows exercise paid guest tracking offline, disabled assistance, pinned close, reconnection, real kitchen/cashier/waiter/owner updates and publication withdrawal denying customer UI access. Current CI/deployment/public evidence is recorded in `release-readiness.md` only after execution.

## Remaining Acceptance

Physical iPhone/Safari/IME/VoiceOver, operator acceptance, load/soak/restore, live AI/email/gateway and broader commercial production gates remain open. Continue supervised cafe MVP testing; neither complete production acceptance nor zero bugs/vulnerabilities across all devices is claimed. Public verification uses a disposable outlet and read-only original-cafe journeys, not real cafe financial mutations or authenticator changes.
