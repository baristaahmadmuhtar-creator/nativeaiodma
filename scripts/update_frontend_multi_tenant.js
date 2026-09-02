const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const coffeenityMenu = db.merchants.coffeenity.menu;

// ==========================================
// 1. UPDATE js/app.js
// ==========================================
const appJsPath = path.join(__dirname, '..', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// Update State initialization
const stateRegex = /\/\/ --- STATE MANAGEMENT ---\r?\n\s*const state = \{[\s\S]*?\n\s*\};/;
const newStateCode = `// --- MULTI-TENANT MERCHANT STATE ---
  const urlParams = new URLSearchParams(window.location.search);
  const initialMerchantId = (urlParams.get('merchant') || 'coffeenity').toLowerCase().trim();
  const initialTableId = parseInt(urlParams.get('table') || urlParams.get('meja') || '5', 10) || 5;

  const state = {
    merchantId: initialMerchantId,
    merchant: {
      id: 'coffeenity',
      name: 'The Coffeenity Yard',
      brandUnit: 'Doughboy Pizza Kayu Api (@doughboy.pizzakyuapi)',
      tagline: 'Cafe, Artisan Filter Coffee, Wood-Fired Pizza, Breakfast & Bites',
      currency: 'BND',
      currencySymbol: '$',
      currencyDecimals: 2,
      taxRate: 0.00,
      taxLabel: 'Pajak (0%)',
      paymentMethods: ['BIBD', 'BAIDURI', 'POCKET', 'CASH'],
      categories: [
        { id: 'all', name: 'Semua' },
        { id: 'pizza', name: 'Pizza Kayu Api' },
        { id: 'calzone_indomee', name: 'Calzone & Indomee' },
        { id: 'breakfast', name: 'Breakfast' },
        { id: 'snacks_waffle', name: 'Snacks & Waffle' },
        { id: 'espresso', name: 'Espresso' },
        { id: 'filter_coffee', name: 'Filter Coffee' },
        { id: 'signatures', name: 'Signatures' },
        { id: 'matcha_tea', name: 'Matcha & Tea' }
      ]
    },
    selectedLang: 'ms-BN',
    currentScreen: 'screenSelectLanguage',
    currentMode: 'chat',
    activeCategory: 'all',
    searchQuery: '',
    soundEnabled: true,
    tableId: initialTableId,
    orderId: null,
    orderTrackingActive: false,
    activeOrder: null,
    receiptOrderId: null,
    selectedPaymentMethod: 'BIBD',
    favorites: new Set(['pizza_margherita', 'pizza_burger', 'coffee_spanish_latte', 'snack_waffle']),
    cart: [],
    kdsOrders: [],
    aiChatHistory: []
  };`;

appJs = appJs.replace(stateRegex, newStateCode);

// Replace default menuCatalog with Coffeenity 46 items
const menuCatalogRegex = /\/\/ --- MENU CATALOG DATA ---\r?\n\s*\/\/ --- MENU CATALOG DATA[\s\S]*?const menuCatalog = \[[\s\S]*?\n\s*\];/;
const newMenuCatalogCode = `// --- MENU CATALOG DATA (Dynamic Multi-Tenant Catalog) ---
  let menuCatalog = ${JSON.stringify(coffeenityMenu, null, 2)};`;

appJs = appJs.replace(menuCatalogRegex, newMenuCatalogCode);

// Update formatRupiah to universal formatCurrency
const formatRupiahRegex = /\/\/ --- FORMATTING UTILS ---\r?\n\s*function formatRupiah\(amount\) \{\r?\n\s*return 'Rp ' \+ Number\(amount\)\.toLocaleString\('id-ID'\);\r?\n\s*\}/;
const newFormattingCode = `// --- UNIVERSAL MULTI-CURRENCY FORMATTING UTILS ---
  function formatCurrency(amount) {
    const num = Number(amount) || 0;
    const sym = state.merchant?.currencySymbol || '$';
    const dec = state.merchant?.currencyDecimals ?? 2;
    if (state.merchant?.currency === 'IDR') {
      return 'Rp ' + Math.round(num).toLocaleString('id-ID');
    }
    return \`\${sym}\${num.toFixed(dec)}\`;
  }
  const formatRupiah = formatCurrency;`;

appJs = appJs.replace(formatRupiahRegex, newFormattingCode);

// Update getCartTax and getCartTotal
const cartTaxRegex = /function getCartTax\(subtotal\) \{\r?\n\s*return Math\.round\(subtotal \* 0\.1\);\r?\n\s*\}\r?\n\r?\n\s*function getCartTotal\(\) \{\r?\n\s*const sub = getCartSubtotal\(\);\r?\n\s*return sub \+ getCartTax\(sub\);\r?\n\s*\}/;
const newCartTaxCode = `function getCartTax(subtotal) {
    const rate = typeof state.merchant?.taxRate === 'number' ? state.merchant.taxRate : 0.0;
    return Math.round((subtotal * rate) * 100) / 100;
  }

  function getCartTotal() {
    const sub = getCartSubtotal();
    return Math.round((sub + getCartTax(sub)) * 100) / 100;
  }`;

appJs = appJs.replace(cartTaxRegex, newCartTaxCode);

// Update getModifiersForItem in Customizer
const modifiersDefRegex = /const MODIFIERS_BY_CATEGORY = \{[\s\S]*?\n\s*\};\r?\n\r?\n\s*\/\/ --- MODIFIER \/ PRODUCT CUSTOMIZER ENGINE ---/;
const newModifiersCode = `const MODIFIERS_BY_CATEGORY = {
    'pizza': [
      {
        id: 'size',
        title: 'Pilihan Ukuran (Size)',
        type: 'radio',
        defaultIdx: 0,
        options: [
          { label: 'Regular (9 inch)', val: 'Regular (9 inch)', price: 0 },
          { label: 'Large (12 inch) (+$6.00)', val: 'Large (12 inch)', price: 6.00 }
        ]
      },
      {
        id: 'addons',
        title: 'Topping Tambahan Pizza',
        type: 'checkbox',
        options: [
          { name: 'Extra Mozzarella', price: 2.00 },
          { name: 'Garlic Mayo Dip', price: 1.00 }
        ]
      }
    ],
    'espresso': [
      {
        id: 'temperature',
        title: 'Suhu Penyajian',
        type: 'radio',
        defaultIdx: 0,
        options: [
          { label: 'Hot (Panas)', val: 'Hot (Panas)', price: 0 },
          { label: 'Iced (Dingin) (+$0.50)', val: 'Iced (Dingin)', price: 0.50 }
        ]
      },
      {
        id: 'milk',
        title: 'Pilihan Susu',
        type: 'radio',
        defaultIdx: 0,
        options: [
          { label: 'Fresh Milk', val: 'Fresh Milk', price: 0 },
          { label: 'Oat Milk (+ $1.00)', val: 'Oat Milk', price: 1.00 }
        ]
      },
      {
        id: 'sugar',
        title: 'Level Manis (Sugar)',
        type: 'radio',
        defaultIdx: 2,
        options: [
          { label: 'No Sugar (0%)', val: 'No Sugar (0%)', price: 0 },
          { label: 'Less Sugar (50%)', val: 'Less Sugar (50%)', price: 0 },
          { label: 'Normal (100%)', val: 'Normal Sugar (100%)', price: 0 }
        ]
      },
      {
        id: 'addons',
        title: 'Ekstra Shot (Opsional)',
        type: 'checkbox',
        options: [
          { name: 'Extra Espresso Shot', price: 1.00 }
        ]
      }
    ],
    'filter_coffee': [
      {
        id: 'temperature',
        title: 'Penyajian Suhu',
        type: 'radio',
        defaultIdx: 0,
        options: [
          { label: 'Hot (Panas)', val: 'Hot', price: 0 },
          { label: 'Iced (Dingin)', val: 'Iced', price: 0 }
        ]
      }
    ],
    'signatures': [
      {
        id: 'temperature',
        title: 'Penyajian Suhu',
        type: 'radio',
        defaultIdx: 0,
        options: [
          { label: 'Iced (Dingin Segar)', val: 'Iced', price: 0 },
          { label: 'Hot (Panas)', val: 'Hot', price: 0 }
        ]
      }
    ],
    'matcha_tea': [
      {
        id: 'temperature',
        title: 'Penyajian Suhu',
        type: 'radio',
        defaultIdx: 0,
        options: [
          { label: 'Iced (Dingin)', val: 'Iced', price: 0 },
          { label: 'Hot (Panas)', val: 'Hot', price: 0 }
        ]
      },
      {
        id: 'sweetness',
        title: 'Level Manis',
        type: 'radio',
        defaultIdx: 0,
        options: [
          { label: 'Normal (100%)', val: 'Normal', price: 0 },
          { label: 'Less Sweet (50%)', val: 'Less Sweet', price: 0 },
          { label: 'No Sugar (0%)', val: 'No Sugar', price: 0 }
        ]
      }
    ]
  };

  function getModifiersForItem(item) {
    if (!item) return [];
    
    if (item.customizations) {
      const groups = [];
      const c = item.customizations;

      if (c.size && Array.isArray(c.size) && c.size.length > 0) {
        groups.push({
          id: 'size',
          title: 'Pilihan Ukuran (Size)',
          type: 'radio',
          defaultIdx: 0,
          options: c.size.map(s => ({
            label: s.price > 0 ? \`\${s.name} (+\${formatCurrency(s.price)})\` : s.name,
            val: s.name,
            price: s.price || 0
          }))
        });
      }

      if (c.temperature && Array.isArray(c.temperature) && c.temperature.length > 0) {
        groups.push({
          id: 'temperature',
          title: 'Suhu Penyajian',
          type: 'radio',
          defaultIdx: 0,
          options: c.temperature.map(t => {
            if (typeof t === 'string') return { label: t, val: t, price: 0 };
            return {
              label: t.price > 0 ? \`\${t.name} (+\${formatCurrency(t.price)})\` : t.name,
              val: t.name,
              price: t.price || 0
            };
          })
        });
      } else if (c.serving && Array.isArray(c.serving) && c.serving.length > 0) {
        groups.push({
          id: 'serving',
          title: 'Pilihan Penyajian',
          type: 'radio',
          defaultIdx: 0,
          options: c.serving.map(s => (typeof s === 'string' ? { label: s, val: s, price: 0 } : { label: s.name, val: s.name, price: s.price || 0 }))
        });
      }

      if (c.spread && Array.isArray(c.spread) && c.spread.length > 0) {
        groups.push({
          id: 'spread',
          title: 'Pilihan Olesan (Spread)',
          type: 'radio',
          defaultIdx: 0,
          options: c.spread.map(s => ({
            label: s.name,
            val: \`Spread \${s.name}\`,
            price: s.price || 0
          }))
        });
      }

      if (c.filling && Array.isArray(c.filling) && c.filling.length > 0) {
        groups.push({
          id: 'filling',
          title: 'Pilihan Isian',
          type: 'radio',
          defaultIdx: 0,
          options: c.filling.map(f => ({
            label: f.name,
            val: f.name,
            price: f.price || 0
          }))
        });
      }

      if (c.flavor && Array.isArray(c.flavor) && c.flavor.length > 0) {
        groups.push({
          id: 'flavor',
          title: 'Pilihan Bumbu',
          type: 'radio',
          defaultIdx: 0,
          options: c.flavor.map(f => ({
            label: f.name,
            val: f.name,
            price: f.price || 0
          }))
        });
      }

      if (c.milk && Array.isArray(c.milk) && c.milk.length > 0) {
        groups.push({
          id: 'milk',
          title: 'Pilihan Susu (Milk)',
          type: 'radio',
          defaultIdx: 0,
          options: c.milk.map(m => {
            const isOat = typeof m === 'string' && m.toLowerCase().includes('oat');
            const surcharge = isOat ? (state.merchant?.currency === 'BND' ? 1.00 : 6000) : 0;
            return {
              label: surcharge > 0 ? \`\${m} (+\${formatCurrency(surcharge)})\` : m,
              val: m,
              price: surcharge
            };
          })
        });
      }

      if (c.sugar && Array.isArray(c.sugar) && c.sugar.length > 0) {
        groups.push({
          id: 'sugar',
          title: 'Level Manis (Sugar)',
          type: 'radio',
          defaultIdx: 0,
          options: c.sugar.map(s => ({
            label: typeof s === 'string' ? s : s.name,
            val: typeof s === 'string' ? s : s.name,
            price: 0
          }))
        });
      } else if (c.sweetness && Array.isArray(c.sweetness) && c.sweetness.length > 0) {
        groups.push({
          id: 'sweetness',
          title: 'Level Manis',
          type: 'radio',
          defaultIdx: 0,
          options: c.sweetness.map(s => ({ label: s, val: s, price: 0 }))
        });
      }

      if (c.eggStyle && Array.isArray(c.eggStyle) && c.eggStyle.length > 0) {
        groups.push({
          id: 'eggStyle',
          title: 'Pilihan Telur',
          type: 'radio',
          defaultIdx: 0,
          options: c.eggStyle.map(e => ({ label: e, val: e, price: 0 }))
        });
      }

      if (c.beans && Array.isArray(c.beans) && c.beans.length > 0) {
        groups.push({
          id: 'beans',
          title: 'Pilihan Beans',
          type: 'radio',
          defaultIdx: 0,
          options: c.beans.map(b => ({ label: b, val: b, price: 0 }))
        });
      }

      if (c.teaVariety && Array.isArray(c.teaVariety) && c.teaVariety.length > 0) {
        groups.push({
          id: 'teaVariety',
          title: 'Pilihan Varian Teh',
          type: 'radio',
          defaultIdx: 0,
          options: c.teaVariety.map(t => ({ label: t, val: t, price: 0 }))
        });
      }

      if (c.spiciness && Array.isArray(c.spiciness) && c.spiciness.length > 0) {
        groups.push({
          id: 'spiciness',
          title: 'Tingkat Kepedasan',
          type: 'radio',
          defaultIdx: 0,
          options: c.spiciness.map(s => ({ label: s, val: s, price: 0 }))
        });
      }

      if (c.addons && Array.isArray(c.addons) && c.addons.length > 0) {
        groups.push({
          id: 'addons',
          title: 'Topping & Ekstra (Opsional)',
          type: 'checkbox',
          options: c.addons.map(a => ({
            name: a.name,
            price: a.price || 0
          }))
        });
      }

      if (groups.length > 0) return groups;
    }

    const cat = item.category || 'pizza';
    return MODIFIERS_BY_CATEGORY[cat] || [];
  }

  // --- MODIFIER / PRODUCT CUSTOMIZER ENGINE ---`;

appJs = appJs.replace(modifiersDefRegex, newModifiersCode);

// Update openModifierModal to call getModifiersForItem(item)
const openModGroupRegex = /const categoryKey = item\.category in MODIFIERS_BY_CATEGORY \? item\.category : 'kopi';\r?\n\s*const groups = MODIFIERS_BY_CATEGORY\[categoryKey\] \|\| \[\];/;
appJs = appJs.replace(openModGroupRegex, `const groups = getModifiersForItem(item);`);

// Update startPaymentProcessing payload with merchantId
const startPayPayloadRegex = /const payload = \{[\s\S]*?table: `Meja \$\{state\.tableId \|\| 5\}`,\r?\n\s*tableNum: state\.tableId \|\| 5,/;
appJs = appJs.replace(startPayPayloadRegex, `const payload = {
      merchantId: state.merchantId || 'coffeenity',
      table: \`Meja \${state.tableId || 5}\`,
      tableNum: state.tableId || 5,`);

// Update syncMenuCatalogFromServer
const syncMenuRegex = /async function syncMenuCatalogFromServer\(\) \{[\s\S]*?console\.debug\('Using local menu cache \(server offline\):', err\);\r?\n\s*\}\r?\n\s*\}/;
const newSyncMenuCode = `async function syncMenuCatalogFromServer() {
      try {
        const mId = state.merchantId || 'coffeenity';
        // 1. Fetch Merchant Details
        const mRes = await fetch('/api/merchants/' + encodeURIComponent(mId));
        if (mRes.ok) {
          const mData = await mRes.json();
          if (mData.success && mData.merchant) {
            state.merchant = mData.merchant;
            const rName = document.getElementById('receiptBrandName');
            if (rName) rName.textContent = state.merchant.name;
            const rSub = document.getElementById('receiptBrandSub');
            if (rSub) rSub.textContent = state.merchant.brandUnit || '';
          }
        }

        // 2. Fetch Active Menu Catalog
        const res = await fetch('/api/menu?merchant=' + encodeURIComponent(mId));
        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items) && items.length > 0) {
            menuCatalog = items;
            renderMenuCatalog(false);
          }
        }
      } catch (err) {
        console.debug('Using local menu cache (server offline):', err);
      }
    }`;

appJs = appJs.replace(syncMenuRegex, newSyncMenuCode);

// Update initCustomerSSE
const initSseRegex = /customerEventSource = new EventSource\('\/api\/events'\);/;
appJs = appJs.replace(initSseRegex, `customerEventSource = new EventSource('/api/events?merchant=' + encodeURIComponent(state.merchantId || 'coffeenity'));`);

// Update server chat post body
const chatServerPostRegex = /body: JSON\.stringify\(\{\r?\n\s*message: userText,\r?\n\s*history: state\.aiChatHistory\.slice\(-8\),/;
appJs = appJs.replace(chatServerPostRegex, `body: JSON.stringify({
              merchant: state.merchantId || 'coffeenity',
              message: userText,
              history: state.aiChatHistory.slice(-8),`);

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('✔ Successfully updated js/app.js');


// ==========================================
// 2. UPDATE js/admin.js
// ==========================================
const adminJsPath = path.join(__dirname, '..', 'js', 'admin.js');
let adminJs = fs.readFileSync(adminJsPath, 'utf8');

// Update adminState and adminFetch
const adminStateRegex = /\/\/ --- 1\. GLOBAL ADMIN STATE ---\r?\n\s*const adminState = \{[\s\S]*?menuStock: \[[\s\S]*?\n\s*\],/;
const newAdminStateCode = `// --- 1. GLOBAL ADMIN STATE ---
  const adminState = {
    activeTab: 'tabAnalytics',
    activeRole: 'owner',
    activeMerchantId: 'coffeenity',
    currentMerchant: {
      id: 'coffeenity',
      name: 'The Coffeenity Yard',
      brandUnit: 'Doughboy Pizza Kayu Api (@doughboy.pizzakyuapi)',
      currency: 'BND',
      currencySymbol: '$',
      currencyDecimals: 2,
      tablesCount: 12
    },
    merchants: [],
    menuStock: ${JSON.stringify(coffeenityMenu, null, 2)},`;

adminJs = adminJs.replace(adminStateRegex, newAdminStateCode);

// Update adminFetch to include x-merchant-id
const adminFetchRegex = /function adminFetch\(url, options = \{\}\) \{[\s\S]*?return fetch\(url, options\);\r?\n\s*\}/;
const newAdminFetchCode = `function adminFetch(url, options = {}) {
    options.headers = options.headers || {};
    if (!options.headers['x-admin-token'] && !options.headers['Authorization']) {
      options.headers['x-admin-token'] = ADMIN_AUTH_TOKEN;
    }
    if (!options.headers['x-merchant-id']) {
      options.headers['x-merchant-id'] = adminState.activeMerchantId || 'coffeenity';
    }
    return fetch(url, options);
  }`;
adminJs = adminJs.replace(adminFetchRegex, newAdminFetchCode);

// Update formatRupiah in admin.js
const adminFormatRupiahRegex = /function formatRupiah\(amount\) \{\r?\n\s*return 'Rp ' \+ Number\(amount\)\.toLocaleString\('id-ID'\);\r?\n\s*\}/;
const newAdminFormattingCode = `function formatAdminCurrency(amount, merchant) {
    const m = merchant || adminState.currentMerchant || { currency: 'BND', currencySymbol: '$', currencyDecimals: 2 };
    const num = Number(amount) || 0;
    const sym = m.currencySymbol || '$';
    const dec = m.currencyDecimals ?? 2;
    if (m.currency === 'IDR') {
      return 'Rp ' + Math.round(num).toLocaleString('id-ID');
    }
    return \`\${sym}\${num.toFixed(dec)}\`;
  }
  const formatRupiah = formatAdminCurrency;`;
adminJs = adminJs.replace(adminFormatRupiahRegex, newAdminFormattingCode);

// Update Table QRs generator for active merchant
const renderTableQRsRegex = /function renderTableQRs\(\) \{[\s\S]*?grid\.innerHTML = adminState\.tableQRs\.map\(t => `[\s\S]*?`\)\.join\(''\);/;
const newRenderTableQRsCode = `function updateTablesList() {
    const mId = adminState.activeMerchantId || 'coffeenity';
    const count = adminState.currentMerchant?.tablesCount || 12;
    adminState.tableQRs = Array.from({ length: count }, (_, i) => {
      const num = i + 1;
      const activeOrderForTable = (adminState.kdsOrders || []).find(o => o.tableNum === num && o.status !== 'completed' && o.status !== 'cancelled');
      return {
        tableNum: num,
        name: \`Meja \${num}\`,
        status: activeOrderForTable ? 'Terisi (Aktif)' : 'Tersedia (Kosong)',
        activeOrder: activeOrderForTable ? activeOrderForTable.orderNumber : '-',
        qrUrl: \`/api/tables/\${num}/qr?merchant=\${mId}\`,
        sessionUrl: \`/?merchant=\${mId}&table=\${num}\`
      };
    });
  }

  function renderTableQRs() {
    const grid = document.getElementById('adminTablesGrid');
    if (!grid) return;
    updateTablesList();

    grid.innerHTML = adminState.tableQRs.map(t => \`
      <div class="table-standee-card">
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
          <strong class="type-data-emphasis" style="font-size: 14px; color: #FFF;">\${t.name}</strong>
          <span class="status-badge \${t.status.includes('Terisi') ? 'badge-warning' : 'badge-success'}">\${t.status}</span>
        </div>
        <div class="table-qr-wrap">
          <img src="\${t.qrUrl}" alt="QR \${t.name}" style="width: 120px; height: 120px; display: block;" />
        </div>
        <div class="type-caption" style="font-size: 11px; color: var(--admin-text-muted);">
          URL: <a href="\${t.sessionUrl}" target="_blank" style="color: var(--apple-blue); text-decoration: none; font-weight: 600;">\${t.sessionUrl}</a>
        </div>
        <button class="admin-btn secondary btn-print-single-qr" data-num="\${t.tableNum}" style="width: 100%; padding: 6px 10px; font-size: 11.5px; justify-content: center;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Cetak Standee
        </button>
      </div>
    \`).join('');`;

adminJs = adminJs.replace(renderTableQRsRegex, newRenderTableQRsCode);

// Update syncAdminDataFromServer to handle merchant switching
const syncAdminDataRegex = /async function syncAdminDataFromServer\(\) \{[\s\S]*?\/\/ 4\. Sync Real-Time Stats\r?\n\s*await syncAdminStats\(\);\r?\n\s*\}/;
const newSyncAdminDataCode = `async function syncAdminDataFromServer() {
      // 0. Fetch Merchants List
      try {
        const mListRes = await fetch('/api/merchants');
        if (mListRes.ok) {
          const mListData = await mListRes.json();
          if (mListData.success && Array.isArray(mListData.merchants)) {
            adminState.merchants = mListData.merchants;
            const selectEl = document.getElementById('adminMerchantSelector');
            if (selectEl) {
              selectEl.innerHTML = mListData.merchants.map(m => 
                \`<option value="\${m.id}" \${m.id === adminState.activeMerchantId ? 'selected' : ''}>\${m.name} (\${m.currency} \${m.currencySymbol})</option>\`
              ).join('');
            }
            adminState.currentMerchant = mListData.merchants.find(m => m.id === adminState.activeMerchantId) || mListData.merchants[0];
            const subTitle = document.getElementById('adminBrandSubtitle');
            if (subTitle && adminState.currentMerchant) {
              subTitle.textContent = \`\${adminState.currentMerchant.name} • \${adminState.currentMerchant.brandUnit || ''}\`;
            }
          }
        }
      } catch (e) { console.debug('Merchants fetch fallback:', e); }

      // 1. Sync Menu Stock
      try {
        const mRes = await fetch('/api/menu?merchant=' + encodeURIComponent(adminState.activeMerchantId));
        if (mRes.ok) {
          const mData = await mRes.json();
          if (Array.isArray(mData)) {
            adminState.menuStock = mData;
            renderMenuCatalogTable();
          }
        }
      } catch (e) { console.debug('Offline menu sync fallback:', e); }

      // 2. Sync KDS Orders
      try {
        const oRes = await adminFetch('/api/admin/orders');
        if (oRes.ok) {
          const oData = await oRes.json();
          if (oData.success && Array.isArray(oData.data)) {
            adminState.kdsOrders = oData.data;
            renderAdminKDS();
            renderTableQRs();
          }
        }
      } catch (e) { console.debug('Offline orders sync fallback:', e); }

      // 3. Sync Server AI Config
      try {
        const cRes = await adminFetch('/api/admin/config');
        if (cRes.ok) {
          const cData = await cRes.json();
          if (cData.success && cData.config) {
            if (cData.config.apiKey && apiKeyInput && !apiKeyInput.value) {
              apiKeyInput.value = cData.config.apiKey;
            }
            if (cData.config.model && modelSelect) {
              modelSelect.value = cData.config.model;
            }
          }
        }
      } catch (e) { console.debug('Offline config sync fallback:', e); }

      // 4. Sync Real-Time Stats
      await syncAdminStats();
    }`;

adminJs = adminJs.replace(syncAdminDataRegex, newSyncAdminDataCode);

// Add listener to #adminMerchantSelector
const initAdminEventBinding = `// Multi-Tenant Merchant Selector Change Handler
    const merchantSelect = document.getElementById('adminMerchantSelector');
    if (merchantSelect) {
      merchantSelect.addEventListener('change', async (e) => {
        adminState.activeMerchantId = e.target.value;
        adminState.currentMerchant = adminState.merchants.find(m => m.id === adminState.activeMerchantId) || { currency: 'BND', currencySymbol: '$' };
        showAdminToast('info', \`Berpindah ke Outlet: \${adminState.currentMerchant.name}\`);
        await syncAdminDataFromServer();
      });
    }`;

adminJs = adminJs.replace(`initAdminSSE();`, `${initAdminEventBinding}\n\n    initAdminSSE();`);

fs.writeFileSync(adminJsPath, adminJs, 'utf8');
console.log('✔ Successfully updated js/admin.js');
