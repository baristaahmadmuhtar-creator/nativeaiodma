# v24 Tracking Swipe and Customer Motion

Updated 2026-10-06. Scope: existing customer experience, not a redesign of cafe photography or operational authority. Visual thesis: readable light/dark glass with subtle edge reflections and fast tactile depth. Content stays in the existing chat, catalog, sheets and receipt. Interaction thesis: direct horizontal tracking drag, bounded dismissal/snap-back, and consistent short press/release across customer controls.

## Interaction Contracts

- The tracking banner can be swiped left or right. A short movement snaps back, a vertical movement is not treated as a tap, and pointer cancellation restores the surface. Horizontal distance or a recent same-direction flick determines dismissal. Vertical panning and pinch zoom remain native; dismissal does not attach a document-wide touch blocker.
- Dismissal only changes presentation. The order, payment, server state and SSE subscription are untouched. The same order stays hidden across updates and tab reloads using a session-scoped UUID preference under the existing hashed session namespace. Storage failure falls back to memory. Different sessions and newly submitted orders do not inherit an older order's hidden preference.
- Hidden order progress does not return as a redundant success toast. The canonical receipt and tracker continue updating, and a dedicated accessible announcement remains available. Persistent errors are not silently dismissed or overwritten by background progress.
- The existing tracking menu reopens the canonical current order and restores its banner. A localized Hide order banner menu command and Delete/Backspace on a focused banner provide alternatives to dragging. Dismissal returns focus to the header when necessary. Tracking accessible names use the current order, table, language, status and payment rather than a hardcoded table.
- Gesture capture, release, cancellation, blur, visibility change, layer navigation and page lifecycle clean up transient translation, rotation and opacity. A normal tap bypasses snap-back animation so its click is not mistaken for a swipe. Movement-generated clicks are suppressed without intercepting keyboard activation.
- Motion is customer-scoped. Independent CSS scale preserves anchored positioning and gesture translations. Press/release covers static and dynamically inserted buttons, tabs, menu items and payment choices. Neutral controls have restrained edge/light/shadow depth. Reflection opacity is bounded; it does not wash out labels or replace busy indicators. Layout space after banner dismissal settles without disabling overflow scrolling.
- Only active tracking drags use transient compositor hints. No continuously running tilt, decorative pulse, global pointer-position loop, new animation framework or 3D renderer is introduced. Existing sheet gestures, readable glass fallbacks, safe areas, native zoom, 48px resting controls and backend guards remain in place.
- Reduced motion removes press scaling, rotation and animated settling while retaining direct manipulation and all commands. Existing increased-contrast, forced-color, no-blur fallback and print contracts remain. This is iOS-inspired web interaction, not a claim to reproduce an Apple OS release or force browser toolbars fullscreen.

## Verification Contract

The browser suite retains all 18 prior customer groups and adds four swipe/motion groups at 320x568, 390x844, 844x320 and 1440x1000. Both themes exercise short/vertical/cancelled drags, real Chromium touch streams, left/right dismissal, accidental-click prevention, no mutation from gestures, hidden progress updates, reload persistence, accessible dismissal/reopen, newly submitted orders and keyboard/reduced-motion press behavior. Screenshots accompany dragging and dismissed states.

Controlled SSE fixtures test presentation and alternate inputs, not real event delivery. The PostgreSQL-backed onboarding/role journey additionally dismisses a paid guest banner, verifies the real kitchen acceptance event does not resurrect it, reopens the canonical tracker and returns via browser history to the receipt before completing the remaining role flow. Publication evidence belongs in `release-readiness.md` only after successful execution and deployment.

## Remaining Acceptance

Real iPhone/Safari touch, browser chrome, IME, pinch, VoiceOver and cafe operator testing remain necessary. Background push, live AI/email/gateway configuration, full load/soak/restore and broader commercial production gates remain open. Automated browser contracts do not establish every-device, zero-bug or vulnerability-free certification. Existing owner MFA and original cafe transactions must not be changed by release verification.
