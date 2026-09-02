# PRD v12.0: Native Apple Swift 6 & SwiftUI iOS Architecture

## 1. Overview & Objective
Transform the entire AIODMA ecosystem into an authentic, deeply integrated **Native Apple iOS / SwiftUI (iOS 17 & 18 Ready)** application alongside the high-performance Web / PWA client.

---

## 2. SwiftUI Component Architecture

```
Swift/
├── Package.swift                             # Swift Package Manager Manifest (iOS 16+, macOS 13+)
└── AIODMA/
    ├── AIODMAApp.swift                       # SwiftUI App Entrypoint & WindowGroup Hierarchy
    ├── Models/
    │   ├── Language.swift                    # Multi-language localization model
    │   ├── MenuItem.swift                    # Menu, categories, modifiers, pairings
    │   ├── Order.swift                       # Order, CartItem, OrderStatus, PaymentMethod
    │   └── ThemeColors.swift                 # Semantic Cupertino UI Color Tokens & Hex Extensions
    ├── Services/
    │   └── NetworkService.swift              # Async/Await client for Node backend (/api/menu, /api/orders, /api/ai/chat)
    ├── ViewModels/
    │   ├── OrderViewModel.swift              # Cart management, live order tracking state & sync
    │   └── AICashierViewModel.swift          # Streaming AI chat state, function calling & fuzzy query
    ├── Views/
    │   ├── HeaderNavBarView.swift            # 3-element iOS Header (Back, Mode dropdown, 3-dots popup)
    │   ├── LiveActivityBannerView.swift      # OLED Jet Black Dynamic Island Capsule Overlay
    │   ├── OrderTrackerSheetView.swift       # 4-Step Interactive KDS Timeline Bottom Sheet
    │   ├── ChatCashierView.swift             # Native iOS Chat UI & Quick Sommelier Prompts
    │   ├── MenuCatalogView.swift             # 2-Column Product Grid & Modifier Selectors
    │   ├── CartBottomSheetView.swift         # Native iOS Drag-Handle Cart Sheet
    │   ├── PaymentSheetView.swift            # BIBD, Baiduri, Apple Pay & QRIS Checkout
    │   ├── OrderSuccessView.swift            # Order Confirmation & Tracker Launcher
    │   └── SelectLanguageView.swift          # Language Selection Screen
    └── Widgets/
        └── OrderTrackingLiveActivity.swift   # Apple ActivityKit & Dynamic Island Lock Screen Widget
```

---

## 3. Key iOS HIG & SwiftUI Innovations

1. **Zero Emojis — 100% SF Symbols**:
   - All visual markers rely on Apple SF Symbols (`cup.and.saucer.fill`, `flame.fill`, `sparkles`, `checkmark.circle.fill`, `bell.fill`, `ellipsis`).
2. **Apple Dynamic Island & Live Activity**:
   - Seamless ActivityKit support with `ActivityConfiguration(for: OrderTrackingAttributes.self)`.
   - Compact Leading/Trailing views and Expanded Regions for lock screen and dynamic island.
3. **CoreHaptics & Taptic Engine**:
   - `UIImpactFeedbackGenerator(style: .medium)` and `UINotificationFeedbackGenerator()` on all interactive taps.
4. **Frosted Glass / Materials**:
   - `.background(.ultraThinMaterial)` and `.presentationDetents([.medium, .large])` on modal presentations.
5. **Zero Layout Shift Overlay**:
   - Dynamic Island capsule is absolutely positioned at the top, floating without pushing content.
