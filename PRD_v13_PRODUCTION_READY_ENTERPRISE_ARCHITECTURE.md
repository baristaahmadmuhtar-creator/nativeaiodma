# 🚀 AIODMA PRD v13.0: Enterprise Production-Ready Architecture Specification

**Product Requirements Document (PRD) — Production-Grade MVP & End-to-End Enterprise Architecture**  
*Document Version: 13.0 | Status: Production Blueprint | Date: 2026-08-26*

---

## 1. 🎯 Executive Summary & Vision

AIODMA (*AI Conversational Ordering & Digital Menu Assistant*) adalah platform *smart dining* enterprise yang menggabungkan asisten AI percakapan sommelier, katalog digital interaktif *liquid glass*, pelacak pesanan *real-time*, serta *Kitchen Display System (KDS)* terintegrasi.

Versi 13.0 menetapkan transisi total dari prototipe/simulasi menjadi **100% Production-Ready**:
- ❌ **Zero Simulation**: Mengeliminasi seluruh mock data, hardcoded analytics, fake payment timeout, developer device switcher frame, dan simulator hardware cutout tiruan di antarmuka pelanggan.
- ❌ **Zero Fallback/Placeholder**: Menghilangkan seluruh regex heuristic chat fallback dan direct API key exposure di browser.
- ✅ **Deterministic Real-World Workflows**: Alur pesanan, pembayaran kasir/digital, pelacakan KDS, dan dispatch pelayan beroperasi secara riil, transaksional, dan terverifikasi end-to-end.
- ✅ **Enterprise Security & ACID Persistence**: Proteksi autentikasi admin kriptografis tanpa celah referer, validasi harga server-side, rate limiting, dan database atomik ber-mutex.

---

## 2. 🏛️ High-Level System Architecture

```
+----------------------------------------------------------------------------------------------------+
|                                      AIODMA PRODUCTION ECOSYSTEM                                   |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [📱 Customer Mobile Web / PWA]                 [🖥️ Kitchen & Admin Operations]                     |
|  - Table QR Auto-Detection (?table=X)           - Dedicated KDS (/admin.html#kds, /kds.html)        |
|  - VisionOS Crystal Liquid Glass UI             - Real-Time Kanban (Received/Prep/Ready/Complete)   |
|  - Apple Intelligence Minimalist AI Chat        - Cashier Payment Confirmation Terminal             |
|  - In-Place Cart Stepper & Addons               - Menu Stock 86 Instant Toggle                      |
|  - Universal Floating Live Activity Pill        - Live Analytics & Revenue Dashboard                |
|  - Dynamic QRIS / Cashier Handoff               - AI Token & Guardrails Config                      |
|  - Digital Thermal ESC/POS Receipt              - Local Table QR Code Generator                     |
|                                                                                                    |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                ⚙️ CORE BACKEND ENGINE (Node.js/Express)                             |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [🛡️ Security & Protocol Layer]                                                                     |
|  - Dynamic CORS Whitelist | Enterprise Security Headers (CSP, Frame-Options, nosniff)              |
|  - Sliding-Window Rate Limiting (Chat: 30 req/min, Orders: 20 req/min, Admin: 5 req/15 min)         |
|  - Cryptographic Admin Session Shield (Zero Referer Bypass | Signed Bearer Tokens | PIN Lockout)   |
|                                                                                                    |
|  [🧠 Pure AI Agent Orchestrator]                                                                   |
|  - Server-Side Gemini API Proxy (gemini-3.7-flash / gemini-2.5-flash)                              |
|  - Live Ground-Truth Context: Active 36-item Catalog + Out-of-Stock (86) Filter + KDS Orders       |
|  - Function Calling Router: addToCart, removeFromCart, showRecommendations, callWaiter, etc.      |
|  - Prompt Injection Defense & Token Usage Ledger                                                   |
|                                                                                                    |
|  [💳 Transaction & Payment State Machine]                                                          |
|  - Order Integrity Recalculator: Subtotal = Σ(Catalog Price × Qty) + Addons | Tax PB1 10%           |
|  - Idempotency Shield (UUID/Hash Ledger preventing duplicate submissions)                          |
|  - State Machine: PENDING_PAYMENT -> PAID -> PREPARING -> READY -> COMPLETED / CANCELLED            |
|  - Payment Methods: CASH (Kasir Handoff) & DYNAMIC_QRIS (Instant QR Settlement)                    |
|                                                                                                    |
|  [⚡ Real-Time Event Bus (SSE Engine)]                                                             |
|  - Server-Sent Events (/api/events) with Heartbeat Ping (15s) & Exponential Backoff Reconnect      |
|  - Broadcast Channels: ORDER_CREATED, ORDER_STATUS_CHANGED, ORDER_PAID, MENU_UPDATED, WAITER_CALL   |
|                                                                                                    |
|  [💾 ACID Persistence Layer]                                                                       |
|  - Atomic Write Mutex (Write to .tmp + rename) | Backup Auto-Snapshotting                          |
|  - Collections: menu, orders, sessions, waiterCalls, aiConfig, auditLogs                           |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. 🔍 Audit: Eliminasi Simulasi & Solusi Production-Ready

| Komponen | Status Lama (*Simulasi / Mock / Placeholder*) | Solusi Baru (*100% Production Ready*) |
|---|---|---|
| **Customer App Layout** | Terdapat *Top Simulator Bar* (`btnDevicePhone`, `btnDeviceiPad`, `btnKdsTestOrder`) dan *Dynamic Island Cutout* buatan di layar pelanggan. | **Dihapus total**. Antarmuka pelanggan murni *full-bleed responsive mobile web* tanpa bingkai simulator tiruan. KDS dipindahkan seutuhnya ke portal dapur. |
| **KDS Viewport** | KDS disisipkan di dalam HTML pelanggan (`#ipadKdsViewport`). | **Terisolasi**. KDS memiliki antarmuka khusus di `/admin.html#kds` dan `/kds.html` dengan tata letak layar penuh untuk tablet dapur. |
| **Checkout & Pembayaran** | Menggunakan `setTimeout(1200)` palsu dan membuat pesanan dummy lokal jika backend gagal. | **Real-World State Machine**: Pesanan dibuat nyata di server. Metode Cash berstatus `PENDING_CASHIER` hingga kasir konfirmasi. Metode QRIS menghasilkan QR dinamis. Jika error, tampilkan dialog kesalahan tanpa menghapus keranjang. |
| **Panggilan Pelayan di Chat** | Fungsi `callWaiter` di AI hanya memunculkan toast di layar pelanggan tanpa memanggil API. | **Real Dispatch**: AI memicu `POST /api/waiter/call`, server mencatat panggilan dan menyiarkan event SSE ke KDS dengan audio chime. |
| **Keamanan Autentikasi Admin** | Memiliki *referer bypass* (`req.headers['referer'].includes('admin.html')`). | **Zero Bypass**: Semua rute `/api/admin/*` wajib menyertakan token sesi valid hasil verifikasi PIN atau Bearer header terdaftar. |
| **Statistik Admin Dashboard** | Mengembalikan angka statis hardcoded (`grossRevenue: 4820000`, `totalOrders: 48`). | **Dynamic Computation**: Statistik pendapatan, total pesanan harian, dan rata-rata tiket dihitung *on-the-fly* dari data pesanan riil di database. |
| **QR Code Meja** | Memanggil API eksternal pihak ketiga (`api.qrserver.com`) dengan IP statis hardcoded. | **Local Embedded QR Generator**: Generator SVG lokal mandiri (`/api/tables/:tableNum/qr`) yang dinamis mendeteksi origin host saat ini. |
| **AI Barista Execution** | Masih terdapat sisa kode direct API call client-side. | **Pure Server Proxy**: 100% request AI diarahkan ke `/api/ai/chat` di backend, memastikan API key aman dan data menu selalu mutakhir. |

---

## 4. 💳 Alur Pembayaran & Siklus Transaksi Kasir Riil

### A. Alur Bayar di Kasir (*Cash at Cashier*)
1. Pelanggan memilih metode `CASH` di Payment Sheet dan menekan **Proses Pembayaran**.
2. Client mengirim `POST /api/orders` dengan `paymentMethod: 'CASH'`, `paymentStatus: 'PENDING_CASHIER'`.
3. Server memverifikasi harga, membuat tiket pesanan (misal `#5K89A`), dan menyiarkan event `ORDER_CREATED` via SSE.
4. **Layar Pelanggan**: Menampilkan status `"Menunggu Pembayaran di Kasir"` dengan Nomor Pesanan dan ringkasan tagihan.
5. **Layar KDS / Kasir**: Pesanan muncul di kolom *Pesanan Diterima* dengan label kuning **[BELUM LUNAS - BAYAR DI KASIR]** beserta tombol hijau **[Terima Pembayaran]**.
6. Kasir menerima uang tunai di kasir dan mengklik **[Terima Pembayaran]**.
7. KDS memanggil `PATCH /api/admin/orders/:id/payment` dengan payload `{ paymentStatus: 'PAID' }`.
8. Server memancarkan SSE event `ORDER_PAID`.
9. **Layar Pelanggan Secara Instan Reaktif**: Otomatis bertransisi ke tampilan **Pembayaran Berhasil / LUNAS**, mencetak struk digital, dan mengaktifkan live progress bar.

### B. Alur Pembayaran Digital / QRIS Dinamis
1. Pelanggan memilih `BIBD` / `BAIDURI` / `POCKET` / `QRIS`.
2. Server membuat sesi pembayaran dengan kode QRIS dan waktu kadaluarsa 15 menit.
3. Pelanggan memindai QRIS atau menyelesaikan pembayaran digital.
4. Webhook / Konfirmasi gateway mengubah status menjadi `PAID` dan memicu SSE.

---

## 5. 🤖 Arsitektur AI Agent (Pure Gemini Orchestration)

1. **Model Hierarchy**:
   - Primary: `gemini-3.7-flash` (High-speed reasoning & function calling).
   - Fallback: `gemini-2.5-flash` (Secondary model redundancy).
2. **Context Ground-Truth Injection**:
   - Katalog menu 36 item yang terfilter secara otomatis (menu berstatus 86 / habis tidak akan direkomendasikan).
   - Profil rasa (*Flavor Profile*), Sommelier Pairing Matrix, dan Upsell Hooks.
   - Status pesanan aktif meja di KDS (nama item, status peracikan, status bayar).
   - Dynamic time-of-day contextual greeting (Pagi/Siang/Sore/Malam).
3. **Tool Functions Execution**:
   - `addToCart(items: [{ itemId, qty, modifiers }])` -> Validasi ID menu di katalog, update state keranjang in-place.
   - `removeFromCart(itemId, all)` -> Hapus item spesifik atau kosongkan keranjang.
   - `showRecommendations(itemIds, reason)` -> Tampilkan kartu rekomendasi Liquid Glass.
   - `openMenuCatalog(category)` -> Navigasi ke katalog kategori yang diminta.
   - `callWaiter(reason)` -> Kirim sinyal dispatch pelayan ke KDS via backend.
   - `checkOrderStatus(orderNumber)` -> Tampilkan lembar pelacak pesanan langsung.

---

## 6. 📊 Struktur Data & Skema Database

```json
{
  "menu": [
    {
      "id": "kopi_milk_aren",
      "name": "Kopi Milk Aren (Es)",
      "category": "kopi",
      "price": 28000,
      "badge": "Best Seller",
      "available": true,
      "flavorProfile": "Legit Gula Aren, Bold Espresso, Creamy Milk",
      "pairings": ["almond_croissant", "cinnamon_roll"],
      "customizations": {
        "sugar": ["Normal (100%)", "Less Sugar (50%)", "No Sugar (0%)"],
        "temperature": ["Ice (Es Normal)", "Less Ice", "Hot (Panas)"],
        "addons": [{ "name": "Oat Milk", "price": 6000 }, { "name": "Extra Shot", "price": 4000 }]
      }
    }
  ],
  "orders": [
    {
      "id": "ORD_1787498200_ABC",
      "orderNumber": "#5K89A",
      "table": "Meja 5",
      "tableNum": 5,
      "items": [
        { "id": "kopi_milk_aren", "name": "Kopi Milk Aren (Es)", "price": 28000, "qty": 2, "subtext": "Less Sugar, Oat Milk (+6000)" }
      ],
      "subtotal": 68000,
      "tax": 6800,
      "total": 74800,
      "paymentMethod": "CASH",
      "paymentStatus": "PAID",
      "status": "preparing",
      "idempotencyKey": "IDEMP_1787498200_xyz",
      "createdAt": "2026-08-26T08:00:00.000Z",
      "updatedAt": "2026-08-26T08:02:00.000Z"
    }
  ],
  "waiterCalls": [
    {
      "id": "CALL_1787498200_1",
      "table": "Meja 5",
      "tableNum": 5,
      "reason": "Minta Tambah Sedotan & Tissue",
      "status": "pending",
      "createdAt": "2026-08-26T08:01:00.000Z"
    }
  ],
  "aiConfig": {
    "model": "gemini-3.7-flash",
    "tone": "warm",
    "temperature": 0.7,
    "remainingCredits": 50000,
    "totalInputTokens": 0,
    "totalOutputTokens": 0
  }
}
```

---

## 7. 🧪 Kriteria Keberhasilan & Protokol QA/QE Production

1. **Zero Simulation Pass Rate**: 100% pengujian tidak melibatkan dummy mock order fallback atau fake timers.
2. **Deterministic Financial Audit**: Uji coba injeksi harga palsu berhasil dinetralisir oleh kalkulator server.
3. **SSE Resilience**: Koneksi SSE otomatis pulih dalam <3 detik saat terjadi pemutusan jaringan sementara.
4. **Visual & UX Polish**: Tampilan murni putih `#FFFFFF` dengan Crystal Liquid Glass ber-refraksi tinggi di seluruh elemen interaktif tanpa cacat visual simulator.
