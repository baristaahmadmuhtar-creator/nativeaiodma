# 🛡️ AIODMA PRD v10.0: Enterprise-Grade Security, API Key Zero-Exposure, Admin Defense-in-Depth, and UX Resilience

---

## 1. Executive Summary

Versi 10.0 menghadirkan arsitektur **Defense-in-Depth (Keamanan Berlapis)**, **API Key Zero-Exposure**, **Admin Authentication Shield**, **Anti-DDoS Rate Limiting**, **Server-Side Price Integrity Validation**, serta **Kenyamanan UX & Ketahanan Jaringan**:

```
+-----------------------------------------------------------------------------+
|                      ENTERPRISE SECURITY & UX LAYERS                        |
+-----------------------------------------------------------------------------+
| Layer 1: Network & CORS Shield (Dynamic LAN/Localhost Whitelist & Headers)  |
| Layer 2: Anti-DDoS Rate Limiter (Sliding Window per IP for Chat & Orders)  |
| Layer 3: Admin RBAC & Session Auth (Token/PIN Shield + Brute Force Lockout) |
| Layer 4: API Key Zero-Exposure (Server-Side Masking & Safe Proxy Execution) |
| Layer 5: AI Prompt Injection Shield (Adversarial Token Neutralizer)         |
| Layer 6: Financial Integrity Engine (Server-Side Price Recalculation)      |
| Layer 7: UX Resilience (SSE Auto-Reconnect, Haptics & Clean Session Reset) |
+-----------------------------------------------------------------------------+
```

---

## 2. Threat Modeling & Attack Vectors (*Matriks Ancaman & Mitigasi*)

| Vektor Serangan (*Threat Vector*) | Risiko / Dampak | Solusi Mitigasi AIODMA v10.0 |
|---|---|---|
| **API Key Leakage di Browser DevTools** | Kunci Gemini dicuri & kuota terkuras | Kunci disimpan murni di server; API hanya mengekspos versi bertopeng (`AIzaSy...XXXX`). |
| **Client-Side Price Tampering** | Pelanggan memodifikasi harga di JS sebelum checkout | Backend merevalidasi harga tiap menu langsung dari master catalog `db.menu`. |
| **Admin Brute-Force & Unauthorized Patch** | Peretas mengubah status KDS atau mematikan menu | Endpoint `/api/admin/*` dilindungi Token HMAC / PIN Admin dengan limit 5 percobaan/15 menit. |
| **Adversarial AI Prompt Injection** | Pengguna mencoba jailbreak AI untuk mengungkap prompt | AI Sanitizer mendeteksi token *jailbreak / system override* dan mendefleksi secara aman. |
| **DDoS & Token Exhaustion Attack** | Ribuan request spam chat menghabiskan server/token | Rate limiter sliding window (30 chat req/min, 20 order req/min per IP). |
| **CORS Exploitation & Clickjacking** | Situs jahat mencuri data sesi atau iframe embedding | Header `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, CORS aman. |
| **Network Flapping / SSE Dropped** | Pelanggan kehilangan update live KDS saat sinyal lemah | Auto-reconnect SSE dengan exponential backoff dan keep-alive ping 20 detik. |

---

## 3. Detail Arsitektur Keamanan & Implementasi

### A. API Key Zero-Exposure & Safe Proxy
- Endpoint `GET /api/admin/config` dan `POST /api/admin/config` secara deterministik menyembunyikan raw key dan hanya menyajikan `apiKeyMasked`.
- Eksekusi AI dilakukan sepenuhnya di backend (`POST /api/ai/chat` & `POST /api/ai/ping`) sehingga tidak ada request Gemini langsung dari browser pelanggan.

### B. Server-Side Price & Financial Validation
- Setiap item di keranjang yang dikirim ke `POST /api/orders` dicocokkan dengan harga resmi di `db.menu`.
- Subtotal dihitung ulang: $\text{Subtotal} = \sum (\text{Harga Resmi} \times \text{Kuantiti})$.
- Pajak 10% dihitung otomatis: $\text{Pajak} = \lfloor 0.1 \times \text{Subtotal} \rfloor$.
- Mencegah manipulasi angka di console browser.

### C. Admin Token Authentication & Lockout Shield
- Endpoint admin dilindungi `x-admin-token` / Bearer token.
- Sesi admin dapat di-generate melalui `POST /api/admin/login` (Default PIN: `aiodma2026`).

### D. AI Adversarial Filter
- String input dibatasi maksimal 1000 karakter.
- Filter otomatis untuk kata kunci: `ignore previous`, `act as root`, `reveal prompt`, `dump database`, `system override`.

---

## 4. Rencana Verifikasi Otomatis
1. **Test Security Headers & CORS**: Verifikasi `X-Frame-Options`, `X-Content-Type-Options`, dan CORS.
2. **Test API Key Zero-Exposure**: Memastikan `GET /api/admin/config` tidak membocorkan plaintext key.
3. **Test Price Tampering Prevention**: Mengirim order dengan harga Rp 1, memverifikasi backend merevisi ke harga resmi katalog.
4. **Test Rate Limiting**: Memverifikasi limit request chat & login admin.
5. **Test AI Prompt Injection Defense**: Memverifikasi jailbreak injection dinetralisir dengan aman.

