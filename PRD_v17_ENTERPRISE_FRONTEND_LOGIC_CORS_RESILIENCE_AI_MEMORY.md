# 📄 PRODUCT REQUIREMENTS DOCUMENT (PRD v17.0)
## AIODMA Enterprise Frontend Logic, All-Screen CORS Layer Resilience, Customer Memory & Multimodal AI Sommelier Architecture

**Document Version:** 17.0.0  
**Status:** Canonical Engineering Specification & Production Blueprint  
**Authors:** AIODMA Core Architecture & AI Research Engineering Team  
**Target Environments:** Modern Mobile Browsers (iOS Safari, Android Chrome), PWA Standalone, Tablets/iPads, Desktop Kiosks, and Cross-Origin Native WebViews  

---

### 1. Executive Summary & Vision

The **AIODMA (Artificial Intelligence Ordering & Dining Management Architecture)** platform enters Version 17.0 with a dedicated focus on the **Customer-Facing Frontend Experience**, **Cross-Origin Resource Sharing (CORS) Client Resilience across all display layers**, **Customer Habit & Conversational Memory Tracking**, **Universal Multi-Language Localization**, and **Multi-Currency Precision**.

Dining guests interface with AIODMA across diverse form factors—from personal smartphones scanning QR standees, to countertop iPads, touch kiosks, and embedded WebViews. PRD v17.0 specifies the complete frontend logic, state machines, network adapters, and AI conversational memory models required to deliver an intuitive, frictionless, zero-lag, and accessible ordering experience for every guest.

---

### 2. Core Architectural Pillars

```
+-----------------------------------------------------------------------------+
|                      AIODMA FRONTEND CLIENT LAYER                           |
+-----------------------------------------------------------------------------+
|  1. Multi-Screen Adaptability   2. Client-Side CORS   3. Customer Memory    |
|     (320px -> 4K Responsive)       Resilience Layer      & Habit Store      |
|     - CSS env(safe-area-inset)     - apiFetch() Client   - Dietary/Allergies|
|     - PWA Standalone Manifest      - Auto Host Resolver  - Sweetness/Milk   |
|     - Fluid Typography & Spacing   - Retry with Jitter   - Repeat Visit Rec |
+-----------------------------------------------------------------------------+
|  4. Multi-Language Engine       5. Multi-Currency     6. WCAG 2.2 AA        |
|     (ID / EN / MS)                 Financial Engine      Accessibility      |
|     - Real-Time Dynamic Toggle     - BND ($) / IDR (Rp)  - Screen Readers   |
|     - Full Dictionary Coverage     - Regional Tax Calc   - Focus Trapping   |
|     - Contextual AI Translation    - Subtotal Precision  - Touch Targets 44+|
+-----------------------------------------------------------------------------+
                                       |
                   HTTP/1.1 REST + Server-Sent Events (SSE)
                                       v
+-----------------------------------------------------------------------------+
|                      BACKEND MULTI-TENANT ENGINE                            |
+-----------------------------------------------------------------------------+
|  Hybrid RAG Engine (BM25)  |  Customer Profile Sync  |  Google Gemini 3.7   |
|  Dynamic CORS Whitelist    |  Real-Time KDS Events   |  Local Fallback Som. |
+-----------------------------------------------------------------------------+
```

---

### 3. Display Layer & Multi-Screen Viewport Ergonomics

#### 3.1 Supported Viewport Classes
AIODMA frontend adapts seamlessly across five primary display classes without artificial simulator cutouts, fake device bezels, or overflow glitches:
1. **Ultra-Compact Smartphone (320px – 375px)**: iPhone SE, older Android devices. Layout maintains single-column cards with responsive font clamping (`clamp(13px, 3.5vw, 15px)`).
2. **Flagship Smartphone (390px – 430px)**: iPhone 14/15/16 Pro, Samsung S23/S24, Google Pixel. Standard native App Clip feel with bottom navigation/cart bar pinned above `env(safe-area-inset-bottom)`.
3. **Foldables & Small Tablets (600px – 820px)**: iPad Mini, Galaxy Fold unfolded. Responsive 2-column menu grid, expanded modal dialogs.
4. **Tablets & Countertop Displays (834px – 1024px)**: iPad Air/Pro. Split-pane layout where chat assistant and visual menu catalog can be viewed simultaneously or toggled via mode switcher.
5. **Desktop & Interactive Kiosks (1200px+)**: Centered card canvas with max-width container (`480px` standard mobile canvas or full-width kiosk mode).

#### 3.2 PWA & Standalone Hardware Integration
- Manifest configuration (`manifest.json`) defines `display: standalone`, `orientation: portrait-primary`, and theme color `#F6F8FC` (Light) / `#0A0A0C` (Dark).
- Proper `apple-mobile-web-app-capable` and `apple-mobile-web-app-status-bar-style: black-translucent` ensure full utilization of the OLED display up to the physical notch/island.

---

### 4. Client-Side CORS Layer & Network Resilience

#### 4.1 Resilient API Client (`apiFetch`)
Cross-origin network requests must withstand real-world restaurant network instability (intermittent cafe Wi-Fi, cellular handoff, captive portals, preflight delays). The frontend uses a unified `apiFetch(endpoint, options)` wrapper:
- **Automatic Base URL Resolution**: Resolves relative paths (`/api/...`) or detects remote hosting origin based on `window.location.origin`.
- **Credentials & Headers**: Automatically attaches `credentials: 'include'`, `x-merchant-id`, `x-table-token`, and `Content-Type: application/json`.
- **Exponential Backoff & Jitter**: Automatically retries failed requests (HTTP 502/503/504 or network timeout) up to 3 times before displaying user-friendly offline notification.
- **Degraded Local Caching**: If network connection drops completely, catalog browsing, cart operations, and local sommelier responses remain functional using `localStorage` cache.

---

### 5. Customer Conversational Memory & Habit Intelligence

#### 5.1 Memory & Profile Schema (`CustomerMemoryManager`)
The customer frontend persistently stores habits in `localStorage.getItem('aiodma_customer_profile')`:
```json
{
  "customerId": "cust_98f12a",
  "visitCount": 3,
  "lastVisited": "2026-09-02T16:00:00.000Z",
  "preferences": {
    "sweetnessLevel": "less_sugar_50",
    "milkAlternative": "oat_milk",
    "temperature": "iced",
    "dietaryFlags": ["lactose_free", "halal"]
  },
  "allergies": ["kacang_tanah", "dairy"],
  "favoriteItems": ["kopi_milk_aren", "pizza_pepperoni"],
  "orderHistory": [
    {
      "orderNumber": "#5K0IZ",
      "date": "2026-08-28",
      "total": 68000,
      "items": ["Kopi Milk Aren (Oat Milk, Less Sugar)"]
    }
  ]
}
```

#### 5.2 Contextual Memory Fusion in AI Sommelier
When invoking `POST /api/ai/chat`, the frontend supplies:
1. `message`: Current guest input.
2. `customerProfile`: Saved preferences, allergies, and visit count.
3. `conversationHistory`: Array of recent conversational turns `[{ role: 'user', text: '...' }, { role: 'model', text: '...' }]`.

The backend merges this profile with retrieved **RAG Knowledge Chunks** to produce personalized interactions:
> *"Selamat datang kembali di The Coffeenity Yard! Senang melihat Anda lagi. Seperti biasa, apakah Anda ingin disiapkan Iced Latte dengan Oat Milk dan Less Sugar 50%, atau ingin mencoba Single Origin Ethiopia Guji kami hari ini?"*

---

### 6. Universal Multi-Language & Multi-Currency Engine

#### 6.1 Multi-Language Dictionary (`i18n`)
The UI supports 3 primary languages:
- **Bahasa Indonesia (`id`)**: Default for Senopati Cafe.
- **English (`en`)**: International guests.
- **Bahasa Melayu (`ms`)**: Localized for Brunei Darussalam (The Coffeenity Yard).

Guests can switch language anytime via the top header trigger or initial language selection screen (`#screenSelectLanguage`). Dynamic DOM updates reflect translation strings immediately without page reload.

#### 6.2 Multi-Currency & Financial Accuracy
- **Brunei Dollar (`BND`, `$`)**: Fixed 2 decimal places (`$9.50`), 0.0% sales tax.
- **Indonesian Rupiah (`IDR`, `Rp`)**: Separated with period thousands (`Rp 38.000`), 10.0% PB1 restaurant tax.
- Real-time subtotal, discount, tax, and grand total calculations are computed identically on both frontend and backend.

---

### 7. Accessibility (WCAG 2.2 AA Compliance)

1. **Screen Reader Announcements**: Uses `#accessibilityLiveRegion` with `aria-live="polite"` and `aria-atomic="true"` for cart additions, mode changes, and AI messages.
2. **Keyboard Navigation & Focus Trapping**: Modals (`customizerModal`, `cartDrawer`, `waiterModal`) trap focus within the active container, closing cleanly upon pressing `Esc`.
3. **Touch Target Dimensions**: Every interactive button, pill, stepper, and icon provides a clickable hit box of at least $44 \times 44$ pixels.
4. **Color Contrast**: Text and icons maintain a contrast ratio $\ge 4.5:1$ against backgrounds in both Light and Dark themes.

---

### 8. QA/QE Automated Test Suite Specification (Suite 12)

Test suite `tests/verify_frontend_logic_cors_and_memory.js` validates:
1. Customer memory persistence and multi-turn contextual recall in AI chat.
2. Fusion of customer profile (allergies, preferences) with RAG knowledge chunks.
3. Multi-language dictionary completeness and translation consistency.
4. Client-side CORS layer resilience, header dispatch, and error handling.
5. Multi-currency calculation precision for BND ($) and IDR (Rp).

Execution via `npm test` ensures **12/12 test suites pass with 100% reliability**.
