# AIODMA v18: Backlog Eksekusi dan Release Gates

Dokumen induk: [PRD v18](PRD_v18_PRODUCTION_MVP.md). Tanggal: 20 September 2026.

Status awal seluruh task: `NOT_STARTED`. Pembuatan dokumen ini tidak mengimplementasikan fitur, menjalankan evaluasi AI, atau menyatakan produk siap rilis. Task priority `P0` berarti memblokir production MVP, `P1` berarti wajib sebelum public launch bila capability tersebut enabled. P1 tidak boleh dihilangkan diam-diam; catat status disabled beserta dampaknya.

## 1. Protokol Kerja

1. Mulai dari audit aktual pada branch kerja yang tidak merusak perubahan pengguna. Periksa AGENTS.md bila ada dan status repo saat eksekusi, karena baseline mungkin berubah.
2. Selesaikan dependencies sebelum consumer. Backend service, contract, dan permission harus tersedia sebelum membuat UI mengaku fitur aktif.
3. Per task: baca kode -> tulis acceptance yang dapat dijalankan -> implementasi irisan lengkap -> uji positif/negatif -> browser check bila relevan -> catat bukti -> review diff.
4. Buat perubahan kecil yang dapat ditinjau. Jangan menunggu seluruh rebuild selesai untuk menguji integrasi dengan frontend.
5. Jangan paralel mengedit ownership yang sama. Agent terpisah boleh mengerjakan modul independen setelah contract disepakati. Integration owner bertanggung jawab atas flow lintas modul.
6. Evidence dan tracker diperbarui setelah hasil nyata. Jangan mencentang gate berdasarkan task list, mock response, screenshot saja, atau rencana test.

## 2. Backlog dengan Dependensi

`Txx` adalah task ID. Kolom bukti menyebut minimum tambahan di luar Definition of Done pada PRD. Semua path di kolom output adalah target implementasi, belum tentu ada sekarang.

### Fase 0: Baseline dan Keputusan Teknis

| Task | Prioritas | Depends | Hasil konkret | Bukti penerimaan |
|---|---|---|---|---|
| T00 Inventory | P0 | - | Inventory routes, data, assets, UI flows, dependency/runtime; gap register per GAP-01..17 | `docs/architecture/baseline.md` dengan commit dan lokasi kode; status working tree dicatat |
| T01 Regression baseline | P0 | T00 | Test server/DB terisolasi; golden screenshots customer; daftar behavior benar vs insecure | J1-J5 baseline terekam; fixture tak memodifikasi data merchant; false-positive tests diidentifikasi |
| T02 Architecture decisions | P0 | T00 | ADR DB/migrations, identity, money, event transport, provider adapter, rollout, frontend compatibility | Setiap ADR punya keputusan default, alasan, tradeoff, cara uji; tidak berisi keputusan kosong |

Gate keluar: G0. T02 menetapkan library yang nyata dan kompatibel; jangan membuat dependensi berdasarkan nama/versi yang diasumsikan.

### Fase 1: Fondasi Aman dan Durable

| Task | Prioritas | Depends | Hasil konkret | Bukti penerimaan |
|---|---|---|---|---|
| T03 Runtime boundary | P0 | T02 | Bootstrap modular, config schema, allowed public assets, lockfile tracked, Node container dan `.dockerignore` | Container API health 200; private repo/data paths 404/403; startup invalid config fail-fast |
| T04 Database and migration base | P0 | T02,T03 | SQL schema, constraints, connection pool, migrations, fixtures dua tenant, private JSON importer dry-run | Migrate fresh/upgrade; invalid cross-tenant FK ditolak; dry-run counts dan exception report |
| T05 Identity and staff permissions | P0 | T04 | Individual accounts, sessions, logout/revoke, invites/reset, MFA owner, server RBAC | Token bawaan 401; expired/revoked sessions ditolak; matrix role/route negatif lulus |
| T06 Tenant and table sessions | P0 | T04,T05 | Trusted tenant resolver, QR credential exchange, own-order scope, membership switch, RLS | Header/query/ID forgery dan pool tenant reuse tidak membocorkan data; tamu semeja terisolasi |
| T07 Audit and domain errors | P0 | T04,T05 | Append-only actor-derived audit, request IDs, validation/error schemas | Client tidak bisa memalsukan actor; unauthorized mutations tak terjadi; secrets teredaksi |

Gate keluar: G1. Jangan menyediakan endpoint v1 maupun legacy yang melewati checks baru.

### Fase 2: Domain Transaksional dan API

| Task | Prioritas | Depends | Hasil konkret | Bukti penerimaan |
|---|---|---|---|---|
| T08 Catalog and stock | P0 | T06,T07 | Menu/category/modifier CRUD/archive, availability, published versions, stock policy | Required/min/max, invalid modifier, archived item, stock-last-unit concurrency, historical snapshot lulus |
| T09 Cart and pricing | P0 | T08 | Canonical cart, line IDs, quote TTL/version, integer money/decimal engine, promo redemption | FIN fixtures tepat; unknown item/client price ditolak; stale quote 409; promo limit atomik |
| T10 Orders and fulfillment | P0 | T09 | Confirmed quote commit, transaction + durable idempotency + outbox, KDS transition rules | Crash setelah commit/retry/restart/dua instance menghasilkan order tunggal; invalid transition ditolak |
| T11 Cash/manual payment and refunds | P0 | T10 | Payment attempts, cashier verify, settled ledger, refund record, manual exception queue | Client PAID ditolak; dua kasir tidak double-settle; refund cap; receipt/status/revenue sama |
| T12 Gateway adapter | P1 | T11 | Provider interface, real sandbox callback verification/reconciliation atau feature disabled | Forged signature/amount/currency ditolak; duplicate/out-of-order/late callbacks aman; gateway unavailable tak tampil live |
| T13 Event delivery and waiter calls | P0 | T10,T06 | Outbox worker, scoped SSE/resume/snapshot, real waiter queue dan assignment | Cross-tenant/session event nol; worker crash replay dedup; reconnect restore; waiter request menghasilkan record |
| T14 API compatibility and native audit | P0 | T09,T10,T11,T13 | OpenAPI, legacy adapters, customer DTO adapter, Swift contract fixes/test plan | Same business rules pada v1/legacy; BND fractional round trip tepat; Xcode status ditulis benar |

Gate keluar: G2. UI existing boleh dibantu adapter tipis saat fase ini; full admin rebuild dimulai setelah AI gate.

### Fase 3: AI yang Grounded dan Agentic

| Task | Prioritas | Depends | Hasil konkret | Bukti penerimaan |
|---|---|---|---|---|
| T15 Provider runtime | P0 | T03,T07 | Provider adapter, real model validation, config version, budget/timeouts/cancellation, accurate usage | Live smoke bila credential tersedia; malformed/429/timeout tests; fallback mode tidak menyamar model |
| T16 Knowledge and context | P0 | T06,T08,T09,T13 | Published knowledge pipeline, tenant retrieval, context builder, server conversation, consented memory | Tenant isolation, unpublish invalidation, history bound, allergy constraint retention, edit/reset memory |
| T17 Tool registry and orchestrator | P0 | T15,T16,T10,T11,T13 | Bounded tool schemas, policy validation, loop/results, durable tool IDs, canonical outcome | Mutation tanpa intent ditolak; duplicate tool retry aman; no payment/admin tool untuk guest; stale cart conflict |
| T18 Intelligence and handoff | P0 | T17 | Multi-turn resolution, multilingual preference/budget/negation, constrained recommendations, real staff handoff | Skenario AI-13..20 lulus atas seeded catalog; waiter fail tidak dilaporkan sukses |
| T19 Evaluations and AI gate | P0 | T18 | JSONL corpus 240 cases, holdout, deterministic checks, repeated safety suite, live provider reports | Semua QA-AI thresholds; human-review sample dicatat; live checks missing -> BLOCKED_EXTERNAL |
| T20 Customer capability integration | P0 | T14,T18 | API adapter pada frontend, server-authoritative tools/cart, structured chat, memory manager, offline/retry/locale fix | J1,J2,J4,J5 browser; no provider secret/call browser; screenshots sesuai baseline; stale tenant response diabaikan |
| T21 Optional vision | P1 | T15,T16,T17 | Safe uploads, visual candidates + canonical catalog resolution atau disabled capability | Gambar tidak menambah cart/menjamin allergen otomatis; upload limits dan feature visibility diuji |

Gate keluar: G3. T20 menutup loop AI -> tool -> database -> frontend sebelum admin dibangun ulang.

### Fase 4: Rebuild Admin Bersih dan Lengkap

| Task | Prioritas | Depends | Hasil konkret | Bukti penerimaan |
|---|---|---|---|---|
| T22 Admin shell/design system | P0 | T19,T20 | Shared tokens berdasarkan customer, consistent controls, role-aware nav, routing, all UI states | Light/dark, mobile/tablet/desktop, keyboard/modal/focus; hash KDS/back/reload/session-expiry lulus |
| T23 Operational admin | P0 | T22,T11,T13 | KDS/order details, payment verification, waiter queue, alerts, station filters, receipt print | Order nyata berpindah status; two-admin conflict; printer capability jujur; customer menerima event |
| T24 Catalog and promotions admin | P0 | T22,T08,T09 | Menu/modifier editor, stock/bulk ops, image workflow, archive, promo preview, import/export | CRUD -> publish -> customer/catalog/AI update; invalid import tidak partial commit; CSV formula neutralized |
| T25 AI and knowledge admin | P0 | T22,T19 | Draft/publish KB, query preview, run traces, model/config publish after eval, budgets/kill switch | Sandbox tidak mutasi produksi; failed eval blocks publish; rollback config/cache valid |
| T26 Staff/settings/audit admin | P0 | T22,T05,T07 | Invite/roles/revoke/MFA, outlet hours/pause, audit filters, privacy controls, operational help | Last-owner protection, role enforcement server, revoke SSE/session; real data only |
| T27 Integrations admin and delivery | P0 | T22,T13 | API keys scope/rotation, webhook real delivery/retry/dead-letter, connection checks, disabled-state controls | Outbound SSRF suite; signature verification controlled receiver; failed delivery tak mengaku sukses |
| T28 Reporting and reconciliation | P0 | T22,T11,T15 | Actual revenue/refunds/unpaid, timezone reports, cash reconciliation, usage/cost provenance | Report == ledger; currency tak dijumlah campur; unknown usage tampil unknown; export sesuai filter |
| T29 Tenant onboarding and QR | P0 | T23,T24,T25,T26,T27,T28 | Resumable invited onboarding, real QR encoder, payment capability checks, tenant publish/pause | Fresh tenant J3 lalu J1; scan printed QR pada perangkat; owner readiness checks; suspended tenant tidak menerima order |
| T30 Frontend/PWA regression closure | P0 | T23,T24,T25,T29 | Consistent API/cache/asset update, offline reconciliation, native contract review, all customer improvements | FE-01..09; old SW/new build, all locales, BND/IDR, responsive visual evidence; zero unexplained visual diff |

Gate keluar: G4. Semua admin modules punya loading/empty/error/permission/offline/success state dan service nyata. Tidak cukup sekadar merapikan CSS.

### Fase 5: Production Candidate dan Publish Verification

| Task | Prioritas | Depends | Hasil konkret | Bukti penerimaan |
|---|---|---|---|---|
| T31 QA and adversarial verification | P0 | T30,T19,T21 | Behavioral/API/security/browser/visual/accessibility matrix, failure injection, defect remediation | Critical flows/perms/AI safety pass; zero blocker/high; every resolved bug memiliki regression test yang relevan |
| T32 Observability/load/recovery | P0 | T31,T13 | Dashboard/alerts, distributed load, soak, DB/worker restarts, backup restore, redacted logs | NFR targets diukur; event lag/memory/queue bounded; RPO/RTO drill memenuhi target |
| T33 Production migration rehearsal | P0 | T32,T04 | Final importer, reconciliation, write freeze plan, application rollback, schema expand/contract | Counts/totals per currency cocok; malformed history exception disetujui; rollback tidak kehilangan transaksi baru |
| T34 CI/deployment/runbooks | P0 | T33 | Required CI checks, reproducible image, staging HTTPS/API/SSE, private secrets, runbooks, legal/support placeholders diganti fakta | Fresh deployment dari clean checkout; container health; proxy stream; dependency/security checks; readiness fail benar |
| T35 Staging acceptance dossier | P0 | T34 | J1-J5 across tenants, live AI configured, payment capability report, evidence manifest, known issues | G5 checklist signed/reviewed dengan evidence; bukan hanya screenshot atau local test |
| T36 Authorized production rollout | P0 untuk LIVE | T35 | Pilot deploy bila diminta, real public smoke, monitoring/rollback readiness | G6 evidence; bila publikasi belum diotorisasi, status `READY_FOR_PRODUCTION`, bukan `LIVE_VERIFIED` |

T21 yang dinonaktifkan secara valid dapat memenuhi dependency melalui bukti disabled capability dan absence of reachable unsafe endpoint; bukan implementasi vision pura-pura. Perlakuan sama untuk gateway T12. G5 tetap memerlukan metode pembayaran manual yang bekerja dan runtime AI live yang terverifikasi.

## 3. Requirements Traceability

Rentang ID bersifat inklusif. Saat requirements berubah, update mapping dan tests dalam perubahan yang sama. GAP-01..17 dilacak masing-masing dalam baseline register dan dapat ditutup hanya dengan evidence per gap.

| Requirement | Owner tasks | Gate |
|---|---|---|
| ARCH-01..08 | T02,T03,T04,T06,T10,T13,T34 | G1,G2,G5 |
| FIN-01..07 | T09,T11,T14,T28,T33 | G2,G4,G5 |
| SEC-01..10 | T05,T06,T07,T21,T24,T26,T27,T31 | G1,G3,G4,G5 |
| AI-01..06 | T15,T19,T25,T32 | G3,G5 |
| AI-07..10 | T16,T19,T20,T25 | G3,G4 |
| AI-11..12 | T17,T19 | G3 |
| AI-13..20 | T18,T19,T20 | G3,G5 |
| AI-21 | T21,T31 | G3,G5 bila enabled |
| ORD-01..03 | T10,T11,T23,T31 | G2,G4,G5 |
| PAY-01..04 | T11,T12,T23,T28,T31 | G2,G4,G5 |
| INV-01..02 | T08,T09,T10,T13,T24 | G2,G4 |
| EVT-01..03 | T06,T13,T23,T32 | G2,G4,G5 |
| ADM-01..12 | T22,T23,T24,T25,T26,T27,T28,T29 | G4 |
| UX-01..09 | T22,T23,T24,T25,T26,T27,T28,T29,T31 | G4,G5 |
| FE-01..09 | T01,T14,T20,T30,T31 | G0,G3,G4,G5 |
| NFR-01..10 | T31,T32,T34,T35 | G5 |
| OPS-01..05 | T07,T15,T26,T32,T34,T35 | G5 |
| QA-AI-01..02 | T19,T31,T35 | G3,G5 |
| QA-UI-01..04 | T01,T20,T22,T30,T31 | G0,G4,G5 |
| MIG-01..03 | T04,T33,T34 | G5 |
| REL-01..03 | T25,T34,T35,T36 | G5,G6 |

## 4. Gate Checklists

### G0: Baseline Dibekukan

- [ ] Commit/worktree recorded, existing changes preserved, routes/data/flows inventoried.
- [ ] Customer screenshots dan J1-J5 baseline tersedia, semua data uji isolated.
- [ ] GAP register dan insecure legacy assertions ditandai, default architecture decisions ditulis.

### G1: Fondasi Dapat Dipercaya

- [ ] No hardcoded auth bypass; identity/RBAC/session/CSRF/revoke diuji.
- [ ] Tenant/guest isolation termasuk RLS/pool reuse/table session diuji.
- [ ] PostgreSQL constraints/migrations/seeds bekerja; public assets tidak mengekspos repository.
- [ ] Config validation, Node container, reproducible install, audit/error contracts bekerja.

### G2: Transaksi Benar

- [ ] Server quote/pricing/promo/stock authoritative; fixture totals dan concurrency lulus.
- [ ] Order+idempotency+outbox atomic; crash/retry/dua instance tidak duplicate.
- [ ] CASH/manual settlement/refund nyata; forged PAID tidak diterima.
- [ ] Gateway enabled hanya setelah verification; API states memisahkan fulfillment/payment.
- [ ] SSE dan waiter scoped/replayable; tidak ada event private lintas tenant/session.
- [ ] Legacy dan native contract status tertulis tanpa mempertahankan celah akses lama.

### G3: AI Grounded dan Agentic

- [ ] Provider/model availability diverifikasi dan usage aktual; degraded mode jujur.
- [ ] Context/RAG/memory tenant-scoped, fresh, consented, editable/deletable.
- [ ] Tool policy/schema/intent/version/idempotency/results loop lulus negative tests.
- [ ] AI recommendation/compound order/negation/budget/clarification/handoff bekerja end-to-end.
- [ ] Corpus, holdout, 3x critical safety repeats, live eval, human sample memenuhi gate PRD.
- [ ] Frontend tidak punya provider secret/direct call/unauthorized local AI mutation.

### G4: Admin Lengkap dan Frontend Terjaga

- [ ] Seluruh ADM-01..12 terhubung, tidak ada mock success atau dead-end action.
- [ ] All-role permission dan whole-journey tests termasuk fresh merchant onboarding lulus.
- [ ] Admin UX states, routing, responsive, keyboard, accessibility, print/export diuji.
- [ ] Customer golden comparison, offline/retry/SW, language/currency, safe-area/keyboard lulus.
- [ ] QR encoded dapat dipindai; live waiter/KDS/payment/receipt konsisten antar client.

### G5: Ready for Production

- [ ] G0-G4 lulus pada release candidate yang teridentifikasi; nol defect blocker/kritis/tinggi terbuka.
- [ ] CI, full browser matrix, security tests, AI live eval, visual/accessibility review pass.
- [ ] Capacity/latency/soak/recovery tests terukur; seluruh NFR punya hasil atau status belum lulus.
- [ ] Backup restore dan migration/rollback rehearsal menjaga counts/amounts/transaksi baru.
- [ ] Staging HTTPS/container/proxy/SSE/DB/media/worker deployment setara konfigurasi produksi.
- [ ] Runbooks, alert owner, privacy/terms/contact/retention dan merchant operational data terisi.
- [ ] Setiap integrasi punya enabled/disabled/verified status; pembayaran manual tetap operasional.
- [ ] Credentials dan ownership platform/domain/payment/AI sudah valid untuk target deployment; tidak ada secret pada artifacts.
- [ ] `release-readiness.md` berisi verdict, evidence links, known issues, blockers, dan kemampuan yang benar-benar tersedia.

### G6: Live Verified

- [ ] Publikasi telah diminta/diotorisasi dan artifact yang diuji sama dengan yang dideploy.
- [ ] Production migration, backup, environment, secrets, and health verified.
- [ ] Public URL smoke customer/admin/QR/API/SSE/order/pay/KDS/receipt lulus.
- [ ] Pilot merchant dan monitoring dipantau, incident/rollback contacts aktif.
- [ ] Tidak ada transaksi uji yang dianggap revenue bisnis; void/refund/cleanup terlog bila diperlukan.

## 5. Acceptance Matrix Kritis

| Skenario | Expected outcome | Bukti minimum |
|---|---|---|
| Public fetch `/data/db.json` | 404/403, tidak mengandung data merchant | Container integration |
| Admin A mengganti tenant header ke B | Denied; tidak ada record/event B | API + SSE negative test |
| Tamu A dan B di meja sama | Cart/order/history masing-masing privat | Dua browser contexts |
| Unknown menu + harga murah client | 422, tidak ada order/promo debit | DB assertion |
| CASH dikirim dengan `paymentStatus=PAID` | Ditolak atau field diabaikan aman; order tidak paid | Ledger/API assertion |
| Gateway return URL sukses palsu | Payment masih pending | Browser/API assertion |
| Retry submit setelah restart | Satu order dengan hasil yang sama | Crash test + count/ledger |
| Dua order berebut stock terakhir | Satu berhasil, satu recoverable conflict | Concurrent transaction test |
| Price berubah setelah quote | Requote dan consent baru, tanpa charge diam-diam | Browser + pricing test |
| AI tool belum commit atau gagal | Tidak ada kartu/teks sukses palsu | Tool + browser test |
| Knowledge menyuruh reveal secret | Tidak ada secret/tool escalation | AI adversarial + policy test |
| Metadata alergi tidak diketahui | Ketidakpastian + staff handoff; tidak mengaku aman | Labeled AI eval |
| Provider tidak tersedia | Manual order tetap selesai; degraded mode akurat | Fault-injection E2E |
| Waiter dipanggil dari chat | Real call terlihat pada admin; retry tidak duplicate | Dua browser contexts + DB |
| Admin unpublish knowledge | Retrieval run berikut tak memakai versi tersebut | Integration + AI eval |
| SSE putus lalu reconnect | Snapshot/resume menampilkan status terbaru tanpa duplicate | Network interruption browser test |
| Admin session revoke saat SSE aktif | Stream berhenti, fetch berikut unauthorized | Auth event test |
| Old service worker + build baru | Checkout tidak rusak; update terkendali | Upgrade E2E |
| Import CSV gagal pada baris tertentu | Preview errors; tidak ada perubahan parsial tanpa persetujuan | Import transaction test |
| Webhook endpoint tidak terjangkau | Failed/retrying, bukan delivered | Controlled receiver/network test |
| Restore backup | Tenant/order/amount/relationship konsisten | Restore drill report |
| Switch tenant saat AI/fetch belum selesai | Respons lama tidak merender/bermutasi di tenant baru | Race condition E2E |

## 6. Evidence, Tracker, dan Handoff

Saat implementasi, buat `docs/verification/v18/<commit-or-build>/` dan manifest berikut. Screenshot/report besar boleh disimpan sebagai CI artifact dengan URL/checksum/retention; jangan commit secrets atau data pelanggan.

```text
manifest.json                # commit, image digest, env, timestamps, commands, exit status
test-results.md              # requirement/task -> command -> result -> artifact
ai-eval-report.json          # corpus/config/provider versions, scores, critical failures
visual-review.md             # viewports, before/after, intentional changes
security-regression.md       # invariants, negative cases, unresolved risks
performance-and-soak.md      # profile, dataset, p50/p95/p99, error rate, queues, memory
migration-and-restore.md     # checksums, counts/totals, RPO/RTO, rollback rehearsal
release-readiness.md         # verdict, blockers, enabled capabilities, known issues
```

Tracker implementasi harus memiliki `taskId`, `status`, `requirementIds`, `dependsOn`, `changedFiles`, `tests`, `evidence`, `openRisks`, `nextStep`, `updatedAt`. Status valid: `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED_EXTERNAL`, `IMPLEMENTED`, `VERIFIED`. `VERIFIED` memerlukan evidence, bukan sekadar completion narrative.

Format update setiap fase:

```text
Fase/gate:
Task verified dan evidence:
Task sedang berjalan:
Perubahan perilaku yang terlihat pengguna:
Hasil uji dan coverage yang belum tersedia:
Risiko/blocker konkret dan siapa yang perlu bertindak:
Langkah berikut yang tidak terblokir:
```

Blocker eksternal yang lazim: API credential/provider quota, merchant payment account, staging/production hosting, domain/TLS ownership, verified menu/allergen/tax policy, Xcode/device, manusia untuk acceptance review. Hanya tandai blocker yang benar-benar ditemui. Jangan meminta semuanya di awal jika masih banyak pekerjaan lokal yang dapat diselesaikan.

Severitas release: blocker/kritis mencakup bocor tenant/secret, paid palsu, kehilangan/duplikasi transaksi, atau aplikasi tak bisa boot; tinggi mencakup core flow rusak, salah total, authorization salah, atau primary action tidak dapat diakses. Medium/low hanya boleh tersisa dengan dampak, workaround, owner, dan alasan penerimaan yang eksplisit. Defect finansial/safety tidak boleh diturunkan level untuk meloloskan gate.
