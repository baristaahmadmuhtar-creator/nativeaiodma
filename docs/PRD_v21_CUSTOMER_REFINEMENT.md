# v21 Customer Journey Refinement

## Scope
Preserve the existing customer identity and menu photography. Refine liquid-glass surfaces, motion, responsive layout, accessible controls and the complete QR -> catalog/chat -> modifiers -> cart -> quote -> unpaid order -> tracking/receipt journey. Admin workflows and server financial authority must remain unchanged.

## Acceptance
- A single active, focus-trapped modal; background inert; Escape/backdrop/back restore the prior layer and scroll. Payment back returns to cart. Dismissal cannot skip multiple history entries.
- Delayed quote/profile responses cannot reopen a dismissed layer. Chat sends the clicked draft, never a subsequently edited draft.
- Expired quotes have an explicit refresh action; prices and payments remain server-authoritative. Lost mutations retain the same durable idempotency key.
- Corrupt preferences do not crash boot. Pending local requests and history destinations are untrusted and strictly allowlisted. No arbitrary replay endpoint, HTML injection or URL credentials.
- Stock/quantity/modifier boundaries are visible and enforced in controls, with the server still validating every mutation.
- Readable light/dark glass, non-overlapping header/content/status, reachable close/confirm controls, safe-area support, keyboard viewport sizing, pinch zoom and reduced motion.
- Exercise portrait, short landscape, desktop, long text/catalog/modifiers, offline/retry, browser history and malformed storage. Re-run real PostgreSQL customer/admin/onboarding flows and existing security regressions.

## Release Gate
Publish only after passing the implemented regression suite and recording actual evidence. Real iOS/Safari, physical cafe acceptance, load/restore, provider AI/email/payment gates remain separate. No zero-bug or vulnerability-free guarantee is made.
