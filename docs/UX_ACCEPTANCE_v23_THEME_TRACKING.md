# v23 Theme, Tracking and Customer Comfort

Updated 2026-10-06. Scope: existing customer shell, order tracking, feedback, viewport and screen/print themes. Cafe photography, financial authority, staff permissions and original owner MFA are preserved.

## Interaction Contracts

- The first document script selects a valid saved theme, otherwise the OS preference, before loading styles. Theme changes also update browser theme color, native form color scheme and the accessible toggle name. The script is constant and receives the server's existing CSP hash; no script policy is relaxed.
- Actual success, receipt, payment and tracker selectors use theme-aware foregrounds and surfaces. Payment icons, primary actions, modifier description/price, search placeholders and receipt footer are covered. The digital receipt follows the theme; printing remains black on white. Unpaid/refunded receipts do not show a paid checkmark.
- Modifier quantity capsules/buttons also use actual theme surfaces, not a legacy pale capsule beneath white digits. Both-theme contrast checks and settled screenshots cover the quantity value, plus button and receipt print action.
- Header, product-add, quantity and send targets are 48px. Normal 320px navigation fits one row; extreme horizontal safe-area constraints allow wrapping and the reserved header space follows its measured height. Search, keyboard focus and existing grabber gestures remain usable.
- Customer scrollbar indicators are hidden without disabling overflow scrolling. Focusable content supports keyboard scrolling; touch, wheel, text selection, native zoom and reduced-motion preferences are retained. Visual viewport updates are coalesced to one animation frame and do not resize the shell while pinching.
- Top/bottom/left/right safe-area values apply to controls, sheets, content and docks. The app fills the available browser viewport, not the browser's toolbar. The installed manifest no longer selects a hardcoded table or restricts orientation to portrait.
- Order snapshots are bounded and validated before mutating state or receipt/tracker DOM. Tenant/table, identifier/version, status/payment method, item/modifier shape, timestamps and safe-integer amounts are checked. Earlier versions and malformed events cannot poison the current order. Server snapshots remain the authority; the client does not invent totals or settle payments.
- A successful HTTP envelope is not enough to acknowledge a submission: malformed order and recovery snapshots retain the durable pending key. Retrying reconciles that same committed order; the journal clears only after a valid order view is available.
- Served and completed are distinct labels. Cancelled/rejected orders hide the ordinary future-step timeline and show an explicit stopped status. Refund labels are localized; status badges follow canonical state instead of retaining a hardcoded preparing class.
- Tracking displays live connection, reconnecting or offline with last-known-state wording. Reopening/reconnecting refreshes canonical orders. This is scoped in-app SSE, not guaranteed background push or delivery while a phone/browser is suspended.
- Notification glass has readable theme-aware foregrounds, bounded wrapping, opaque fallback/increased-contrast surfaces and no repeated decorative pulse. Success feedback expires; errors remain persistent. Background progress cannot replace an actionable error. An open tracker, receipt or success screen updates its own status rather than placing a redundant toast over it. Other sheet feedback sits after the grabber in the sheet flow, never over content or controls.
- One dedicated live region announces feedback. Visual notifications and the activity banner do not independently announce the same content. Actual assistive-technology acceptance is still required.

## Verification Contract

The existing browser suite retains its fourteen previous journey groups and adds four comfort groups at 320x568, 390x844, 844x320 and 1440x1000. Both themes exercise payment, success, receipt, print colors, tracking, refund labels, stopped states, safe areas, 48px controls, one-row navigation, hidden scrollbar keyboard scrolling, malformed/stale/foreign-table events and persistent error priority. Screenshots accompany each layer.

Controlled transport fixtures test malformed events and alternate terminal states, not backend transition legality or real delivery. Real PostgreSQL integration tests verify scoped SSE, replay, revocation, idempotency and permissions. Separate actual local API and disposable public-outlet workflows verify durable order and distinct cashier/kitchen/waiter/owner handoffs. Release-specific paths, CI and deployment identifiers are recorded in `release-readiness.md`.

## Remaining Acceptance

These are automated browser/layout contracts, not certification across every physical device. Real iPhone/Safari keyboard, browser chrome, pinch, VoiceOver, physical cafe operators, background suspension, load/soak/restore and unconfigured AI/email/gateway integrations remain production gates. No zero-bug or vulnerability-free guarantee is made. Use the deployed release for a supervised cafe MVP pilot, with cashier/manual payment verification.
