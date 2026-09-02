# 🚀 AIODMA — Artificial Intelligence Ordering & Dining Management Architecture

[![Node.js Version](https://img.shields.io/badge/node.js-v18%2B-brightgreen.svg)](https://nodejs.org/)
[![Express Version](https://img.shields.io/badge/express-v5.2-blue.svg)](https://expressjs.com/)
[![AI Model](https://img.shields.io/badge/Gemini-3.7--Flash-orange.svg)](https://deepmind.google/technologies/gemini/)
[![Accessibility](https://img.shields.io/badge/WCAG-2.2%20AA%2FAAA-purple.svg)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![Design System](https://img.shields.io/badge/Design-Apple%20HIG%202026-black.svg)](https://developer.apple.com/design/human-interface-guidelines/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**AIODMA** is an enterprise-grade, multi-tenant B2B conversational dining platform designed for specialty manual brew coffee bars, artisan bakeries, and wood-fired pizzerias across Southeast Asia.

---

## 🏛️ System Architecture

```
+----------------------------------------------------------------------------------------------------+
|                                    AIODMA PRODUCTION ECOSYSTEM                                     |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [📱 Customer Mobile Web / PWA]                 [🖥️ Operations & Kitchen Display (KDS)]            |
|  - Table QR Auto-Detection (?table=X)           - Dedicated Real-Time KDS (/admin.html#kds)         |
|  - Apple HIG Crystal Liquid Glass UI            - Multi-Tenant Kanban (Received/Prep/Ready/Paid)    |
|  - Gemini 3.7 Flash Conversational Sommelier    - Cashier Payment Confirmation Terminal             |
|  - Addon Modifiers & In-Place Steppers          - Instant 86 Out-of-Stock Catalog Synchronization   |
|  - Dynamic BND ($) & IDR (Rp) Currencies        - Live Revenue Analytics & Token Ledger             |
|  - ESC/POS Digital Thermal Receipt              - Cryptographic Vector SVG QR Standee Engine        |
|                                                                                                    |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                               ⚙️ CORE BACKEND ENGINE (Node.js/Express)                             |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [🛡️ Security & Guardrail Layer]                                                                    |
|  - Regex Dynamic CORS Whitelist | Security Headers (CSP, Frame-Options, XSS, nosniff)              |
|  - Sliding-Window Rate Limiters (Chat: 30 req/min, Orders: 20 req/min, Auth: 10 req/15min)          |
|  - Strict Bearer & Token Authentication (Zero Referer Bypass | HMAC Signed Standee Tokens)         |
|                                                                                                    |
|  [🧠 Multi-Tenant AI Sommelier Proxy]                                                              |
|  - Server-Side Gemini 3.7 Flash Proxy (512-Token Balanced Thinking Budget | Zero API Key Leak)     |
|  - Function Calling Router (addToCart, showRecommendations, proceedToPayment, callWaiter)          |
|  - Strict Zero-Emoji & Situational Multi-Bubble Cadence Policy                                     |
|                                                                                                    |
|  [💳 Financial & Transaction State Machine]                                                        |
|  - Server-Side Modifier & Price Recalculation (Zero Client-Side Financial Tampering)               |
|  - Idempotency Shield preventing duplicate submissions                                             |
|  - Cashier Handoff State Machine (CASH -> PENDING_CASHIER -> PAID -> PREPARING -> READY)           |
|                                                                                                    |
|  [⚡ Real-Time Event Bus (Server-Sent Events)]                                                      |
|  - Tenant-Isolated SSE Stream (/api/events) with 15s Heartbeat Ping & Exponential Backoff Reconnect |
|  - Event Types: ORDER_CREATED, ORDER_STATUS_CHANGED, ORDER_PAID, MENU_UPDATED, CALL_WAITER         |
|                                                                                                    |
|  [💾 ACID Persistence Layer]                                                                       |
|  - Atomic Write Mutex (Write to .tmp + Rename) with Stale Order Housekeeping                       |
|  - Multi-Tenant Schema: merchants (coffeenity, senopati_cafe), waiterCalls, auditLogs, aiConfig   |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## ✨ Key Enterprise Capabilities

### 1. Multi-Tenant SaaS Architecture
True tenant and data isolation supporting multi-currency and regional taxation:
- **The Coffeenity Yard** (`coffeenity`): Brunei Dollar (`BND $`), 0% Tax, 62 curated items (Wood-Fired Pizza, Calzone, Indomee, Manual Brew, Waffles).
- **Senopati Artisan Cafe** (`senopati_cafe`): Indonesian Rupiah (`IDR Rp`), 10% PB1 Tax, 36 curated items (Specialty Espresso, Gourmet Pastries, Artisanal Bites).

### 2. Conversational Master Sommelier AI
- Powered by Google **Gemini 3.7 Flash** with reasoning thinking budget (512 tokens).
- Pure server-side proxy ensuring zero browser exposure of secret API keys.
- Adversarial prompt injection and jailbreak defense.
- Dynamic situational multi-bubble cadence (`\n\n` separation).
- Strict Zero-Emoji policy for sophisticated gastronomy atmosphere.

### 3. Real-World Payment & Cashier Handoff
- **Cash Orders (`CASH`)**: Automatically placed into `PENDING_CASHIER` state; table receives instructions to settle at counter.
- **Cashier Confirmation**: Staff confirms payment through `PATCH /api/admin/orders/:id/payment`, transitioning to `PAID` and notifying kitchen.
- **Digital Orders (`BIBD`, `QRIS`, `BCA`)**: Settle instantly into `PAID` state.

### 4. Real-Time Staff Concierge (Waiter Calls)
- Customers or AI dispatch staff requests via `POST /api/waiter/call`.
- Recorded with persistent tracking in `waiterCalls`.
- Instant audio chime and visual alert dispatched to KDS screens.
- Resolvable via `PATCH /api/admin/waiter-calls/:id`.

### 5. Local Standalone QR Generator
- On-the-fly vector SVG generator at `GET /api/tables/:num/qr`.
- Zero 3rd-party external API dependencies.
- Embeds active merchant and table number directly.

### 6. Universal Accessibility (WCAG 2.2 Level AA / AAA)
- Full semantic HTML5 landmarks (`role="banner"`, `role="navigation"`, `role="main"`, `role="dialog"`).
- Polite ARIA live regions for order status notifications (`aria-live="polite"`).
- Keyboard navigable focus management with `:focus-visible` high-contrast rings and Escape modal dismissals.
- True OLED Dark Mode (`#000000` system canvas, liquid glass materials).

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher
- npm v9.0.0 or higher

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/aiodma.git
cd aiodma

# Install dependencies
npm install

# Start the production server
npm start
```

### Environment Variables (Optional)
Create a `.env` file or export environment variables:
```bash
PORT=8080                    # Default HTTP port (default: 8080)
GEMINI_API_KEY=AIzaSy...     # Google Gemini API Key
ADMIN_SECRET_PIN=8888        # Master Admin Authentication PIN
NODE_ENV=production          # Environment mode
```

---

## 🌐 Live URLs

| Interface | URL | Description |
|---|---|---|
| **Customer App (Coffeenity, BND)** | `http://localhost:8080/?merchant=coffeenity&table=5` | Brunei outlet in BND `$`, 0% Tax |
| **Customer App (Senopati, IDR)** | `http://localhost:8080/?merchant=senopati_cafe&table=5` | Indonesia outlet in IDR `Rp`, 10% Tax |
| **Kitchen KDS & Operations Hub** | `http://localhost:8080/admin.html#kds` | Real-time Kanban, 86 Stock, Analytics |
| **Live SSE Stream** | `http://localhost:8080/api/events` | Server-Sent Events real-time event bus |
| **Health Check** | `http://localhost:8080/api/health` | Service health status and uptime |

---

## 🧪 Comprehensive QA/QE Test Suite

AIODMA includes **10 automated end-to-end test suites** covering all security, financial, real-time, and UI aspects:

```bash
# Run all 10 test suites in sequence
npm test
```

### Suite Breakdown
1. **`tests/e2e_qe_audit.js`**: CORS preflight protocol, security headers, malformed payload resilience, rate limiting, price recalculation, and SSE connection.
2. **`tests/verify_zero_simulation_production.js`**: Zero-simulation verification, strict auth without referer bypass, cash settlement handoff, and waiter call tracking.
3. **`tests/verify_multi_tenant_coffeenity.js`**: Multi-tenant B2B isolation between Coffeenity (BND) and Senopati (IDR).
4. **`tests/simulation_e2e_deep.js`**: Multi-turn conversational flow, category consultation, modifier extraction, and KDS status dialogue.
5. **`tests/verify_all_11_admin_modules.js`**: Analytics, KDS, Table QR, Menu 86, Promos, AI Config, Token Ledger, Staff RBAC, Webhooks, and Audit Logs.
6. **`tests/verify_menu_modifiers_admin.js`**: Addons, sizing surcharges, stock toggling, and admin catalog editing.
7. **`tests/verify_ai_sommelier_and_a11y.js`**: WCAG 2.2 AA accessibility, dialog focus trapping, polite live regions, and Gemini 3.7 Flash settings.
8. **`tests/verify_menu_card_recommendations.js`**: Interactive menu recommendation card post-processing and slang matching.
9. **`tests/verify_apple_dark_mode.js`**: Apple HIG OLED dark mode, color contrast, and glassmorphism.
10. **`tests/test_user_experience_flow.js`**: Ergonomic cart steppers, borderless input fields, and UI isolation.

---

## 📡 REST API Reference

### Tenant & Catalog
- `GET /api/merchants` — List all registered tenant profiles.
- `GET /api/merchants/:id` — Retrieve merchant metadata and payment methods.
- `GET /api/menu?merchant=:id` — Get active menu catalog for tenant.
- `GET /api/tables/:num/qr?merchant=:id` — Generate local vector SVG standee QR code.

### Orders & Kitchen KDS
- `POST /api/orders` — Create new order with server recalculation and idempotency check.
- `GET /api/orders/:id` — Query specific order status and receipt.
- `GET /api/admin/orders` — Authenticated full KDS order feed.
- `PATCH /api/admin/orders/:id/status` — Transition order lifecycle (`received` -> `preparing` -> `ready` -> `completed`).
- `PATCH /api/admin/orders/:id/payment` — Settle cash payment (`PENDING_CASHIER` -> `PAID`).
- `POST /api/waiter/call` — Dispatch table assistance request.
- `GET /api/admin/waiter-calls` — List active waiter calls.
- `PATCH /api/admin/waiter-calls/:id` — Resolve waiter call.

### AI Sommelier & Configuration
- `POST /api/ai/chat` — Gemini 3.7 Flash conversational proxy with function calling.
- `POST /api/ai/vision` — Multimodal dish recognition and catalog matching.
- `GET /api/ai/config` — Public AI engine metadata.
- `POST /api/admin/config` — Update AI model, temperature, and thinking budget.
- `POST /api/ai/ping` — Test connection and latency to Gemini gateway.

---

## 🐳 Docker Deployment

```bash
# Build Docker image
docker build -t aiodma:latest .

# Run container
docker run -d -p 8080:8080 --name aiodma-app aiodma:latest
```

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
