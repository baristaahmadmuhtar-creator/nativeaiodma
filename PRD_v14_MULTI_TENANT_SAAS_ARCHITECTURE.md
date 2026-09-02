# Product Requirement Document (PRD v14.0)
## AIODMA Multi-Tenant SaaS Platform & The Coffeenity Yard Onboarding Architecture

---

## 1. Executive Summary & SaaS Platform Vision

**AIODMA** is a next-generation **Multi-Tenant B2B SaaS Conversational Ordering Platform** engineered to empower modern cafes, artisan roasteries, and pizzerias with autonomous AI sommelier and ordering capabilities.

Instead of a single hardcoded restaurant system, AIODMA is structured as an **extensible multi-merchant platform** where independent food & beverage businesses subscribe as distinct tenants, each possessing:
- Isolated menu catalog & modifier hierarchies.
- Native multi-currency engine (Brunei Dollar BND `$`, Indonesian Rupiah IDR `Rp`, US Dollar USD `$`).
- Custom tax, pricing, and payment gateway configurations.
- Independent table management and localized QR standee tokens.
- Dedicated real-time Kitchen POS Display (KDS) stations and audit logs.
- Fine-tuned AI Barista & Sommelier conversational personas with brand-specific slot-filling rules.

### Tenant #1 (First Subscribed Merchant):
* **Merchant Name:** The Coffeenity Yard
* **Unit Usaha / Dapur Pizza:** Doughboy Pizza Kayu Api (`@doughboy.pizzakyuapi`)
* **Model Operasional:** Cafe, Artisan Filter Coffee, Wood-Fired Pizza, Breakfast & Bites
* **Lokasi / Wilayah:** Brunei Darussalam
* **Mata Uang:** Dollar Brunei (BND - `$`)
* **Tenant ID:** `coffeenity`

---

## 2. Multi-Tenant Architecture & Data Model

### A. Tenant Resolution Hierarchy
Requests entering AIODMA resolve the active tenant via:
1. **Query Parameter:** `?merchant=coffeenity` (e.g. on customer scan URL: `/?merchant=coffeenity&table=5`)
2. **HTTP Header:** `x-merchant-id: coffeenity` (e.g. on programmatic API / Mobile SDK calls)
3. **Request Body:** `{ "merchantId": "coffeenity", ... }` (on transactional POST/PATCH endpoints)
4. **Default System Fallback:** `db.defaultMerchantId` (configured to `"coffeenity"`)

### B. Database Schema (`data/db.json`)
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
      "taxRate": 0.0,
      "taxLabel": "Pajak (0%)",
      "tablesCount": 12,
      "paymentMethods": ["BIBD", "BAIDURI", "POCKET", "CASH"],
      "defaultLanguage": "ms-BN",
      "menu": [ ... ],
      "orders": [ ... ],
      "waiterCalls": [ ... ],
      "auditLogs": [ ... ],
      "stats": {
        "grossRevenue": 0.0,
        "totalOrdersToday": 0,
        "averageTicket": 0.0
      }
    },
    "senopati_cafe": { ... }
  },
  "aiConfig": {
    "model": "gemini-3.7-flash",
    "tone": "warm",
    "temperature": 0.7
  }
}
```

---

## 3. The Coffeenity Yard — Complete Menu Knowledge Base

### A. Wood-Fired Pizza (Doughboy Pizza Kayu Api)
Dipanggang dengan tungku kayu api tradisional (*traditional wood-fired oven*).

| Kategori | Nama Menu | Deskripsi / Komposisi | Reg (9") | Lrg (12") | Tag / Status |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Doughboy Original** | Margherita | Fresh mozzarella, basil, tomato sauce | - | $10.00 | Classic |
| | Creamy Mushroom Chicken | Chicken, mushroom, creamy sauce, mozzarella | - | $13.00 | **Best Seller** |
| | Hawaiian | Ham, bacon, pineapple, mozzarella, tomato sauce | - | $13.00 | Popular |
| **House Favorites** | Pepperoni | Pepperoni, capsicum, tomato sauce, mozzarella | $8.00 | $14.00 | Classic |
| | Honey Garlic Chicken | Chicken, honey garlic sauce, capsicum, mozzarella | $8.00 | $14.00 | Special Sauce |
| | Tuna Mayo | Tuna mixed mayo special sauce, capsicum, mozzarella, onion | $8.00 | $14.00 | Signature |
| | BBQ Chicken | Chicken, BBQ sauce, onion, mozzarella | $8.00 | $14.00 | Favorite |
| | Burger Pizza | Beef patty, classic burger sauce, mozzarella, pickle, tomato | $8.00 | $14.00 | **Best Seller** |
| **Loaded Legends** | 4 Cheese | Tomato base, mozzarella, cheddar, ricotta, parmesan cheese | $9.00 | $16.00 | Cheesy |
| | Supermeat | Ground beef, ham, bacon, capsicum, tomato base | $9.00 | $16.00 | Meat Lovers |
| | Salmon Mentai | Mentai mayo, smoked salmon, seaweed flakes, basil | $9.00 | $16.00 | **Best Seller** |

---

### B. Calzone & Indomee Custom Bar

#### 1. Calzone (Lipat Panggang Khas Italia)
* **Tuna Cheese Calzone:** $6.00
* **Meatlover Calzone:** $6.00

#### 2. Indomee Custom Bar
* **Base Indomee:** $2.00
* **Pilihan Topping Tambahan (Add-ons):**
  * Telur (*+Egg*): +$1.00
  * Kerang (*+Baby Clam*): +$2.00

---

### C. Breakfast Plates & Specialties (Menu Sarapan & All-Day Breakfast)

| Nama Menu | Deskripsi Rinci Piringan Sarapan | Harga |
| :--- | :--- | :---: |
| **Bigboy Breakfast** | Loaded breakfast plate dengan toasted bread, beef salami, sausage, fluffy omelette, sauteed mushrooms, baked beans, dan cherry tomatoes. | $12.50 |
| **Classic Rise** | Piring sarapan klasik dengan sunny eggs (telur mata sapi), baked beans, grilled tomatoes, sausage, dan toasted bread. | $9.50 |
| **Egg and Dip** | Toasted bread renyah disajikan dengan fluffy milk omelette lembut bertabur gurihnya savory tobiko. | $7.50 |
| **Golden Stack French Toast** | Roti celup telur tebal keemasan disiram melted butter gurih manis, disajikan hangat. | $6.50 |
| **The Sunny-Pan Pizza** | Prata wrap renyah dengan isian sunny-side-up eggs, beef pepperoni, dan zaitun hitam (olives). | $8.00 |

---

### D. Snacks, Sides, Churros & Waffle

#### 1. Savory Sides & Snacks
* **Beef Nachos:** $5.00
* **Sandwich (Pilihan Isian: Egg / Tuna):** $3.50
* **Spinach Cheese Dip:** $7.00
* **Tuna Cheesemelt:** $3.80
* **Fries (Pilihan Rasa: Original / Cheese):** $3.00

#### 2. Churros (Lengkap dengan Chocolate Dip Hangat)
* **Churros Original:** $2.50
* **Churros Cinnamon:** $3.00

#### 3. Waffle (Wajib Pilih 1 Spread)
* **Harga Satuan:** $2.50
* **Pilihan Spread:** Kaya, Peanut Butter, Chocolate, Planta

---

### E. Espresso-Based Coffee (Base Hot / Iced +$0.50)

| Menu Espresso | Base Price (Hot) | Iced Price (+$0.50) |
| :--- | :---: | :---: |
| **Americano** | $3.50 | $4.00 |
| **Latte** | $5.00 | $5.50 |
| **Flat White** | $5.00 | $5.50 |
| **Cappuccino** | $5.00 | $5.50 |
| **Mocha** | $5.00 | $5.50 |
| **Flavored Latte** (Vanilla/Caramel/Hazelnut) | $5.00 | $5.50 |
| **Spanish Latte** | $5.50 | $6.00 |
| **House Signature Latte** | $5.50 | $6.00 |

---

### F. Filter Coffee (Manual Brew Bar)

| Metode Seduh | Deskripsi Karakter | Harga |
| :--- | :--- | :---: |
| **V60** | Ekstraksi pour-over dengan profil rasa jernih (*clean cup*) dan aroma tajam. | $5.00 |
| **Japanese Drip** | Seduh drip langsung di atas es untuk rasa segar dan keasaman seimbang. | $5.50 |
| **Vietnam Drip** | Kopi tetes tradisional dengan karakter bold kental. | $5.00 |
| **AeroPress** | Metode tekanan udara untuk bodi tebal dan rasa pekat halus. | $5.00 |
| **Chemex** | Filtrasi tebal untuk profil kopi sangat bersih dan lembut. | $6.00 |

---

### G. Signature Specialty Drinks & Refresher

| Nama Menu | Deskripsi / Varian | Harga |
| :--- | :--- | :---: |
| **Yard Latte** | Signature house latte khas The Coffeenity Yard | $6.00 |
| **Brulee Latte** | Latte dengan lapisan karamelisasi gula ala creme brulee | $6.00 |
| **Honey Bee Latte** | Latte lembut dengan sentuhan madu alami | $6.00 |
| **Orange Americano** | Perpaduan segar sari jeruk asli dengan espresso bold | $5.00 |
| **Dirty Taro** | Perpaduan manis earthy taro dengan shot espresso pekat | $6.00 |
| **Garden Mojito** | Minuman dingin segar mint, lime, dan soda | $5.00 |
| **Ube Taro** | Minuman creamy rasa talas ube ungu | $5.00 |
| **Bali Taro** | Variasi taro khas dengan cita rasa creamy tropis | $5.00 |
| **Dalgona Saruaso** | Racikan dalgona whipped coffee khas | $6.00 |
| **Choco Loco** | Cokelat pekat premium ekstra creamy | $6.00 |
| **Chai Latte** | Teh rempah aromatik dipadu susu lembut | $5.50 |

---

### H. Matcha Series, Fruit Teas & Basic Beverages

#### 1. Matcha Series (Artisan Green Tea)
* **Classic Matcha:** $6.00
* **Matcha Ichigo (Strawberry):** $6.00
* **Matcha Mango:** $6.00
* **Matcha Earl Grey:** $7.00

#### 2. Refreshing Fruit Tea Bar ($4.00)
* **Strawberry Tea:** $4.00 | **Peach Tea:** $4.00 | **Passionate Tea (Markisa):** $4.00 | **Lychee Tea:** $4.00

#### 3. Basic & Refreshments
* **Pot of Tea:** $4.00 | **Babyccino:** $4.00 | **Mineral Water:** $1.50

---

## 4. Mandatory Conversational Slot-Filling & Smart Upselling

### A. Strict Slot-Filling Protocols
1. **Pemesanan Pizza:**
   * House Favorites & Loaded Legends: Wajib menanyakan ukuran (*"Mau ukuran Regular 9 inch [$8-$9] atau Large 12 inch [$14-$16]?"*).
   * Doughboy Original: Otomatis disajikan dalam ukuran 12 inch ($10.00 - $13.00).
2. **Pemesanan Minuman Kopi / Espresso:**
   * Wajib menanyakan suhu saji (*"Mau disajikan Panas (Hot) atau Dingin (Iced, +$0.50)?"*).
3. **Pemesanan Waffle:**
   * Wajib menanyakan pilihan spread (*"Untuk waffle-nya mau spread apa: Kaya, Peanut Butter, Chocolate, atau Planta?"*).
4. **Pemesanan Sandwich & Fries:**
   * Sandwich: Konfirmasi isian (**Egg** atau **Tuna**).
   * Fries: Konfirmasi varian rasa (**Original** atau **Cheese**).
5. **Pemesanan Indomee:**
   * Tawarkan opsi tambahan topping: *"+Egg (+$1.00) atau +Baby Clam (+$2.00)"*.

### B. Smart Contextual Upselling Pairings
* **Pizza / Calzone / Indomee** -> Tawarkan penyegar buah (**Garden Mojito** atau **Lychee Tea**).
* **Churros / French Toast / Waffle** -> Tawarkan kopi (**Americano** atau **House Signature Latte**).
* **Matcha Lovers** -> Tawarkan varian artisanal (**Matcha Ichigo** atau **Matcha Earl Grey**).

---

## 5. Multi-Tenant Output JSON Schema (POS Integration)

```json
{
  "merchant": {
    "id": "coffeenity",
    "name": "The Coffeenity Yard",
    "brand_unit": "Doughboy Pizza Kayu Api",
    "currency": "BND",
    "currency_symbol": "$"
  },
  "order_type": "DINE_IN", 
  "table_or_customer_id": "Table 04",
  "items": [
    {
      "item_id": "pizza_burger",
      "name": "Burger Pizza",
      "category": "Wood-Fired Pizza - House Favorites",
      "size": "12 Inch (Large)",
      "base_price": 14.00,
      "quantity": 1,
      "modifiers": [],
      "subtotal": 14.00
    },
    {
      "item_id": "coffee_spanish_latte",
      "name": "Spanish Latte",
      "category": "Espresso Drinks",
      "temperature": "ICED",
      "base_price": 5.50,
      "modifiers": [
        {
          "name": "Iced Option",
          "price": 0.50
        }
      ],
      "quantity": 2,
      "subtotal": 12.00
    },
    {
      "item_id": "snack_waffle",
      "name": "Waffle",
      "category": "Snacks & Waffle",
      "flavor_spread": "Peanut Butter",
      "base_price": 2.50,
      "modifiers": [],
      "quantity": 1,
      "subtotal": 2.50
    }
  ],
  "summary": {
    "total_items_count": 4,
    "subtotal": 28.50,
    "tax": 0.00,
    "discount": 0.00,
    "grand_total": 28.50
  }
}
```
