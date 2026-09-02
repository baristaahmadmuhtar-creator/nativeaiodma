# Product Requirement Document (PRD v16.0)
## AIODMA Enterprise Hybrid RAG Engine, Hardened Multi-Origin CORS, AI Sommelier Intelligence & Production Admin Operations Architecture

---

## 1. Executive Summary & Strategic Scope

**AIODMA (Artificial Intelligence Ordering & Dining Management Architecture)** is an enterprise-grade, multi-tenant B2B conversational dining platform designed for modern specialty cafes, artisan bakeries, manual brew bars, and wood-fired pizzerias across Southeast Asia.

This specification document (PRD v16.0) defines the canonical architecture and requirements for:
1. **Multi-Tenant Hybrid RAG (Retrieval-Augmented Generation) Engine**: In-memory tokenized BM25 keyword matching + TF-IDF vector cosine similarity retrieval over merchant-specific knowledge bases (coffee bean origins, fermentation recipes, allergen alerts, WiFi credentials, dining amenities, sommelier pairings) dynamically augmenting Gemini 3.7 Flash prompts with zero hallucination.
2. **Hardened Multi-Origin CORS & Security Protocol**: Dynamic origin resolution combining environment variables, persistent database origin whitelisting, RFC1918 private LAN ranges, localhost variants, mobile WebViews, and complete preflight header validation (`Access-Control-Max-Age: 86400`, credential support, custom headers).
3. **Advanced AI Sommelier Intelligence & Guardrails**: Gemini 3.7 Flash reasoning architecture with 512-token thinking budget, situational multi-bubble cadence, strict Zero-Emoji policy, adversarial prompt injection shield, multimodal dish recognition, and function calling tools.
4. **End-to-End Admin Operations & KDS Business Logic**: Live waiter call dispatch & resolution queue, cashier cash settlement state machine (`PENDING_CASHIER` -> `PAID`), dynamic promotional coupon validation, batch menu 86 stock toggling, and cryptographically signed audit logs.
5. **Universal WCAG 2.2 AA / AAA Accessibility & Apple HIG Design System**: Complete semantic landmarks, polite ARIA live regions, high-contrast focus rings, and liquid glassmorphic materials.

---

## 2. High-Level System Architecture

```
+----------------------------------------------------------------------------------------------------+
|                                    AIODMA PRODUCTION ECOSYSTEM                                     |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [📱 Customer Mobile Web / PWA]                 [🖥️ Kitchen POS & Operations Hub (Admin)]          |
|  - Multi-Tenant (?merchant=coffeenity|senopati) - Dedicated Real-Time KDS (/admin.html#kds)       |
|  - Apple HIG Crystal Liquid Glass UI            - Interactive RAG Knowledge Base Manager           |
|  - Gemini 3.7 Flash Conversational Sommelier    - Dynamic CORS Origin Whitelist Manager            |
|  - RAG-Augmented Q&A (Beans, Dough, Allergens)  - Cashier Cash Payment Settlement Terminal         |
|  - Real-time Order Tracking & Activity Banner   - Live Staff Waiter Call Queue                     |
|                                                                                                    |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                               ⚙️ CORE BACKEND ENGINE (Node.js/Express)                             |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [🛡️ Layer 1: Hardened Dynamic CORS & Security Layer]                                             |
|  - Regex Dynamic Matcher (Localhost, RFC1918 LAN, PWA, WebViews)                                   |
|  - Dynamic Whitelist Store (db.corsOrigins & process.env.ALLOWED_ORIGINS)                          |
|  - Complete Preflight Protocol (Allow-Methods, Allow-Headers, Exposed-Headers, Max-Age 86400)      |
|                                                                                                    |
|  [🧠 Layer 2: Hybrid RAG Engine (BM25 + TF-IDF Vector Retrieval)]                                  |
|  - Multi-Tenant Knowledge Repositories (Bean Origins, Dough Fermentation, Allergens, Amenities)    |
|  - In-Memory Tokenizer, Stopword Filter, TF-IDF Vector Space Model & Jaccard Scoring              |
|  - Top-K Contextual Snippet Injection into Gemini 3.7 Flash Prompt                                |
|                                                                                                    |
|  [🤖 Layer 3: AI Sommelier Agent & Guardrails Router]                                              |
|  - Gemini 3.7 Flash Proxy (512 Thinking Budget, Zero Client Key Exposure, Prompt Injection Shield) |
|  - Function Calling Router (addToCart, removeFromCart, showRecommendations, proceedToPayment)      |
|  - Situational Dynamic Paragraph Cadence (1, 2, or 3 bubbles via \n\n) & Zero-Emoji Policy        |
|                                                                                                    |
|  [💳 Layer 4: Financial Integrity & Cashier State Machine]                                         |
|  - Server-Side Price & Addon Recalculation (Zero Client-Side Financial Tampering)                  |
|  - Idempotency Shield with In-Memory Deduplication Ledger                                         |
|  - CASH Workflow: PENDING_CASHIER -> Cashier Settle PATCH /api/admin/orders/:id/payment -> PAID    |
|                                                                                                    |
|  [⚡ Layer 5: Real-Time Event Bus (Server-Sent Events)]                                             |
|  - Tenant-Isolated SSE Stream (/api/events) with Heartbeat Ping & Exponential Backoff Reconnect    |
|  - Events: ORDER_CREATED, ORDER_STATUS_CHANGED, ORDER_PAID, WAITER_CALL, WAITER_CALL_RESOLVED     |
|                                                                                                    |
|  [💾 Layer 6: ACID Persistence Layer]                                                              |
|  - Mutex-Protected Atomic Write (.tmp + Rename) with Stale Order Housekeeping                      |
|  - Collections: merchants (coffeenity, senopati_cafe), waiterCalls, corsOrigins, auditLogs, aiConfig|
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Multi-Tenant Hybrid RAG Engine Specification

### 3.1 Knowledge Base Data Schema
Each registered merchant maintains an isolated knowledge base in `db.merchants[merchantId].knowledgeBase = [...]`:

```json
{
  "id": "rag_coff_01",
  "merchantId": "coffeenity",
  "category": "culinary_craft",
  "title": "Wood-Fired Pizza Dough & Kayu Api Oak Oven",
  "tags": ["pizza", "adonan", "fermentasi", "kayu api", "dough", "crust", "oven"],
  "content": "Adonan pizza Doughboy (@doughboy.pizzakyuapi) difermentasi lambat (cold-fermentation) selama 48 jam menggunakan ragi alami biga untuk menghasilkan kerak berongga (cornicione) yang renyah di luar dan lembut di dalam. Dipanggang dalam oven kayu api berbahan bakar kayu pohon rambutan dan oak pada suhu 450°C selama 90 detik. Saus menggunakan tomat San Marzano asli dan keju Fior di Latte mozzarella.",
  "updatedAt": "2026-09-03T00:00:00.000Z"
}
```

### 3.2 Core Knowledge Categories per Tenant
1. **`story_and_concept`**: Heritage, brand ethos, specialty roaster story.
2. **`bean_origins_and_roast`**: Bean varietals, washing/natural processing, elevation, tasting notes.
3. **`culinary_craft`**: Wood-fired ovens, 48-hour cold dough fermentation, artisan sourdough, baking techniques.
4. **`dietary_and_allergens`**: Lactose-free oat milk substitutions, gluten-free guidance, nut allergy warnings, 100% Halal ingredients.
5. **`amenities_and_faq`**: WiFi SSID and credentials, power outlets, prayer room (Musholla) locations, parking details, reservations.
6. **`sommelier_pairing_matrix`**: Gastronomic pairing recommendations (acidity contrast, sweetness balance).

### 3.3 In-Memory Hybrid Retrieval Engine (BM25 + TF-IDF)
The retrieval algorithm executes on every incoming user query:
1. **Tokenization & Normalization**: Strips punctuation, lowers case, splits terms into token sets for Indonesian, Malay, and English.
2. **Term Frequency-Inverse Document Frequency (TF-IDF)**: Computes chunk term weights based on document frequency across the merchant's knowledge repository.
3. **BM25 Scoring with Category Boosting**: Computes saturation-controlled term relevance with boost factors for title and tag matches.
4. **Top-K Selection**: Selects top 2–3 highest scoring chunks above threshold (Score >= 0.15).
5. **Prompt Augmentation**: Automatically injects retrieved chunks into Gemini 3.7 Flash system prompt under `[RETRIEVED KNOWLEDGE BASE / RAG GROUND-TRUTH]`.

### 3.4 Admin RAG REST API Endpoints
- `GET /api/admin/rag/documents`: Query all knowledge chunks for active tenant (supports `?category=`).
- `POST /api/admin/rag/documents`: Insert new knowledge chunk with automatic validation.
- `PUT /api/admin/rag/documents/:id`: Update existing knowledge chunk.
- `DELETE /api/admin/rag/documents/:id`: Delete knowledge chunk.
- `POST /api/admin/rag/test-query`: Test RAG retrieval against simulated user queries; returns ranked matches, scores, and highlighted snippets.

---

## 4. Hardened Multi-Origin CORS Specification

### 4.1 Allowed Origins Strategy
1. **Environment Variables**: `ALLOWED_ORIGINS` (comma-separated origins).
2. **Persistent Dynamic Whitelist**: Stored in `db.corsOrigins` and manageable through Admin API.
3. **Localhost & Development IPs**:
   - `http://localhost:*`, `http://127.0.0.1:*`
   - RFC1918 Private Ranges: `192.168.*.*`, `10.*.*.*`, `172.16-31.*.*`
4. **Mobile & Hybrid Apps**:
   - `capacitor://localhost`, `ionic://localhost`
   - Standalone PWA and native WebViews (`origin: undefined` / `origin: null`).

### 4.2 Preflight Protocol & Headers
- **Methods**: `GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD`
- **Allowed Headers**: `Content-Type, Authorization, x-admin-token, x-table-token, x-merchant-id, x-requested-by, x-session-id, idempotency-key, traceparent, baggage, Accept, Origin, Cache-Control, Pragma`
- **Exposed Headers**: `Retry-After, X-Content-Type-Options, Content-Type, x-merchant-id, x-rate-limit-remaining, x-rate-limit-reset`
- **Preflight Cache**: `Access-Control-Max-Age: 86400` (24 hours).
- **Credentials**: Explicit `Access-Control-Allow-Credentials: true` when origin matches whitelist.

### 4.3 Admin CORS REST API Endpoints
- `GET /api/admin/cors`: List all configured origins, active regex rules, and preflight policies.
- `POST /api/admin/cors`: Add new origin domain to persistent whitelist.
- `DELETE /api/admin/cors/:origin`: Remove origin domain from whitelist.
- `POST /api/admin/cors/test`: Simulate preflight OPTIONS validation for a test origin and method.

---

## 5. Admin Operations & KDS Business Logic

### 5.1 Staff Concierge & Waiter Call Lifecycle
- Customer or AI triggers `POST /api/waiter/call`.
- Server records call in `merchant.waiterCalls` with `status: 'pending'`.
- Broadcasts `CALL_WAITER` event over SSE with table number and reason.
- Admin views live calls in KDS panel (`GET /api/admin/waiter-calls`).
- Staff marks call resolved via `PATCH /api/admin/waiter-calls/:id` (`status: 'resolved'`).
- Broadcasts `WAITER_CALL_RESOLVED` event over SSE.

### 5.2 Cashier Payment Settlement State Machine
- Cash orders are placed in `PENDING_CASHIER` state.
- Cashier inspects pending orders on KDS / Order terminal.
- Cashier confirms receipt of cash via `PATCH /api/admin/orders/:id/payment` (`paymentStatus: 'PAID'`).
- Server persists payment status and broadcasts `ORDER_PAID` event over SSE.
- Kitchen begins order preparation immediately upon payment settlement.

### 5.3 Promotional Coupon & Pricing Engine
- Promos support percentage discounts (`type: 'percent'`) and fixed discounts (`type: 'fixed'`).
- Validates minimum spend (`minSpend`), maximum discount limit (`maxDiscount`), and active status.
- Admin endpoints: `GET /api/admin/promos`, `POST /api/admin/promos`, `DELETE /api/admin/promos/:id`.
- Client verification: `POST /api/promos/validate`.

---

## 6. Verification & Quality Plan

A dedicated test suite `tests/verify_enterprise_rag_and_cors.js` will verify:
1. Multi-tenant RAG retrieval precision (retrieving pizza dough craft for Coffeenity, bean origin for Senopati, WiFi credentials, and allergen info).
2. Gemini 3.7 Flash system prompt RAG injection integrity.
3. Admin RAG CRUD endpoints (`GET`, `POST`, `PUT`, `DELETE`, `test-query`).
4. Hardened dynamic CORS origin validation, whitelist persistence, and preflight OPTIONS responses.
5. Live Waiter Call lifecycle (`pending` -> `resolved`).
6. Cashier cash settlement lifecycle (`PENDING_CASHIER` -> `PAID`).
7. 100% pass rate across all 11 test suites.
