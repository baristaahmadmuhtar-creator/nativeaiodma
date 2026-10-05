# v22 Native-Style Customer Layers

Updated 2026-10-06. Scope: customer ordering shell, native-style sheets, feedback and interaction polish. Existing cafe photography, identity, administrative workflows and server financial authority are preserved.

## Interaction Contracts

- Cart, payment, modifiers, tracker, table information and preferences use a centered grabber instead of an X. The visible line has an 80x44 interactive target, an accessible localized close name, and supports tap, keyboard activation, Escape and browser Back.
- Dragging the grabber down follows the pointer. A bounded distance or downward flick dismisses one history layer. Short, upward and cancelled gestures snap back; click suppression prevents a cancelled drag from accidentally dismissing. Content scrolling remains native and never initiates dismissal.
- All sheets share restrained 220ms movement and light backdrop blur. Preferences has its own scrolling body with a pinned title, grabber and deletion action. Reduced motion removes transitions and decorative animations without disabling direct gesture control.
- Success feedback is compact, does not reserve page layout space, and fades after 2.8 seconds. Offline, uncertain submissions and errors remain persistent and actionable. Background order/waiter progress cannot replace an unresolved error.
- Mobile catalog search keeps space for typing; the cart uses its familiar icon and count rather than a long competing label. Clear-search, category, product-add and sheet controls have at least 44px targets. The send button is circular in either theme; its busy indicator cannot widen it.
- Long cart names wrap instead of disappearing behind quantity controls. Empty carts hide destructive clear actions. Financial placeholders are hidden; only an unexpired server quote for the current cart version supplies totals, including service and discount.
- Keyboard focus indicators override the legacy suppression rules, including inline search styling. Popup focus enters the menu, exits on outside focus, and Escape restores the trigger. The mode check follows the actual screen, including history navigation.
- AI proposal text/buttons have theme-aware contrast. Missing images do not leave a large empty recommendation panel. Appended recommendations/proposals follow the conversation only when the customer was already following it.
- Increased contrast uses opaque work surfaces; forced colors preserves the grabber and focus indicators. No new dependency, payment integration or AI credential is introduced.

## Verification

The existing browser suite includes four additional native-layer journeys at 320x568, 390x844, 844x320 and 1440x1000. It covers keyboard focus styles, mode state, input width, transient/persistent feedback, mouse and Chromium touch-stream drag/snap/cancel, history and focus restoration, pinned preference actions, canonical cart totals, busy send dimensions, dark proposal contrast, increased contrast and forced colors.

Fixture evidence is deterministic and not live provider or real iOS evidence. Final local, CI and public release evidence is recorded in `release-readiness.md` after completion. Real customer transactions on the original cafe are not used for release automation; full ordering smoke uses a disposable outlet.

## Remaining Acceptance

This is an iOS-inspired web interaction, not a native iOS binary or a zero-bug guarantee. Actual Safari/IME, pinch zoom, VoiceOver, cafe operators, network/soak/restore and unconfigured AI/email/gateway integrations remain separate production gates. Ask the cafe tester to verify grabber dismissal, long scrolling and keyboard-open ordering on the actual iPhone used in the supplied photos.
