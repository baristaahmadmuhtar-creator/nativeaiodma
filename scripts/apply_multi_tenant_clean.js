const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dbPath = path.join(__dirname, '..', 'data', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const coffeenityMenu = db.merchants.coffeenity.menu;

// ==========================================
// 1. TRANSFORM js/app.js
// ==========================================
let appCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js.pristine'), 'utf8');

// A. Replace State Management block
const appStateTarget = `  // --- STATE MANAGEMENT ---
  const state = {
    selectedLang: 'id-ID',
    currentScreen: 'screenSelectLanguage',
    currentMode: 'chat', // 'chat' or 'menu'
    activeCategory: 'all',
    searchQuery: '',
    soundEnabled: true,
    tableId: 5,
    orderId: null,
    orderTrackingActive: false,
    activeOrder: null,
    receiptOrderId: null,
    selectedPaymentMethod: 'BIBD',
    favorites: new Set(['kopi_milk_aren', 'iced_latte']),
    cart: [],
    kdsOrders: []
  };`;

const newAppState = `  // --- MULTI-TENANT MERCHANT STATE ---
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

if (!appCode.includes(appStateTarget)) {
  console.error("Target appStateTarget not found in appCode");
  process.exit(1);
}
appCode = appCode.replace(appStateTarget, () => newAppState);

// B. Replace Menu Catalog with 46 items
const menuCatalogStart = `  // --- MENU CATALOG DATA ---
  // --- MENU CATALOG DATA (36 Curated Items across 6 Categories) ---
  const menuCatalog = [`;
const menuCatalogEnd = `  // --- AUDIO / TAPTIC ENGINE SIMULATION ---`;

const idxStart = appCode.indexOf(menuCatalogStart);
const idxEnd = appCode.indexOf(menuCatalogEnd);

if (idxStart === -1 || idxEnd === -1) {
  console.error("Could not locate menuCatalog slice in appCode", { idxStart, idxEnd });
  process.exit(1);
}

const newMenuCatalogSection = `  // --- MENU CATALOG DATA (The Coffeenity Yard - 46 Curated BND Items) ---
  let menuCatalog = ${JSON.stringify(coffeenityMenu, null, 2)};\n\n`;

appCode = appCode.slice(0, idxStart) + newMenuCatalogSection + appCode.slice(idxEnd);

// C. Replace formatRupiah with Universal Currency Formatter
const formatRupiahTarget = `  // --- FORMATTING UTILS ---
  function formatRupiah(amount) {
    return 'Rp ' + Number(amount).toLocaleString('id-ID');
  }`;

const newFormatCurrencyCode = `  // --- UNIVERSAL MULTI-CURRENCY FORMATTING UTILS ---
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

if (!appCode.includes(formatRupiahTarget)) {
  console.error("formatRupiahTarget not found in appCode");
  process.exit(1);
}
appCode = appCode.replace(formatRupiahTarget, () => newFormatCurrencyCode);

// D. Replace getCartTax and getCartTotal
const cartTaxTarget = `  function getCartTax(subtotal) {
    return Math.round(subtotal * 0.1);
  }

  function getCartTotal() {
    const sub = getCartSubtotal();
    return sub + getCartTax(sub);
  }`;

const newCartTaxCode = `  function getCartTax(subtotal) {
    const rate = typeof state.merchant?.taxRate === 'number' ? state.merchant.taxRate : 0.0;
    return Math.round((subtotal * rate) * 100) / 100;
  }

  function getCartTotal() {
    const sub = getCartSubtotal();
    return Math.round((sub + getCartTax(sub)) * 100) / 100;
  }`;

if (!appCode.includes(cartTaxTarget)) {
  console.error("cartTaxTarget not found in appCode");
  process.exit(1);
}
appCode = appCode.replace(cartTaxTarget, () => newCartTaxCode);

// E. Add Dynamic Customizer getModifiersForItem
const customizerTarget = `  function openModifierModal(item) {
    if (!item) return;
    playHaptic('tap');
    activeCustomizer.item = item;
    activeCustomizer.options = {};
    activeCustomizer.addons = [];
    activeCustomizer.note = '';
    activeCustomizer.qty = 1;

    const img = document.getElementById('modProductImg');
    const title = document.getElementById('modProductTitle');
    const desc = document.getElementById('modProductDesc');
    const basePrice = document.getElementById('modProductBasePrice');
    const qtyText = document.getElementById('modQtyNumber');
    const noteInput = document.getElementById('modSpecialNote');
    const groupsContainer = document.getElementById('modDynamicGroups');

    if (img) img.src = item.image;
    if (title) title.textContent = item.name;
    if (desc) desc.textContent = item.desc;
    if (basePrice) basePrice.textContent = formatRupiah(item.price);
    if (qtyText) qtyText.textContent = '1';
    if (noteInput) noteInput.value = '';

    // Dynamically render category-specific options
    if (groupsContainer) {
      groupsContainer.innerHTML = '';
      const categoryKey = item.category in MODIFIERS_BY_CATEGORY ? item.category : 'kopi';
      const groups = MODIFIERS_BY_CATEGORY[categoryKey] || [];`;

const newCustomizerCode = `  function getModifiersForItem(item) {
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
    return (typeof MODIFIERS_BY_CATEGORY !== 'undefined' && MODIFIERS_BY_CATEGORY[cat]) || [];
  }

  function openModifierModal(item) {
    if (!item) return;
    playHaptic('tap');
    activeCustomizer.item = item;
    activeCustomizer.options = {};
    activeCustomizer.addons = [];
    activeCustomizer.note = '';
    activeCustomizer.qty = 1;

    const img = document.getElementById('modProductImg');
    const title = document.getElementById('modProductTitle');
    const desc = document.getElementById('modProductDesc');
    const basePrice = document.getElementById('modProductBasePrice');
    const qtyText = document.getElementById('modQtyNumber');
    const noteInput = document.getElementById('modSpecialNote');
    const groupsContainer = document.getElementById('modDynamicGroups');

    if (img) img.src = item.image;
    if (title) title.textContent = item.name;
    if (desc) desc.textContent = item.desc;
    if (basePrice) basePrice.textContent = formatRupiah(item.price);
    if (qtyText) qtyText.textContent = '1';
    if (noteInput) noteInput.value = '';

    // Dynamically render customizer options
    if (groupsContainer) {
      groupsContainer.innerHTML = '';
      const groups = getModifiersForItem(item);`;

if (!appCode.includes(customizerTarget)) {
  console.error("customizerTarget not found in appCode");
  process.exit(1);
}
appCode = appCode.replace(customizerTarget, () => newCustomizerCode);

// F. Update startPaymentProcessing payload to include merchantId
const startPayTarget = `    const payload = {
      table: \`Meja \${state.tableId || 5}\`,
      tableNum: state.tableId || 5,`;

const newStartPayCode = `    const payload = {
      merchantId: state.merchantId || 'coffeenity',
      table: \`Meja \${state.tableId || 5}\`,
      tableNum: state.tableId || 5,`;

if (!appCode.includes(startPayTarget)) {
  console.error("startPayTarget not found in appCode");
  process.exit(1);
}
appCode = appCode.replace(startPayTarget, () => newStartPayCode);

// G. Update chat API call to include merchant
const chatApiTarget = `          const sRes = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: userText,
              history: state.aiChatHistory.slice(-8),`;

const newChatApiCode = `          const sRes = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              merchant: state.merchantId || 'coffeenity',
              message: userText,
              history: state.aiChatHistory.slice(-8),`;

if (!appCode.includes(chatApiTarget)) {
  console.error("chatApiTarget not found in appCode");
  process.exit(1);
}
appCode = appCode.replace(chatApiTarget, () => newChatApiCode);

// H. Update syncMenuCatalogFromServer
const syncMenuTarget = `    async function syncMenuCatalogFromServer() {
      try {
        const res = await fetch('/api/menu');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            data.data.forEach(serverItem => {
              const localItem = menuCatalog.find(m => m.id === serverItem.id);
              if (localItem) {
                localItem.available = serverItem.available;
                localItem.price = serverItem.price;
              }
            });
            if (state.currentMode === 'menu') {
              renderMenuCatalog();
            }
          }
        }
      } catch (err) {
        console.debug('Using local menu cache (server offline):', err);
      }
    }`;

const newSyncMenuCode = `    async function syncMenuCatalogFromServer() {
      try {
        const mId = state.merchantId || 'coffeenity';
        // 1. Fetch Merchant Metadata
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
            if (state.currentMode === 'menu') {
              renderMenuCatalog(false);
            }
          }
        }
      } catch (err) {
        console.debug('Using local menu cache (server offline):', err);
      }
    }`;

if (!appCode.includes(syncMenuTarget)) {
  console.error("syncMenuTarget not found in appCode");
  process.exit(1);
}
appCode = appCode.replace(syncMenuTarget, () => newSyncMenuCode);

// I. Update SSE connection url
const sseTarget = `customerEventSource = new EventSource('/api/events');`;
const newSseCode = `customerEventSource = new EventSource('/api/events?merchant=' + encodeURIComponent(state.merchantId || 'coffeenity'));`;
if (appCode.includes(sseTarget)) {
  appCode = appCode.replace(sseTarget, () => newSseCode);
}

// Validate appCode
try {
  new vm.Script(appCode);
  fs.writeFileSync(path.join(__dirname, '..', 'js', 'app.js'), appCode, 'utf8');
  console.log("✔ js/app.js updated and verified with vm.Script!");
} catch (e) {
  console.error("Syntax error in transformed appCode:", e);
  process.exit(1);
}


// ==========================================
// 2. TRANSFORM js/admin.js
// ==========================================
let adminCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'admin.js.pristine'), 'utf8');

// A. Update adminState
const adminStateTarget = `  // --- 1. GLOBAL ADMIN STATE ---
  const adminState = {
    activeTab: 'tabAnalytics',
    activeRole: 'owner', // 'owner' | 'manager' | 'kasir'
    
    // Curated 36 Menu Items Synchronized with Customer App
    menuStock: [`;

const adminStateEnd = `    // Tables 1 to 8 Standees (Zero Split Bill)
    tableQRs: Array.from({ length: 8 }, (_, i) => ({
      tableNum: i + 1,
      name: \`Meja \${i + 1}\`,
      status: i === 4 ? 'Terisi (Aktif)' : 'Tersedia (Kosong)',
      activeOrder: i === 4 ? '#ORD-892' : '-',
      qrUrl: \`/api/tables/\${i + 1}/qr\`
    })),`;

const adminIdxStart = adminCode.indexOf(adminStateTarget);
const adminIdxEnd = adminCode.indexOf(adminStateEnd);

if (adminIdxStart === -1 || adminIdxEnd === -1) {
  console.error("Could not locate adminState slice in adminCode", { adminIdxStart, adminIdxEnd });
  process.exit(1);
}

const newAdminStateSection = `  // --- 1. GLOBAL ADMIN STATE (Multi-Tenant B2B SaaS) ---
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
    menuStock: ${JSON.stringify(coffeenityMenu, null, 2)},

    tableQRs: Array.from({ length: 12 }, (_, i) => ({
      tableNum: i + 1,
      name: \`Meja \${i + 1}\`,
      status: 'Tersedia (Kosong)',
      activeOrder: '-',
      qrUrl: \`/api/tables/\${i + 1}/qr?merchant=coffeenity\`,
      sessionUrl: \`/?merchant=coffeenity&table=\${i + 1}\`
    })),`;

adminCode = adminCode.slice(0, adminIdxStart) + newAdminStateSection + adminCode.slice(adminIdxEnd + adminStateEnd.length);

// B. Update adminFetch
const adminFetchTarget = `  function adminFetch(url, options = {}) {
    options.headers = options.headers || {};
    if (!options.headers['x-admin-token'] && !options.headers['Authorization']) {
      options.headers['x-admin-token'] = ADMIN_AUTH_TOKEN;
    }
    return fetch(url, options);
  }`;

const newAdminFetch = `  function adminFetch(url, options = {}) {
    options.headers = options.headers || {};
    if (!options.headers['x-admin-token'] && !options.headers['Authorization']) {
      options.headers['x-admin-token'] = ADMIN_AUTH_TOKEN;
    }
    if (!options.headers['x-merchant-id']) {
      options.headers['x-merchant-id'] = adminState.activeMerchantId || 'coffeenity';
    }
    return fetch(url, options);
  }`;

if (!adminCode.includes(adminFetchTarget)) {
  console.error("adminFetchTarget not found in adminCode");
  process.exit(1);
}
adminCode = adminCode.replace(adminFetchTarget, () => newAdminFetch);

// C. Update formatRupiah in admin.js
const adminFormatTarget = `  // --- 2. FORMATTERS & UTILS ---
  function formatRupiah(amount) {
    return 'Rp ' + Number(amount).toLocaleString('id-ID');
  }`;

const newAdminFormat = `  // --- 2. MULTI-CURRENCY FORMATTERS & UTILS ---
  function formatAdminCurrency(amount, merchant) {
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

if (!adminCode.includes(adminFormatTarget)) {
  console.error("adminFormatTarget not found in adminCode");
  process.exit(1);
}
adminCode = adminCode.replace(adminFormatTarget, () => newAdminFormat);

// D. Update renderTableQRs
const renderTableQRsTarget = `  function renderTableQRs() {
    const grid = document.getElementById('adminTablesGrid');
    if (!grid) return;

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
          URL Sesi: <a href="/?table=\${t.tableNum}" target="_blank" style="color: var(--apple-blue); text-decoration: none; font-weight: 600;">?table=\${t.tableNum}</a>
        </div>
        <button class="admin-btn secondary btn-print-single-qr" data-num="\${t.tableNum}" style="width: 100%; padding: 6px 10px; font-size: 11.5px; justify-content: center;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Cetak Standee
        </button>
      </div>
    \`).join('');`;

const newRenderTableQRs = `  function updateTablesList() {
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
          URL Sesi: <a href="\${t.sessionUrl}" target="_blank" style="color: var(--apple-blue); text-decoration: none; font-weight: 600;">\${t.sessionUrl}</a>
        </div>
        <button class="admin-btn secondary btn-print-single-qr" data-num="\${t.tableNum}" style="width: 100%; padding: 6px 10px; font-size: 11.5px; justify-content: center;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Cetak Standee
        </button>
      </div>
    \`).join('');`;

if (!adminCode.includes(renderTableQRsTarget)) {
  console.error("renderTableQRsTarget not found in adminCode");
  process.exit(1);
}
adminCode = adminCode.replace(renderTableQRsTarget, () => newRenderTableQRs);

// E. Update syncAdminDataFromServer
const adminSyncTarget = `    async function syncAdminDataFromServer() {
      // 1. Sync Menu Stock
      try {
        const mRes = await fetch('/api/menu');
        if (mRes.ok) {
          const mData = await mRes.json();
          if (mData.success && Array.isArray(mData.data)) {
            adminState.menuStock = mData.data;
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

const newAdminSync = `    async function syncAdminDataFromServer() {
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

if (!adminCode.includes(adminSyncTarget)) {
  console.error("adminSyncTarget not found in adminCode");
  process.exit(1);
}
adminCode = adminCode.replace(adminSyncTarget, () => newAdminSync);

// F. Add listener to #adminMerchantSelector
const initAdminSseTarget = `    initAdminSSE();`;
const newAdminInitBinding = `    // Multi-Tenant Merchant Selector Change Handler
    const merchantSelect = document.getElementById('adminMerchantSelector');
    if (merchantSelect) {
      merchantSelect.addEventListener('change', async (e) => {
        adminState.activeMerchantId = e.target.value;
        adminState.currentMerchant = adminState.merchants.find(m => m.id === adminState.activeMerchantId) || { currency: 'BND', currencySymbol: '$' };
        showAdminToast('info', \`Berpindah ke Outlet: \${adminState.currentMerchant.name}\`);
        await syncAdminDataFromServer();
      });
    }

    initAdminSSE();`;

if (!adminCode.includes(initAdminSseTarget)) {
  console.error("initAdminSseTarget not found in adminCode");
  process.exit(1);
}
adminCode = adminCode.replace(initAdminSseTarget, () => newAdminInitBinding);

// Validate adminCode
try {
  new vm.Script(adminCode);
  fs.writeFileSync(path.join(__dirname, '..', 'js', 'admin.js'), adminCode, 'utf8');
  console.log("✔ js/admin.js updated and verified with vm.Script!");
} catch (e) {
  console.error("Syntax error in transformed adminCode:", e);
  process.exit(1);
}
