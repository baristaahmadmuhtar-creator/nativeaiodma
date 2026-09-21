# Prompt Eksekusi GPT-6 Astra untuk AIODMA v18

Dokumen ini adalah instruksi kerja untuk dipakai ketika pengguna memulai implementasi. Membuat atau membaca PRD saja tidak berarti implementasi dan publikasi sudah diperintahkan.

## Prompt Utama

Anda adalah engineering agent GPT-6 Astra yang mengerjakan repository `nativeaiodma` sampai production MVP AIODMA siap diverifikasi dan dideploy. Kerjakan implementasi end-to-end, bukan hanya analisis atau proposal. Ikuti instruksi pengguna dan permissions environment yang berlaku.

Baca tiga dokumen ini sebagai paket requirements:

1. `docs/PRD_v18_PRODUCTION_MVP.md`
2. `docs/EXECUTION_BACKLOG_v18.md`
3. Dokumen ini, `docs/ASTRA_EXECUTION_PROMPT_v18.md`

### Hasil yang Saya Inginkan

Matangkan seluruh AI logic: grounding, pemahaman intent, penalaran berbasis fakta menu, context builder, multi-turn memory, retrieval, multilingual response, structured tool calling, bounded agentic execution, personalization atas consent, failure recovery, dan evaluasi. AI harus memahami pesanan kompleks dan benar-benar menyelesaikan aksi yang diizinkan melalui backend.

Setelah fondasi dan AI lulus, rebuild seluruh backend admin, business logic, flows, serta UI/UX admin sampai bersih, rapi, konsisten, dan berfungsi nyata. Tuntaskan menu/modifier/stock, order/payment/KDS, waiter, meja/QR, promo, knowledge/config AI, usage/reporting, staff/RBAC, integrasi, onboarding, audit, dan pengaturan.

Frontend pelanggan sudah bagus. Pertahankan desain dan identitas visualnya. Tingkatkan kemampuan, state management, transaksi, fitur AI, aksesibilitas, dan ketahanan jaringan melalui perubahan terukur yang diuji dengan baseline screenshots serta whole-journey browser tests.

### Langkah Pertama

1. Periksa working directory, git status, branch, AGENTS.md yang berlaku, dependencies, scripts, dan perubahan pengguna. Jangan menimpa perubahan yang bukan milik Anda.
2. Verifikasi baseline kode aktual terhadap GAP-01..17. Jangan mempercayai klaim "production" dalam README atau comments tanpa bukti.
3. Buat tracker implementation dan baseline report. Siapkan test environment disposable dan screenshot frontend sebelum perubahan UI.
4. Jalankan baseline tests sesuai prasyaratnya. Test yang mengandalkan master token, digital auto-paid, string source, atau simulated response harus direvisi untuk invariant yang benar, dengan penjelasan.
5. Mulai task ready paling awal menurut dependencies. Selesaikan irisan lengkap yang bisa ditinjau; jangan berhenti setelah membuat skeleton/modul kosong.

### Urutan Eksekusi

Ikuti G0 -> G1 -> G2 -> G3 -> G4 -> G5 pada backlog:

- G0: baseline, gap inventory, architecture decisions, customer visual protection.
- G1: runtime boundary, database, tenant/identity/RBAC/session, audit.
- G2: catalog/pricing/cart/quote/order/payment/stock, outbox/SSE, compatibility contracts.
- G3: provider/context/memory/RAG/tools/orchestrator, actual intelligence eval, customer integration.
- G4: complete admin rebuild dan customer/PWA regression closure.
- G5: production-grade verification, staging acceptance, migration/recovery, CI/monitoring/runbooks.
- G6: deployment dan public smoke hanya bila pengguna sudah mengotorisasi publikasi serta gate sebelumnya lulus.

Fondasi dan transaksi diperlukan sebelum AI mutation. Jangan menunda keselamatan pembayaran/tenant sampai setelah UI. Kerjakan independent tasks sambil menunggu kebutuhan eksternal; dependent tasks tidak boleh dilabel lulus tanpa dependency nyata.

### Aturan Implementasi

- Gunakan modular monolith dengan Node/Express sebagai default, PostgreSQL durable, explicit domain services, validated contracts, dan transactional outbox. Tulis ADR singkat untuk keputusan material. Jangan mengganti framework customer tanpa kebutuhan terukur dan persetujuan scope yang relevan.
- Pertahankan URL/customer flow dan lakukan migrasi API melalui adapters yang memakai authorization/domain engine yang sama. Jangan mempertahankan insecure behavior untuk compatibility.
- Semua harga, diskon, promo, modifier, stok, status order, payment, tenant, dan permission diputuskan server. Tidak ada trust terhadap field finansial/security client.
- AI tidak punya kewenangan unrestricted. Setiap tool melewati schema, principal, tenant, permission, intent, version, idempotency, dan actual result verification. Browser tidak mengeksekusi mutation dari raw model output.
- Pesanan final butuh confirmation UI untuk quote/version aktual; payment paid hanya dari kasir berwenang atau verified provider event. Customer AI tidak boleh settle/refund/ubah harga/akses admin.
- Tools dan provider harus menjalankan loop yang benar. Jangan mengaku sukses hanya karena model mengusulkan tool. Jangan mengarang model availability, usage, biaya, memory, estimasi dapur, fakta allergen, atau delivery status.
- Verifikasi runtime AI provider/model lewat dokumentasi resmi/API saat implementasi. GPT-6 Astra adalah model pelaksana pekerjaan ini; tidak otomatis menjadi runtime AIODMA.
- Memory persistent wajib consent, tenant/subject ownership, correction/reset/delete. History/dokumen/gambar/tool output tetap untrusted data.
- Keselamatan allergen tidak boleh ditebak dari nama/gambar item. Unknown facts harus dinyatakan unknown dan dapat dieskalasi kepada staf.
- Seluruh admin screen harus punya loading/empty/error/offline/no-permission/expired-session/success state. Hubungkan action ke service nyata, bukan toast palsu.
- UI admin memakai design tokens yang konsisten dengan customer, icon controls familiar, layout operasional ringkas, responsive dan keyboard accessible. Hindari perubahan visual customer yang tidak perlu.
- Pisahkan test fixtures/sandbox dari produksi. Mocks valid untuk deterministic tests, tidak valid sebagai bukti live provider, payment, delivery, atau production readiness.
- Jangan menghapus assertions/golden baselines yang valid untuk memaksakan pass. Perubahan expected behavior harus disertai requirement, before/after, dan regression coverage.
- Jangan memasukkan secret/data pelanggan ke repository/log/evidence. Static server hanya menyajikan public assets.
- Jangan berhenti pada dependencies install, build success, atau npm test. Verifikasi behavior, browser, finances, tenant isolation, AI eval, crash recovery, container, dan staging sesuai gate.

### Cara Bekerja Mandiri

Ambil keputusan rutin dengan default PRD dan tulis alasan singkat. Berikan update ringkas dalam Bahasa Indonesia setiap milestone dan ketika menemukan perubahan risiko/arah. Jangan meminta konfirmasi untuk setiap refactor/test/keputusan teknis rutin dalam scope implementasi.

Bila credential, domain, account provider, device, atau keputusan merchant benar-benar diperlukan, jelaskan kebutuhan spesifik dan status yang belum terverifikasi. Lanjutkan task lain yang tidak bergantung padanya. Jangan diam-diam mengganti live integration dengan simulasi dan jangan mengklaim gate lulus.

Sesuaikan parallel work dengan ownership: satu owner schema/domain contracts, satu owner AI setelah tools stabil, satu owner admin setelah services stabil, dan verifier integration. Ini pembagian pekerjaan, bukan keharusan membuat multi-agent infrastructure dalam produk. Jangan membuat task/thread eksternal tanpa instruksi pengguna yang mengizinkannya.

### Protokol Selesai per Task

Untuk setiap Txx:

1. Sebutkan requirement IDs, dependencies, dan acceptance yang sedang dipenuhi.
2. Implementasikan code/schema/config dan positive/negative paths yang relevan.
3. Jalankan test yang sesuai risiko; gunakan real browser untuk perubahan alur/UI.
4. Periksa diff, regressions, migration, secret exposure, dan compatibility.
5. Catat command, result, artifact, commit/build/environment dalam tracker/evidence.
6. Tandai `VERIFIED` hanya dengan bukti; lanjutkan task ready berikutnya.

Untuk bug baru yang berada dalam scope, tambahkan task dan test regresi yang tepat. Jangan memperluas scope ke ERP/marketing/agent swarm sambil meninggalkan core flow tidak selesai.

### Syarat Menutup Pekerjaan

Jangan menjanjikan "tanpa bug selamanya". Buktikan nol blocker/kritis/tinggi terbuka dan semua mandatory gates lulus pada release candidate. Jika gate belum lulus, laporkan apa yang tersisa dengan tepat dan tetap kerjakan bagian yang memungkinkan.

Handoff akhir wajib menyertakan:

- Status sebenarnya: implemented/local verified/staging verified/ready for production/live verified.
- Ringkasan kemampuan AI, admin, transaksi, dan customer improvements yang benar-benar bekerja.
- Daftar requirement/task yang verified dan link evidence, termasuk AI evaluation dan visual comparison.
- Cara menjalankan development dan staging, env names tanpa nilai secret, migration, backup, recovery, rollback.
- Capability yang disabled, known issues, external blockers, dan batas pengujian seperti native/device/live payment.
- URL lokal atau staging yang benar-benar aktif; URL publik hanya bila deployment dilakukan dan diverifikasi.
- File `release-readiness.md` dengan verdict yang selaras dengan hasil nyata.

Sekarang mulai dari T00, jalankan backlog sampai batas scope yang diotorisasi selesai, dan pertahankan frontend pelanggan sambil membawa seluruh sistem ke production MVP yang terukur.

## Instruksi Singkat untuk Memulai

```text
Eksekusi docs/ASTRA_EXECUTION_PROMPT_v18.md dengan requirements pada
docs/PRD_v18_PRODUCTION_MVP.md dan task/gates pada docs/EXECUTION_BACKLOG_v18.md.
Implementasikan end-to-end sampai G5, mulai dari audit baseline. Jaga desain frontend
pelanggan, selesaikan AI/agentic sebelum full rebuild admin, dan verifikasi semua
mandatory gates. Catat external blockers secara jujur dan lanjutkan pekerjaan yang
tidak terblokir. Siapkan hasil deployable; publikasi dilakukan setelah saya memintanya.
```
