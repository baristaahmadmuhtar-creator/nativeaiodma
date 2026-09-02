# Product Requirement Document (PRD v15.0)
## AIODMA Enterprise Backend Logic, Admin Operations UI/UX, Accessibility & E2E Production Architecture

---

## 1. Executive Summary & Strategic Scope

**AIODMA (Artificial Intelligence Ordering & Dining Management Architecture)** is an enterprise-grade, multi-tenant B2B conversational ordering platform built for modern specialty cafes, artisan bakeries, manual brew bars, and wood-fired pizzerias.

This specification document (PRD v15.0) establishes the canonical requirements for:
1. **Multi-Tenant SaaS Backend Engine**: True data and tenant isolation supporting multiple merchants (`coffeenity` in Brunei Dollar BND `$`, `senopati_cafe` in Indonesian Rupiah IDR `Rp`) with localized catalog, modifier pricing, tax rates, tables, and KDS queues.
2. **Enterprise Middleware & Security Layers**: Hardened CORS layer with regex origin verification, security headers (CSP, X-Frame-Options, XSS, nosniff), sliding-window rate limiters, idempotency caching, atomic ACID database persistence, and malicious payload sanitization.
3. **Conversational AI Sommelier & Guardrail Architecture**: Gemini 3.7 Flash proxy with balanced thinking budget (512 tokens), zero-exposure API key architecture, prompt injection defense, dynamic time-of-day meal cadence, and sommelier pairing matrices.
4. **Universal Accessibility (WCAG 2.2 Level AA / AAA Compliant)**: Full semantic HTML5 landmarks, ARIA live regions (`aria-live="polite"`), high-contrast focus rings (`:focus-visible`), full keyboard navigability (Tab, Enter, Space, Escape on modals), and screen-reader optimized attributes.
5. **Harmonized Design System (Admin Portal & Customer Mobile PWA / iOS SwiftUI)**: Apple Human Interface Guidelines (HIG 2026), liquid glassmorphism, 5-token typography scale, unified Warm Cafe color tokens (`--brand-espresso`, `--brand-caramel`, `--brand-amber`, `--brand-green`, `--bg-system`, `--bg-card`), and fluid spring micro-interactions.
6. **End-to-End Real-Time Operations**: Server-Sent Events (SSE) broadcaster with tenant-isolated channels for live KDS order tracking, instant 86 out-of-stock toggling, table status synchronization, and audio cues.

---

## 2. Multi-Tenant Backend Engine & Data Schema

### 2.1 Multi-Tenant Hierarchy & Dynamic Resolution
Every incoming HTTP request resolves the active tenant through the following strict precedence cascade:
1. **Query Parameter:** `?merchant=coffeenity` or `?merchant=senopati_cafe`
2. **HTTP Header:** `x-merchant-id: coffeenity`
3. **Request Body:** `{ "merchantId": "coffeenity", ... }`
4. **Default System Fallback:** `coffeenity` (The Coffeenity Yard)

### 2.2 Merchant Schema Specification
```json
{
  "defaultMerchantId": "coffeenity",
  "merchants": {
    "coffeenity": {
      "id": "coffeenity",
      "name": "The Coffeenity Yard",
      "brandUnit": "Doughboy Pizza Kayu Api (@doughboy.pizzakyuapi)",
      "tagline": "Cafe, Artisan Filter Coffee, Wood-Fired Pizza, Breakfast & Bites",
      "currency": "BND",
      "currencySymbol": "$",
      "currencyDecimals": 2,
      "taxRate": 0.00,
      "taxLabel": "Pajak (0%)",
      "tablesCount": 12,
      "paymentMethods": ["BIBD", "BAIDURI", "POCKET", "CASH"],
      "defaultLanguage": "ms-BN",
      "menu": [ ... 62 Curated Items ... ],
      "orders": [ ... ],
      "waiterCalls": [ ... ],
      "auditLogs": [ ... ],
      "stats": {
        "grossRevenue": 0.00,
        "totalOrdersToday": 0,
        "averageTicket": 0.00
      }
    },
    "senopati_cafe": {
      "id": "senopati_cafe",
      "name": "Senopati Artisan Cafe",
      "brandUnit": "Kopi Kenangan Group",
      "tagline": "Specialty Coffee, Gourmet Pastry & Artisanal Bites",
      "currency": "IDR",
      "currencySymbol": "Rp",
      "currencyDecimals": 0,
      "taxRate": 0.10,
      "taxLabel": "PB1 (10%)",
      "tablesCount": 8,
      "paymentMethods": ["QRIS", "BCA", "MANDIRI", "CASH"],
      "defaultLanguage": "id-ID",
      "menu": [ ... 36 Curated Items ... ],
      "orders": [ ... ],
      "waiterCalls": [ ... ],
      "auditLogs": [ ... ],
      "stats": {
        "grossRevenue": 4820000,
        "totalOrdersToday": 48,
        "averageTicket": 100416
      }
    }
  },
  "aiConfig": {
    "apiKey": "",
    "model": "gemini-3.7-flash",
    "tone": "warm",
    "temperature": 0.7,
    "thinkingBudget": 512,
    "maxOutputTokens": 600,
    "remainingCredits": 48155,
    "totalInputTokens": 1420,
    "totalOutputTokens": 2880
  }
}
```

---

## 3. Backend Middleware Layers & Security Protocol

```
+-------------------------------------------------------------------------+
|                         INCOMING HTTP / SSE REQUEST                     |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
| [Layer 1] Enterprise Security Headers & Hardened CORS Middleware        |
| - X-Content-Type-Options: nosniff | X-Frame-Options: SAMEORIGIN        |
| - X-XSS-Protection: 1; mode=block | Referrer-Policy: strict-origin-when |
| - Dynamic CORS Regex: localhost, private RFC1918 IPs, standalone PWA    |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
| [Layer 2] Sliding Window Rate Limiter & Malformed Payload Shield        |
| - IP + Route Hash Window: Orders (20/min), AI Chat (30/min), Auth (10)  |
| - Safe JSON Syntax Error interceptor -> 400 with structured error code  |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
| [Layer 3] Multi-Tenant Context Resolver Middleware                      |
| - Resolves req.merchant from query (?merchant=), header (x-merchant-id) |
| - Mounts active tenant DB slice, currency formatter & tax configuration |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
| [Layer 4] RBAC & Admin Authentication Guard                             |
| - Bearer Token / x-admin-token verification (Owner / Manager / Cashier) |
| - HMAC-SHA256 Table Standee Token verification                          |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
| [Layer 5] Idempotency Engine & Financial Integrity Layer                |
| - Server-side price recalculation against official tenant catalog       |
| - Addon surcharge mathematical verification (Zero Client Tampering)     |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
| [Layer 6] ACID Atomic Storage & Real-Time SSE Broadcaster               |
| - Write-to-temp file + atomic rename sync                               |
| - Real-time SSE dispatch to matching merchant channel                   |
+-------------------------------------------------------------------------+
```

---

## 4. REST API Endpoint Specification

### 4.1 Tenant & Catalog Endpoints
* `GET /api/merchants`: List all registered tenant profiles with metadata.
* `GET /api/merchants/:id`: Retrieve detailed configuration for a specific merchant.
* `GET /api/menu`: Retrieve active menu catalog filtered by resolved merchant (supports `?merchant=`).
* `GET /api/menu/categories`: List distinct categories with item counts.
* `GET /api/tables/:num/qr`: Generate on-the-fly vector SVG standee QR code pointing directly to `/?merchant=<id>&table=<num>&token=<hmac>`.

### 4.2 Order & KDS Endpoints
* `POST /api/orders`: Submit new order with server-side modifier & pricing recalculation, idempotency verification, and real-time SSE push.
* `GET /api/orders/:id`: Lookup specific order status and receipt items.
* `GET /api/orders/table/:tableNum`: Lookup active orders for a table.
* `GET /api/admin/orders`: Full KDS feed for authenticated tenant.
* `PATCH /api/admin/orders/:id/status`: Transition order lifecycle (`received` -> `preparing` -> `ready` -> `completed` / `cancelled`).
* `POST /api/waiter/call`: Dispatch staff assistance call to table.

### 4.3 Admin Operations & Catalog Management
* `POST /api/admin/login`: Multi-tenant admin authentication yielding scoped session token.
* `GET /api/admin/stats`: Real-time tenant operational metrics (Gross Revenue, Active Tickets, AI Credits, Currency).
* `PATCH /api/admin/menu/:id/toggle-stock`: Instant 86 out-of-stock toggle.
* `POST /api/admin/menu`: Create new menu item with category, modifiers, pairings, and dietary flags.
* `PUT /api/admin/menu/:id`: Update existing item attributes and modifier hierarchies.
* `DELETE /api/admin/menu/:id`: Remove item from catalog.
* `GET /api/admin/audit-logs`: Searchable chronological audit trail.

### 4.4 AI Sommelier & Configuration Endpoints
* `POST /api/ai/chat`: Gemini 3.7 Flash conversational sommelier proxy with 6 tool declarations (`addToCart`, `removeFromCart`, `showRecommendations`, `openMenuCatalog`, `proceedToPayment`, `callWaiter`, `checkOrderStatus`).
* `POST /api/ai/vision`: Multimodal visual dish recognition.
* `POST /api/ai/ping`: Latency and health verification against Gemini API.
* `GET /api/ai/config`: Public AI engine metadata (Zero Key Exposure).
* `GET /api/admin/config`: Secure admin configuration view with masked API keys.
* `POST /api/admin/config`: Update server AI parameters (model, thinking budget, temperature, tone).

---

## 5. Universal Accessibility (a11y) & WCAG 2.2 AA Compliance

| Dimension | Compliance Standard | Implementation |
| :--- | :--- | :--- |
| **Landmarks & Semantics** | WCAG 1.3.1 Info & Relationships | Header (`role="banner"`), Sidebar (`role="navigation"`), Main Content (`role="main"`), Modals (`role="dialog" aria-modal="true"`), KDS live feed (`role="region" aria-live="polite"`). |
| **Keyboard Navigation** | WCAG 2.1.1 Keyboard Accessible | Logical Tab order, Enter/Space activation on cards, Escape key to dismiss modals/sheets, visible focus indicator with 2px solid ring (`:focus-visible`). |
| **Color Contrast** | WCAG 1.4.3 Contrast (Minimum 4.5:1) | Text on background >= 4.5:1, UI components & active badges >= 3:1. Full high-contrast mode support. |
| **Screen Reader Support** | WCAG 4.1.2 Name, Role, Value | `.sr-only` descriptive helpers, `aria-label` on icon-only buttons, `aria-expanded` on accordion/dropdowns, `aria-haspopup="dialog"`. |
| **Motion & Physical Ergonomics** | WCAG 2.3.3 Animation from Interactions | `@media (prefers-reduced-motion: reduce)` support with instant transitions, 44x44px minimum touch targets. |

---

## 6. Unified Design System & Visual Token Architecture

Both Admin Operations and Customer Web/Mobile apps share identical visual tokens:

```css
:root {
  /* Warm Cafe Artisan Accents */
  --brand-espresso: #382115;
  --brand-caramel: #C27D38;
  --brand-amber: #D97706;
  --brand-green: #10B981;
  --brand-cream: #F8EFE3;
  --apple-blue: #007AFF;
  --apple-red: #EF4444;

  /* Surfaces & Backgrounds */
  --bg-system: #F4F5F8;
  --bg-surface: rgba(255, 255, 255, 0.88);
  --bg-card: #FFFFFF;
  --bg-subtle: #ECEEF2;
  --border-hairline: rgba(0, 0, 0, 0.08);

  /* Typography 5-Token Hierarchy */
  --font-display: -apple-system, "SF Pro Display", "Plus Jakarta Sans", sans-serif;
  --font-body: -apple-system, "SF Pro Text", "Plus Jakarta Sans", sans-serif;
  --font-mono: "JetBrains Mono", SFMono-Regular, Menlo, monospace;
}
```

---

## 7. Execution & Verification Roadmap

1. **Step 1: Backend Server Refactor (`server.js`)**
   - Inject multi-tenant context resolution for all endpoints.
   - Support `coffeenity` (62 BND items) and `senopati_cafe` (36 IDR items).
   - Implement SVG QR code generator endpoint `/api/tables/:num/qr`.
   - Implement multi-tenant `/api/merchants` registry and multi-tenant admin order/stats feeds.
   - Refine Gemini 3.7 Flash thinking budget and sommelier prompt templates.

2. **Step 2: Database Catalog Seed (`data/db.json`)**
   - Structure `merchants.coffeenity` with complete 62-item wood-fired pizza, breakfast, calzone, coffee, filter manual brew, and specialty catalog.
   - Structure `merchants.senopati_cafe` with 36-item Indonesian cafe catalog.

3. **Step 3: Admin Operations Portal Modernization (`admin.html`, `js/admin.js`, `css/admin.css`)**
   - Add live Tenant & Currency Switcher in Topbar.
   - Synchronize all 11 admin tabs (Analytics, KDS, Table QR, Menu 86, Promo, AI Config, Credit, Security, Integrations, Audit Log, Docs).
   - Inject complete ARIA landmarks, focus rings, and keyboard shortcuts.

4. **Step 4: Customer Frontend & Swift Network Layer Alignment (`js/app.js`, `Swift/`)**
   - Ensure customer app dynamically adapts currency symbol and menu items based on active merchant.
   - Align Swift `NetworkService.swift` and models with multi-tenant headers and DTOs.

5. **Step 5: End-to-End Quality Engineering Verification**
   - Execute test suites: `tests/verify_multi_tenant_coffeenity.js`, `tests/verify_ai_sommelier_and_a11y.js`, `tests/e2e_qe_audit.js`.
