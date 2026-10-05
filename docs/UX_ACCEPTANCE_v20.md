# v20 Operations Acceptance

## Implemented
- Notifications from committed events, guest session isolation, role filtering,
  descending cursor pagination and monotonic read state across staff login sessions.
- Inbox links retrieve canonical current orders/calls, including records outside
  the newest 200 rows. Operational updates never replace unsaved forms or filters.
- Customer order-version and waiter-response announcements. No permission prompts,
  browser background push, guaranteed sound or offline mutation claims.
- Ringkasan shows all active orders, unpaid active orders and unresolved calls,
  with links to relevant operational filters.
- Waiter can serve ready orders only; cashier owns payment recording; kitchen
  prepares paid orders; owner completes and manages refunds and AI policy.
- AI pause and daily request admission cap; UTC reset, actual reported token
  totals with unknown/incomplete runs explicitly distinguished; no invented costs.
- Accounting persists independently of conversation deletion. Retrying a deleted
  message cannot spend twice or crash on an accounting uniqueness conflict.

## Verification
- 63 unit and 43 restricted-runtime PostgreSQL integration tests passed locally.
- Customer fixture contracts: 320x740, 390x844, 844x390, 1440x1000 and long catalog/
  modifier scrolling. Fixture tests are not live-provider evidence.
- Real admin browser suite: owner, waiter and kitchen navigation, inbox reads and
  current-order links, policy save, CSRF, payments, KDS, reports and screenshots at
  320/390/1440. Evidence: `output/admin-v18/d3365111e199/`.
- Production-policy onboarding suite uses distinct invited cashier, kitchen and
  waiter accounts; guest receipt -> cashier synthetic settlement -> kitchen ready
  -> waiter served -> owner completed. It checks inbox acknowledgement, AI pause,
  role guards and unpublication, without actual external funds.

## Remaining Gates
Live provider credentials/evaluation, email verification/delivery, background push,
real printer/POS acceptance, gateway, load/soak, restore drills and real cafe device/
operator testing are not passed. This is a supervised cafe MVP pilot, not zero-bug
certification. Exact deployment and public test evidence belong in release-readiness.
