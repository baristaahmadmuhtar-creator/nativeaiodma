/* Customer v18 adapter. The legacy document and stylesheet remain the UI shell. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const all = selector => [...document.querySelectorAll(selector)];
  const query = new URLSearchParams(location.search);
  const state = { merchantId: query.get('merchant'), tableId: Number(query.get('table')), session: null,
    merchant: null, items: [], cart: { version: 1, lines: [] }, quote: null, order: null,
    language: 'id', category: 'all', busy: 0, chatBusy: false, namespace: '', pending: null,
    selected: null, qty: 1, options: new Set(), payment: 'CASH', epoch: 0, events: null };
  const controllers = new Set();
  const resetSheetDrags = new Set();
  let queue = Promise.resolve(), quoteTimer, noticeTimer, noticeExitTimer, focusReturn, dismissing = false;
  let currentScreen = 'screenSelectLanguage';
  let viewRevision = 0;
  let menuRefresh = null, menuDirty = false;
  const words = {
    id: { all:'Semua', empty:'Belum ada item', search:'Cari menu', add:'Tambahkan', review:'Periksa pesanan', confirm:'Konfirmasi pesanan', retry:'Coba lagi', offline:'Offline. Pemesanan memerlukan koneksi.', session:'Scan QR meja yang valid untuk memesan.', unavailable:'Belum tersedia', pending:'Hasil permintaan belum pasti. Coba lagi dengan permintaan yang sama.', paid:'LUNAS', unpaid:'BELUM LUNAS', tax:'Pajak', service:'Layanan', discount:'Diskon', waiter:'Panggilan pelayan terkirim', received:'Diterima', accepted:'Diterima dapur', preparing:'Disiapkan', ready:'Siap', served:'Disajikan', completed:'Selesai', cancelled:'Dibatalkan', rejected:'Ditolak', transfer:'Transfer manual', cash:'Tunai', paymentNote:'Pembayaran diverifikasi oleh kasir.', expired:'Ringkasan berubah atau kedaluwarsa. Periksa kembali.', saved:'Keranjang diperbarui', help:'Mohon bantuan pelayan di meja', failed:'Permintaan gagal', reconnect:'Perbarui koneksi' },
    en: { all:'All', empty:'No items yet', search:'Search menu', add:'Add', review:'Review order', confirm:'Confirm order', retry:'Retry', offline:'Offline. Ordering requires a connection.', session:'Scan a valid table QR to order.', unavailable:'Unavailable', pending:'The request outcome is uncertain. Retry the same request.', paid:'PAID', unpaid:'UNPAID', tax:'Tax', service:'Service', discount:'Discount', waiter:'Waiter request sent', received:'Received', accepted:'Accepted', preparing:'Preparing', ready:'Ready', served:'Served', completed:'Completed', cancelled:'Cancelled', rejected:'Rejected', transfer:'Manual transfer', cash:'Cash', paymentNote:'Payment is verified by the cashier.', expired:'The quote changed or expired. Review it again.', saved:'Cart updated', help:'Please send a waiter to the table', failed:'Request failed', reconnect:'Reconnect' },
    ms: { all:'Semua', empty:'Belum ada item', search:'Cari menu', add:'Tambah', review:'Semak pesanan', confirm:'Sahkan pesanan', retry:'Cuba lagi', offline:'Luar talian. Pesanan memerlukan sambungan.', session:'Imbas QR meja yang sah untuk memesan.', unavailable:'Belum tersedia', pending:'Keputusan permintaan belum pasti. Cuba semula permintaan yang sama.', paid:'SUDAH DIBAYAR', unpaid:'BELUM DIBAYAR', tax:'Cukai', service:'Perkhidmatan', discount:'Diskaun', waiter:'Panggilan pelayan dihantar', received:'Diterima', accepted:'Diterima dapur', preparing:'Disediakan', ready:'Sedia', served:'Dihidang', completed:'Selesai', cancelled:'Dibatalkan', rejected:'Ditolak', transfer:'Pindahan manual', cash:'Tunai', paymentNote:'Pembayaran disahkan oleh juruwang.', expired:'Ringkasan berubah atau tamat tempoh. Semak semula.', saved:'Troli dikemas kini', help:'Mohon bantuan pelayan di meja', failed:'Permintaan gagal', reconnect:'Sambung semula' }
  };
  const t = key => words[state.language][key] || key;
  const node = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el; };
  const set = (id, text) => { if ($(id)) $(id).textContent = text; };
  const button = (text, cls, action) => { const el = node('button', cls, text); el.type = 'button'; el.addEventListener('click', action); return el; };
  const money = (minor, currency = state.merchant?.currency || 'IDR') => new Intl.NumberFormat({id:'id-ID',en:'en-US',ms:'ms-BN'}[state.language], { style:'currency', currency }).format(Number(minor) / 100);
  const storage = { get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }, put(key, value) { localStorage.setItem(key, JSON.stringify(value)); }, remove(key) { localStorage.removeItem(key); } };
  const status = node('div', 'v18-status'); status.id = 'customerV18Status'; status.setAttribute('aria-live','off'); status.hidden = true;
  const statusText = node('span'); const retry = button('', 'tracker-btn-outline', () => run(async () => {
    if (!state.session) return initialize();
    if (!state.pending && $('customerMemoryBackdropModal').getAttribute('aria-hidden') === 'false') return openMemory({record:false});
    return recover();
  }));
  status.append(statusText, retry);
  function measureStatus() { document.documentElement.style.setProperty('--notice-height', !status.hidden && status.parentElement === $('phoneViewport') ? `${status.offsetHeight + 8}px` : '0px'); }
  function placeStatus() {
    const opened = document.querySelector('#customerMemoryBackdropModal[aria-hidden="false"] .mobile-qr-card-modal,.bottom-sheet-backdrop.open .bottom-sheet-card');
    const host = opened || (status.dataset.tone === 'success' ? document.querySelector('.app-host-container') : $('phoneViewport'));
    const grab = opened?.querySelector('.v18-sheet-grab');
    if (grab) grab.after(status); else host.prepend(status);
    measureStatus();
  }
  function notice(message, canRetry = false, tone = 'info', background = false) {
    // Background progress must not replace an unresolved actionable error.
    if (background && !status.hidden && status.dataset.tone === 'error') return;
    clearTimeout(noticeTimer); clearTimeout(noticeExitTimer); status.classList.remove('v18-toast-exit');
    status.hidden = !message; status.dataset.tone = tone;
    statusText.textContent = message || ''; retry.hidden = !canRetry; retry.textContent = t('retry'); placeStatus();
    set('accessibilityLiveRegion',message || '');
    if (message && tone === 'success') noticeTimer = setTimeout(() => {
      status.classList.add('v18-toast-exit');
      noticeExitTimer = setTimeout(() => {status.hidden = true; measureStatus();},180);
    },2800);
  }
  function report(error) { if (error.name !== 'AbortError') notice(`${error.message || t('failed')}${error.requestId ? ` (${error.requestId})` : ''}`, !!state.pending || !state.session || !navigator.onLine || !error.status || error.status >= 500,'error'); }
  // Storage can be edited by other scripts or browser tools; never trust a replay URL.
  function readPending() {
    const value = storage.get(`${state.namespace}:pending`);
    if (!value) return null;
    const id = v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(v);
    const uuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
    const version = v => Number.isSafeInteger(v) && v > 0;
    const b = value.body;
    const valid = uuid(value.key) && b && typeof b === 'object' && (
      (value.kind === 'cart' && value.path === '/cart' && value.method === 'PUT' && version(b.expectedVersion) && Array.isArray(b.lines) && b.lines.length <= 50 && b.lines.every(l => l && id(l.menuId) && Number.isInteger(l.qty) && l.qty > 0 && l.qty <= 99 && Array.isArray(l.optionIds) && l.optionIds.length <= 30 && l.optionIds.every(id))) ||
      (value.kind === 'order' && value.path === '/orders' && value.method === 'POST' && uuid(b.quoteId) && b.confirmed === true && ['CASH','MANUAL_TRANSFER'].includes(b.paymentMethod)) ||
      (value.kind === 'waiter' && value.path === '/waiter-calls' && value.method === 'POST' && typeof b.reason === 'string' && b.reason.length <= 300) ||
      (value.kind === 'proposal' && typeof value.path === 'string' && /^\/ai\/proposals\/[A-Za-z0-9_-]{1,100}\/confirm$/.test(value.path) && value.method === 'POST' && uuid(b.messageId) && version(b.expectedVersion))
    );
    if (valid) return value;
    try { storage.remove(`${state.namespace}:pending`); } catch { /* Invalid requests are never replayed, even if storage is read-only. */ }
    return null;
  }
  function invalidate() { state.quote = null; clearTimeout(quoteTimer); syncControls(); }
  async function api(path, { method = 'GET', body, key } = {}) {
    const controller = new AbortController(), epoch = state.epoch; controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`/api/v1${path}`, { method, credentials:'same-origin', cache:'no-store', signal:controller.signal,
        headers: { 'X-AIODMA-Surface':'customer', ...(body ? {'Content-Type':'application/json'} : {}), ...(method !== 'GET' && state.session ? {'X-CSRF-Token':state.session.csrfToken} : {}), ...(key ? {'Idempotency-Key':key} : {}) },
        ...(body ? {body:JSON.stringify(body)} : {}) });
      let envelope;
      try { envelope = await response.json(); } catch { throw Object.assign(new Error(t('failed')), {status:response.status >= 400 ? response.status : 502}); }
      if (epoch !== state.epoch) throw new DOMException('Stale response','AbortError');
      if (!response.ok || envelope?.success !== true) {
        const error = Object.assign(new Error(envelope?.error?.message || t('failed')), {status:response.status,code:envelope?.error?.code,requestId:envelope?.requestId});
        if (response.status === 401) { state.session = null; state.events?.close(); invalidate(); }
        throw error;
      }
      return envelope.data;
    } catch (error) {
      if (epoch !== state.epoch) throw new DOMException('Stale response','AbortError');
      if (error.name === 'AbortError' && epoch === state.epoch) throw Object.assign(new Error(t('pending')), {status:0});
      throw error;
    } finally { clearTimeout(timeout); controllers.delete(controller); }
  }
  // Every local mutation shares this queue, including quote, AI and reconciliation.
  function run(action) {
    state.busy++; syncControls();
    const result = queue.then(action).catch(report).finally(() => { state.busy--; syncControls(); });
    queue = result; return result;
  }
  async function verifySession() {
    if (!state.session || !navigator.onLine) throw new Error(t(navigator.onLine ? 'session' : 'offline'));
    const current = await api('/session');
    if (current.csrfToken !== state.session.csrfToken || current.tenantId !== state.merchantId || current.tableId !== state.tableId || current.role !== 'guest') {
      state.session = null; state.events?.close(); invalidate(); throw new Error(t('session'));
    }
  }
  function savePending(value) {
    // Persist before sending: failure to persist must prevent a financial mutation.
    if (value) {
      try { storage.put(`${state.namespace}:pending`, value); }
      catch { throw new Error({id:'Penyimpanan browser tidak tersedia. Aktifkan penyimpanan sebelum memesan.',en:'Browser storage is unavailable. Enable storage before ordering.',ms:'Storan pelayar tidak tersedia. Aktifkan storan sebelum memesan.'}[state.language]); }
    } else {
      // An acknowledged mutation must not become a failed order due to cleanup.
      // If retained, its old key still reconciles safely on reload.
      try { storage.remove(`${state.namespace}:pending`); } catch { /* The next durable mutation replaces this key. */ }
    }
    state.pending = value; syncControls();
  }
  async function transact(path, method, body, kind) {
    await verifySession();
    if (state.pending) throw new Error(t('pending'));
    savePending({path,method,body,kind,key:crypto.randomUUID(), ...(kind === 'order' ? {quote:state.quote} : {})});
    return sendPending();
  }
  async function sendPending() {
    const p = state.pending;
    try {
      const result = await api(p.path,{method:p.method,body:p.body,key:p.key});
      savePending(null); return result;
    } catch (error) {
      if (error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429) savePending(null);
      if (error.status === 409 || error.status === 422) { invalidate(); state.cart = await api('/cart'); renderCart(); }
      throw error;
    }
  }
  async function recover() {
    await verifySession();
    if (!state.pending) state.pending = readPending();
    const p = state.pending;
    if (p) {
      if (p.kind === 'order') {
        const found = await api(`/submissions/${encodeURIComponent(p.key)}`);
        if (found.found) { savePending(null); await accepted(found.order); return; }
      }
      const result = await sendPending();
      if (p.kind === 'order') await accepted(result);
      if (p.kind === 'waiter') notice(t('waiter'),false,'success');
    }
    await loadMenu(); state.cart = await api('/cart'); invalidate(); renderCart();
    await loadOrders(); if (!p || p.kind !== 'waiter') notice('');
  }
  function closePopups(restore = false) {
    const trigger = $('actionPopupMenu').classList.contains('open') ? $('btnHeaderOptions') : $('modeDropdownMenu').classList.contains('open') ? $('btnModeTrigger') : null;
    all('.action-popup-menu,.mode-dropdown-menu').forEach(el => {el.classList.remove('open');el.inert=true;el.setAttribute('aria-hidden','true');});
    $('btnHeaderOptions').setAttribute('aria-expanded','false'); $('btnModeTrigger').setAttribute('aria-expanded','false');
    if (restore) trigger?.focus();
  }
  function recordNavigation(sheetId = null, replace = false) {
    const clean = new URL(location.href); clean.searchParams.delete('token');
    history[replace ? 'replaceState' : 'pushState']({ ...history.state, aiodmaCustomer:{screen:currentScreen,sheet:sheetId} }, '', clean);
  }
  function layerTrigger() {
    const active = document.activeElement;
    return active.closest('#actionPopupMenu') ? $('btnHeaderOptions') : active.closest('#modeDropdownMenu') ? $('btnModeTrigger') : active;
  }
  function syncMode() {
    for (const [id,screen] of [['optModeChat','screenChatCashier'],['optModeMenu','screenMenuCatalog']]) {
      const selected = currentScreen === screen;
      $(id).setAttribute('aria-checked',String(selected));
      $(id).querySelector('.mode-option-check').style.opacity = selected ? '1' : '0';
    }
  }
  function showScreen(id, { record = true, replace = false } = {}) {
    if (!$(id)?.classList.contains('screen')) return;
    if (['screenOrderSuccess','screenThermalReceipt'].includes(id) && !state.order) id = 'screenChatCashier';
    const changed = currentScreen !== id;
    if (changed) viewRevision++;
    const hadSheet = !!history.state?.aiodmaCustomer?.sheet;
    closeSheets({ record: false, restore: false }); currentScreen = id;
    document.documentElement.dataset.customerScreen = id;
    syncMode();
    all('.screen').forEach(el => { const active = el.id === id; el.classList.toggle('active',active); el.setAttribute('aria-hidden',String(!active)); el.inert = !active; });
    const language = id === 'screenSelectLanguage'; $('mainHeaderBar').classList.toggle('hidden',language); $('mainHeaderBar').style.display = language ? 'none' : '';
    closePopups();
    if (record && (changed || replace || hadSheet)) recordNavigation(null, replace || !changed || hadSheet);
    const heading = $(id).querySelector('h1,h2,h3') || $(id); heading.tabIndex = -1; heading.focus({preventScroll:true});
  }
  function closeSheets({ record = true, restore = true } = {}) {
    const opened = document.querySelector('.bottom-sheet-backdrop.open,#customerMemoryBackdropModal[aria-hidden="false"]');
    if (opened) viewRevision++;
    resetSheetDrags.forEach(reset => reset());
    closePopups();
    all('.bottom-sheet-backdrop.open').forEach(el => { el.classList.remove('open'); el.setAttribute('aria-hidden','true'); el.inert = true; });
    const memory=$('customerMemoryBackdropModal');memory.style.display='none';memory.setAttribute('aria-hidden','true');memory.inert=true;$('phoneViewport').inert=false;
    $('mainHeaderBar').inert=false; $('liveOrderActivityBanner').inert=false; all('.screen').forEach(el => { el.inert = !el.classList.contains('active'); });
    placeStatus();
    if (record && history.state?.aiodmaCustomer?.sheet) recordNavigation(null, true);
    if (restore && opened && focusReturn?.isConnected && focusReturn.getClientRects().length) focusReturn.focus({preventScroll:true});
  }
  function dismissSheets() {
    if (dismissing) return;
    if (history.state?.aiodmaCustomer?.sheet) { dismissing = true; closeSheets({record:false}); history.back(); }
    else closeSheets();
  }
  function nativeGrab(handle, card, backdrop) {
    handle.className = 'v18-sheet-close v18-sheet-grab';
    const line = node('span'); line.setAttribute('aria-hidden','true'); handle.replaceChildren(line);
    let drag = null, suppressClickUntil = 0;
    function reset() {
      const active = drag; drag = null;
      card.style.removeProperty('transform'); card.style.removeProperty('transition'); card.classList.remove('v18-dragging');
      if (active && handle.hasPointerCapture(active.id)) handle.releasePointerCapture(active.id);
    }
    resetSheetDrags.add(reset);
    handle.addEventListener('pointerdown',event => {
      if (!event.isPrimary || event.button !== 0 || backdrop.getAttribute('aria-hidden') !== 'false') return;
      reset(); drag = {id:event.pointerId,start:event.clientY,x:event.clientX,dy:0,travel:0,time:performance.now()};
      handle.setPointerCapture(event.pointerId); card.classList.add('v18-dragging');
      card.style.setProperty('transition','none','important');
    });
    handle.addEventListener('pointermove',event => {
      if (!drag || drag.id !== event.pointerId) return;
      drag.dy = Math.max(0,event.clientY-drag.start);
      drag.travel = Math.max(drag.travel,Math.hypot(event.clientX-drag.x,event.clientY-drag.start));
      card.style.setProperty('transform',`translateY(${drag.dy}px)`,'important');
    });
    handle.addEventListener('pointerup',event => {
      if (!drag || drag.id !== event.pointerId) return;
      const {dy,time,travel} = drag, threshold = Math.max(50,Math.min(100,card.offsetHeight*.22));
      const dismiss = dy >= threshold || (dy > 24 && dy/Math.max(1,performance.now()-time) > .6);
      if (travel > 6) suppressClickUntil = performance.now()+350;
      reset(); if (dismiss) dismissSheets();
    });
    for (const name of ['pointercancel','lostpointercapture']) handle.addEventListener(name,() => {if(drag?.travel>6)suppressClickUntil=performance.now()+350;reset();});
    handle.addEventListener('click',event => {
      if (event.detail && performance.now()<suppressClickUntil) {event.preventDefault();event.stopImmediatePropagation();}
    },true);
  }
  function sheet(id, { record = true } = {}) {
    if (dismissing) return;
    viewRevision++;
    const previous = document.querySelector('.bottom-sheet-backdrop.open');
    const trigger = layerTrigger();
    closeSheets({ record:false, restore:false }); if (!previous) focusReturn = trigger;
    const el = $(id); el.inert = false; el.classList.add('open'); el.setAttribute('aria-hidden','false');
    all('.screen,#mainHeaderBar,#liveOrderActivityBanner').forEach(node => { node.inert = true; });
    const card = el.querySelector('.bottom-sheet-card'); if (card) card.scrollTop = 0;
    el.querySelectorAll('.mod-options-body,.v18-sheet-content').forEach(node => { node.scrollTop = 0; });
    if (record) recordNavigation(id); placeStatus();
    (el.querySelector('button:not(:disabled):not([hidden]),input:not(:disabled)') || el).focus({preventScroll:true});
  }
  function memorySheet({record = true} = {}) {
    viewRevision++;
    const previous = history.state?.aiodmaCustomer?.sheet, trigger = layerTrigger();
    closeSheets({record:false,restore:false}); if (!previous) focusReturn=trigger;
    const modal=$('customerMemoryBackdropModal'); modal.style.display='flex'; modal.setAttribute('aria-hidden','false'); modal.inert=false;
    $('phoneViewport').inert=true; modal.querySelector('.v18-memory-body').scrollTop=0;
    if(record) recordNavigation(modal.id,!!previous);
    placeStatus(); $('btnCloseMemoryModal').focus({preventScroll:true});
  }
  function imageFor(item, cls) { const img = node('img',cls); img.alt = item.name || ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer'; img.decoding = 'async';
    let safe = false;
    try {
      if (typeof item.image === 'string' && item.image) {
        const url = new URL(item.image,location.href), absolute = item.image.startsWith('https://');
        safe = !url.username && !url.password && ((url.origin === location.origin && url.pathname.startsWith('/assets/')) || (absolute && url.protocol === 'https:' && url.origin !== location.origin));
      }
    } catch { /* Missing or malformed images have a neutral fallback. */ }
    if (safe) img.src = item.image;
    else img.hidden = true;
    img.addEventListener('load',() => img.classList.add('loaded')); img.addEventListener('error',() => { img.hidden = true; }); return img; }
  function product(item) {
    const card = node('div','product-card'); card.dataset.menuId = item.id;
    const wrap = node('div','product-card-img-wrap'); wrap.append(imageFor(item,'product-card-img'));
    const body = node('div','product-card-body'), info = node('div'); info.append(node('div','product-card-title',item.name),node('div','product-card-desc',item.desc || ''));
    const bottom = node('div','product-card-bottom-row'); bottom.append(node('span','product-card-price',money(Number(item.price)*100)));
    const add = button('+','product-add-circle-btn btn-add-product',() => openModifier(item)); add.setAttribute('aria-label',`${t('add')} ${item.name}`); add.disabled = item.available !== true || item.stock === 0;
    bottom.append(add); body.append(info,bottom); card.append(wrap,body); return card;
  }
  function renderMenu() {
    if (state.category !== 'all' && !state.items.some(item => item.category === state.category)) state.category = 'all';
    const tabs = document.querySelector('.category-filter-scroll');
    const focused = tabs.contains(document.activeElement), scroll = tabs.scrollLeft; tabs.replaceChildren();
    for (const category of ['all',...new Set(state.items.map(item => item.category).filter(Boolean))]) {
      const tab = button(category === 'all' ? t('all') : category,`cat-pill-btn${state.category === category ? ' active' : ''}`,() => {state.category = category; renderMenu();});
      tab.dataset.cat = category; tab.setAttribute('role','tab'); tab.setAttribute('aria-selected',String(state.category === category)); tab.tabIndex = state.category === category ? 0 : -1; tabs.append(tab);
      tab.addEventListener('keydown',event => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault(); const options = [...tabs.children], index = options.indexOf(tab);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length-1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
        options[next].focus(); options[next].click();
      });
    }
    tabs.scrollLeft = scroll;
    if (focused) {
      const selected = tabs.querySelector('[aria-selected="true"]'); selected?.focus({preventScroll:true});
      if (selected) { const bounds = selected.getBoundingClientRect(), box = tabs.getBoundingClientRect();
        if (bounds.right > box.right) tabs.scrollLeft += bounds.right - box.right + 8;
        else if (bounds.left < box.left) tabs.scrollLeft -= box.left - bounds.left + 8;
      }
    }
    const term = $('catalogSearchInput').value.trim().toLocaleLowerCase();
    const items = state.items.filter(item => (state.category === 'all' || item.category === state.category) && `${item.name} ${item.desc || ''}`.toLocaleLowerCase().includes(term));
    $('menuGridContainer').replaceChildren(...items.map(product)); if (!items.length) $('menuGridContainer').append(node('p','',t('empty')));
    $('btnClearSearch').style.display = term ? '' : 'none';
  }
  async function loadMenu() { const data = await api(`/menu?merchant=${encodeURIComponent(state.merchantId)}`); state.merchant = data.merchant; state.items = data.items; renderMenu(); renderCart(); syncPaymentMethods(); }
  function openModifier(item) {
    state.selected = item; state.qty = 1; state.options = new Set(); set('modProductTitle',item.name); set('modProductDesc',item.desc || ''); set('modProductBasePrice',money(Number(item.price)*100));
    const img = imageFor(item,'mod-product-thumb'); img.id = 'modProductImg'; $('modProductImg').replaceWith(img);
    $('modDynamicGroups').replaceChildren();
    for (const group of item.modifierGroups || []) {
      const field = node('fieldset','modifier-group'), legend = node('legend','mod-group-title',`${group.name || group.id} (${group.min}-${group.max})`); field.append(legend);
      for (const option of group.options) {
        const label = node('label','v18-option'); const input = node('input'); input.type = group.min === 1 && group.max === 1 ? 'radio' : 'checkbox'; input.name = `modifier:${group.id}`; input.value = option.id; input.dataset.group = group.id; input.disabled = option.available === false || group.max === 0;
        input.addEventListener('change',() => {
          const chosen = group.options.filter(o => state.options.has(o.id));
          if (input.checked && chosen.length >= group.max) {
            if (group.max === 1) { for (const old of chosen) state.options.delete(old.id); field.querySelectorAll('input').forEach(el => {if (el !== input) el.checked = false;}); }
            else { input.checked = false; return; }
          }
          if (input.checked) state.options.add(option.id); else state.options.delete(option.id); syncControls();
        });
        label.append(input,node('span','',`${option.name} (+${money(Number(option.price)*100)})`)); field.append(label);
      }
      $('modDynamicGroups').append(field);
    }
    syncControls(); sheet('modifierModalBackdrop');
  }
  function selectedItem() { return state.items.find(item => item.id === state.selected?.id); }
  function modifierLimit() {
    const item = selectedItem(); if (!item || !item.available) return 0;
    const line = {menuId:item.id,optionIds:[...state.options]};
    const existing = state.cart.lines.find(l => lineKey(l) === lineKey(line))?.qty || 0;
    const total = state.cart.lines.filter(l => l.menuId === item.id).reduce((sum,l) => sum+l.qty,0);
    return Math.max(0,Math.min(99-existing,Number.isInteger(item.stock) ? item.stock-total : 99));
  }
  function validModifiers() { const item = selectedItem(); return !!item && state.qty <= modifierLimit() && [...state.options].every(id => (item.modifierGroups || []).some(g => g.options.some(o => o.id === id && o.available !== false))) && (item.modifierGroups || []).every(group => { const count = group.options.filter(o => state.options.has(o.id)).length; return count >= group.min && count <= group.max; }); }
  function lineKey(line) { return JSON.stringify([line.menuId,[...(line.optionIds || [])].sort()]); }
  async function changeCart(transform) {
    invalidate(); const lines = transform(state.cart.lines.map(line => ({menuId:line.menuId,qty:line.qty,optionIds:[...line.optionIds]})));
    state.cart = await transact('/cart','PUT',{expectedVersion:state.cart.version,lines},'cart'); renderCart(); notice(t('saved'),false,'success');
  }
  function renderCart() {
    const list = $('cartSheetItemsList'), focus = document.activeElement;
    const restore = focus?.dataset.cartKey ? {key:focus.dataset.cartKey,delta:focus.dataset.delta} : null;
    list.replaceChildren(); let count = 0;
    for (const line of state.cart.lines) {
      count += line.qty; const item = state.items.find(i => i.id === line.menuId), row = node('div','cart-item-row'), info = node('div','cart-item-info');
      if (item) row.append(imageFor(item,'cart-item-thumb'));
      const names = (item?.modifierGroups || []).flatMap(g => g.options).filter(o => line.optionIds.includes(o.id)).map(o => o.name);
      info.append(node('div','cart-item-title',item?.name || line.menuId),node('div','cart-item-sub',names.join(', '))); row.append(info);
      const stepper = node('div','cart-stepper-control');
      for (const delta of [-1,1]) {
        const control = button(delta < 0 ? '-' : '+','stepper-btn',() => run(() => changeCart(lines => lines.map(l => lineKey(l) === lineKey(line) ? {...l,qty:l.qty+delta} : l).filter(l => l.qty > 0))));
        const total = state.cart.lines.filter(l => l.menuId === line.menuId).reduce((sum,l) => sum+l.qty,0);
        control.dataset.cartMutation = 'true'; control.dataset.cartKey = lineKey(line); control.dataset.delta = String(delta);
        control.dataset.limit = String(delta > 0 && (line.qty >= 99 || !item?.available || (Number.isInteger(item.stock) && total >= item.stock))); control.setAttribute('aria-label',`${delta < 0 ? '-' : '+'} ${item?.name || line.menuId}`);
        stepper.append(control); if (delta < 0) stepper.append(node('span','stepper-qty-val',line.qty));
      }
      row.append(stepper); list.append(row);
    }
    if (!count) list.append(node('p','',t('empty')));
    set('chatCartBadge',count); set('catalogCartBadge',count); set('catalogCartTotal',t('review'));
    // Never present catalog estimates or empty placeholders as a financial total.
    const priced = state.quote && state.quote.cartVersion === state.cart.version && Date.parse(state.quote.expiresAt) > Date.now();
    $('cartSheetTotal').closest('.cart-calc-box').hidden = !priced;
    if (priced) totals('cartSheet',state.quote);
    syncControls();
    if (restore) {
      const next = [...list.querySelectorAll('button')].find(el => el.dataset.cartKey === restore.key && el.dataset.delta === restore.delta);
      (next?.disabled ? next.parentElement.querySelector('button:not(:disabled)') : next)?.focus({preventScroll:true});
    }
  }
  function totals(prefix, snapshot) {
    set(`${prefix}Subtotal`,money(snapshot.subtotalMinor,snapshot.currency)); set(`${prefix}Tax`,money(snapshot.taxMinor,snapshot.currency)); set(`${prefix}Total`,money(snapshot.totalMinor,snapshot.currency));
    const box = $(`${prefix}Total`).closest('.cart-calc-box'); box.querySelectorAll('.v18-extra-total').forEach(el => el.remove());
    for (const [key,label] of [['discountMinor','discount'],['serviceMinor','service']]) if (snapshot[key]) { const row = node('div','calc-row v18-extra-total'); row.append(node('span','',t(label)),node('span','',`${key === 'discountMinor' ? '-' : ''}${money(snapshot[key],snapshot.currency)}`)); box.insertBefore(row,box.lastElementChild); }
    $(`${prefix}Tax`).previousElementSibling.textContent = t('tax');
  }
  function snapshotItems(container, snapshot) {
    container.replaceChildren(); for (const item of snapshot.items || []) { const row = node('div','cart-item-row'); row.setAttribute('role','listitem'); const info = node('div','cart-item-info'); info.append(node('div','cart-item-title',`${item.qty} x ${item.name}`),node('div','cart-item-sub',(item.modifiers || []).map(o => o.name).join(', '))); row.append(info,node('span','cart-item-price',money(item.lineTotalMinor,snapshot.currency))); container.append(row); }
  }
  async function reviewQuote() {
    const view = viewRevision;
    await verifySession(); if (state.pending) throw new Error(t('pending'));
    state.cart = await api('/cart'); renderCart();
    if (view !== viewRevision) return;
    const quote = await api('/quotes',{method:'POST',body:{expectedVersion:state.cart.version}});
    if (view !== viewRevision) return;
    state.quote = quote;
    totals('cartSheet',quote);
    notice('');
    snapshotItems($('paymentItemsPreviewList'),state.quote); totals('paySheet',state.quote); set('paySheetTitle',t('review'));
    document.querySelector('.pm-header-sub').textContent = t('paymentNote'); sheet('paymentBackdrop', {record:history.state?.aiodmaCustomer?.sheet !== 'paymentBackdrop'});
    clearTimeout(quoteTimer); quoteTimer = setTimeout(() => {invalidate(); notice(t('expired'));},Math.max(0,new Date(state.quote.expiresAt).getTime()-Date.now())); syncControls();
  }
  async function accepted(order) {
    if (!validOrder(order)) throw new Error(t('reconnect'));
    updateOrder(order);
    invalidate(); showScreen('screenOrderSuccess',{replace:true}); notice('');
    state.cart = await api('/cart'); renderCart();
  }
  function paymentLabel(order) {
    return ({UNPAID:t('unpaid'),PAID:t('paid'),PARTIALLY_REFUNDED:({id:'DIKEMBALIKAN SEBAGIAN',en:'PARTIALLY REFUNDED',ms:'DIPULANGKAN SEBAHAGIAN'})[state.language],REFUNDED:({id:'DIKEMBALIKAN',en:'REFUNDED',ms:'DIPULANGKAN'})[state.language]})[order.paymentStatus];
  }
  function validOrder(order) {
    const text = (v,max) => typeof v === 'string' && v.length > 0 && v.length <= max;
    const minor = v => Number.isSafeInteger(v) && v >= 0;
    // Validate the entire snapshot before touching state or any receipt/tracker DOM.
    return !!order && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id) && order.merchantId === state.merchantId && order.tableNum === state.tableId &&
      text(order.orderNumber,100) && text(order.table,100) && text(order.createdAt,100) && Number.isFinite(Date.parse(order.createdAt)) &&
      Number.isSafeInteger(order.version) && order.version > 0 && /^[A-Z]{3}$/.test(order.currency) &&
      ['received','accepted','preparing','ready','served','completed','cancelled','rejected'].includes(order.status) &&
      ['UNPAID','PAID','PARTIALLY_REFUNDED','REFUNDED'].includes(order.paymentStatus) && ['CASH','MANUAL_TRANSFER'].includes(order.paymentMethod) &&
      ['subtotalMinor','taxMinor','serviceMinor','discountMinor','totalMinor'].every(key => minor(order[key])) &&
      Array.isArray(order.items) && order.items.length > 0 && order.items.length <= 50 && order.items.every(item => item && text(item.name,500) &&
        Number.isInteger(item.qty) && item.qty > 0 && item.qty <= 99 && minor(item.lineTotalMinor) &&
        Array.isArray(item.modifiers) && item.modifiers.length <= 30 && item.modifiers.every(option => option && text(option.name,500)));
  }
  function updateOrder(order) {
    if (!validOrder(order) || (state.order?.id === order.id && state.order.version > order.version)) return false;
    state.order = order;
    const label = t(order.status), paid = paymentLabel(order);
    set('successSubtitle',`#${order.orderNumber} - ${label}. ${paid}`); set('receiptBrandName',state.merchant?.name || 'AIODMA'); set('receiptOrderId',`#${order.orderNumber}`);
    set('receiptDateTime',new Date(order.createdAt).toLocaleString({id:'id-ID',en:'en-US',ms:'ms-BN'}[state.language]));
    set('receiptPaymentName',order.paymentMethod === 'CASH' ? t('cash') : t('transfer'));
    document.querySelector('.receipt-success-text').textContent = paid; document.querySelector('.receipt-pm-status-pill').textContent = paid;
    document.querySelector('.receipt-order-subtext').textContent = label;
    document.querySelector('.thermal-paper-card').dataset.payment = order.paymentStatus;
    $('trackerPaymentStatusLabel').dataset.payment = order.paymentStatus;
    snapshotItems($('receiptItemsContainer'),order); totals('receipt',order);
    set('trackerOrderNumberLabel',`#${order.orderNumber} - ${order.table}`); set('trackerStatusBadge',label); set('trackerPaymentStatusLabel',paid); set('trackerOrderTotalVal',money(order.totalMinor,order.currency)); snapshotItems($('trackerItemsList'),order);
    const progress = {received:1,accepted:1,preparing:2,ready:3,served:4,completed:4}[order.status] || 0;
    ['Received','Preparing','Ready','Completed'].forEach((name,i) => $(`trackerStep${name}`).classList.toggle('active',progress > i));
    const descriptions = ({id:['Masuk ke antrean dapur','Tim dapur menyiapkan pesanan','Menunggu diantar ke meja','Diantar ke meja Anda'],en:['In the kitchen queue','The kitchen is preparing your order','Waiting for table delivery','Delivered to your table'],ms:['Dalam giliran dapur','Dapur sedang menyediakan pesanan','Menunggu dihantar ke meja','Dihantar ke meja anda']})[state.language];
    ['Received','Preparing','Ready','Completed'].forEach((name,i) => {
      $(`trackerStep${name}`).querySelector('.step-title').textContent = `${i+1}. ${t(['received','preparing','ready',order.status==='completed'?'completed':'served'][i])}`;
      $(`trackerStep${name}`).querySelector('.step-desc').textContent = descriptions[i];
    });
    const timeline = document.querySelector('.tracker-steps-timeline'); timeline.setAttribute('aria-valuemin','0'); timeline.setAttribute('aria-valuenow',String(progress)); timeline.setAttribute('aria-valuetext',label);
    timeline.hidden = ['cancelled','rejected'].includes(order.status);
    for (const id of ['trackerStatusBadge','activityBannerBadge']) $(id).dataset.status = order.status;
    set('activityBannerTitle',`#${order.orderNumber} - ${order.table}`); set('activityBannerSub',`${label} - ${paid}`); set('activityBannerBadge',label);
    $('liveOrderActivityBanner').style.display = ''; $('menuItemOpenTracker').style.display = '';
    return true;
  }
  async function loadOrders() {
    await verifySession(); const before = state.order;
    const orders = await api('/orders');
    if (!Array.isArray(orders)) throw new Error(t('reconnect'));
    if (before?.id !== state.order?.id) return;
    const selected = orders.find(o => o.id === state.order?.id) || orders[0];
    if (selected) { if (!validOrder(selected)) throw new Error(t('reconnect')); updateOrder(selected); }
    else { state.order = null; $('liveOrderActivityBanner').style.display = 'none'; $('menuItemOpenTracker').style.display = 'none'; }
  }
  function refreshCatalog() {
    invalidate(); menuDirty = true;
    if (menuRefresh) return;
    // Coalesce replay bursts while still re-reading updates committed mid-fetch.
    menuRefresh = run(async()=>{
      while(menuDirty && state.session) {menuDirty=false;await loadMenu();}
    }).finally(()=>{menuRefresh=null;});
  }
  function connectEvents() {
    state.events?.close(); const epoch = state.epoch; const events = new EventSource('/api/v1/events?surface=customer'); state.events = events;
    trackingConnection(false);
    events.onmessage = event => {
      if (epoch !== state.epoch) return;
      try { const data = JSON.parse(event.data); if (data.order && (!state.order || state.order.id === data.order.id)) {
          const previous=state.order;
          const changed=previous?.id===data.order.id && data.order.version>previous.version;
          const applied = updateOrder(data.order);
          if(applied && changed && !state.pending && !state.busy) {
            const message = `#${data.order.orderNumber} - ${t(data.order.status)}. ${paymentLabel(data.order)}`;
            if ($('orderTrackerBackdrop').classList.contains('open')) { if (status.hidden || status.dataset.tone !== 'error') set('accessibilityLiveRegion',message); }
            else notice(message,false,'success',true);
          }
        }
        if(data.type==='WAITER_CALL_UPDATED') {
          const message = ({id:{acknowledged:'Pelayan sedang menangani panggilan Anda.',resolved:'Panggilan pelayan selesai.'},en:{acknowledged:'A waiter is handling your request.',resolved:'Your waiter request is resolved.'},ms:{acknowledged:'Pelayan sedang mengurus permintaan anda.',resolved:'Permintaan pelayan selesai.'}})[state.language][data.call?.status];
          if (message) notice(message,false,'success',true);
        }
        if (data.type === 'MENU_UPDATED') refreshCatalog();
      } catch { /* Malformed events must not mutate customer state. */ }
    };
    events.onopen = () => { if (state.session && epoch === state.epoch) {trackingConnection(true);loadOrders().catch(report);} };
    events.onerror = () => { if (epoch !== state.epoch) return; trackingConnection(false); if (!navigator.onLine) notice(t('offline'),true,'error',true); };
  }
  function trackingConnection(live) {
    state.trackingLive = live && navigator.onLine;
    set('trackerConnectionLabel',state.trackingLive ? ({id:'Terhubung ke pembaruan langsung',en:'Connected to live updates',ms:'Disambung ke kemas kini langsung'})[state.language] : ({id:navigator.onLine?'Menyambungkan ulang. Status terakhir tetap ditampilkan.':'Offline. Status terakhir tetap ditampilkan.',en:navigator.onLine?'Reconnecting. Showing the last known status.':'Offline. Showing the last known status.',ms:navigator.onLine?'Menyambung semula. Status terakhir dipaparkan.':'Luar talian. Status terakhir dipaparkan.'})[state.language]);
  }
  function bubble(text, user = false) { const area = $('chatScrollArea'), following = area.scrollHeight-area.scrollTop-area.clientHeight < 80;
    const el = node('div',user ? 'chat-bubble-user' : 'chat-bubble-ai'); el.append(node('div',user ? '' : 'chat-bubble-ai-text',text)); $('chatEmptyState').hidden = true; $('chatMessageThread').style.display = ''; $('chatMessageThread').append(el); if (user || following) area.scrollTop = area.scrollHeight; return el; }
  async function chat(message) {
    if (!message || state.chatBusy) return; state.chatBusy = true; syncControls(); bubble(message,true);
    try {
      await verifySession(); const messageId = crypto.randomUUID();
      const response = await api('/ai/chat',{method:'POST',body:{messageId,message,language:state.language}});
      const area = $('chatScrollArea'), following = area.scrollHeight-area.scrollTop-area.clientHeight < 80;
      const el = bubble(response.text || t('unavailable')); el.dataset.mode = response.mode || '';
      for (const recommendation of response.recommendations || []) { const id = typeof recommendation === 'string' ? recommendation : recommendation.menuId || recommendation.id; const item = state.items.find(i => i.id === id); if (item) el.append(product(item)); }
      for (const proposal of response.proposals || []) {
        const expectedVersion = proposal.args?.expectedVersion ?? state.cart.version;
        const action = proposal.name || proposal.type || proposal.action || proposal.kind;
        const panel = node('div','v18-proposal'); panel.append(node('p','',proposal.summary || proposal.description || ({add_cart_items:t('add'),get_quote:t('review'),present_checkout:t('review'),request_waiter:t('help')}[action]) || action || t('review')));
        const proposedLines = proposal.args?.items || proposal.lines || (proposal.args?.lineId ? [{...state.cart.lines[Number(proposal.args.lineId.replace('line_',''))],...proposal.args}] : []);
        for (const line of proposedLines) { const item = state.items.find(i => i.id === line.menuId); const options = (item?.modifierGroups || []).flatMap(g => g.options).filter(o => (line.optionIds || []).includes(o.id)); panel.append(node('p','',`${line.qty} x ${item?.name || line.menuId} ${options.map(o => o.name).join(', ')}`)); }
        if (proposal.args?.reason) panel.append(node('p','',proposal.args.reason));
        const confirm = button(t('confirm'),'tracker-btn-outline',() => {
          confirm.disabled = true;
          run(async () => {
            const result = await transact(`/ai/proposals/${encodeURIComponent(proposal.id)}/confirm`,'POST',{messageId,expectedVersion},'proposal');
            if (result.action === 'present_checkout' || ['get_quote','present_checkout','checkout','prepare_checkout'].includes(action)) {panel.replaceChildren(node('p','',t('review')));await reviewQuote();return;}
            state.cart = await api('/cart'); invalidate(); renderCart(); panel.replaceChildren(node('p','',t(result.action === 'waiter_requested' ? 'waiter' : 'saved')));
          }).finally(syncControls);
        }); panel.append(confirm); el.append(panel);
      }
      if (following) area.scrollTop = area.scrollHeight;
    } catch(error) { if (!$('chatInputText').value) $('chatInputText').value = message; throw error; }
    finally {state.chatBusy = false; syncControls();}
  }
  function syncControls() {
    const blocked = !state.session || !navigator.onLine || state.busy > 0 || !!state.pending || state.merchant?.orderingPaused;
    const cartInvalid = state.cart.lines.some(line => {const item=state.items.find(i=>i.id===line.menuId),total=state.cart.lines.filter(l=>l.menuId===line.menuId).reduce((sum,l)=>sum+l.qty,0);return !item?.available || (Number.isInteger(item.stock)&&total>item.stock) || line.optionIds.some(id=>!(item?.modifierGroups||[]).some(g=>g.options.some(o=>o.id===id&&o.available!==false)));});
    if ($('btnProceedToPayment')) $('btnProceedToPayment').disabled = blocked || !state.cart.lines.length || cartInvalid;
    const fresh = state.quote && state.quote.cartVersion === state.cart.version && Date.parse(state.quote.expiresAt) > Date.now();
    $('cartSheetTotal').closest('.cart-calc-box').hidden = !fresh;
    if ($('btnProcessPayment')) { $('btnProcessPayment').hidden = !fresh; $('btnProcessPayment').disabled = blocked || !fresh || !state.merchant?.paymentMethods?.includes(state.payment); }
    if ($('btnRefreshQuote')) { $('btnRefreshQuote').hidden = !!fresh; $('btnRefreshQuote').disabled = blocked || !state.cart.lines.length; $('btnRefreshQuote').textContent = t('review'); }
    if ($('btnAddCustomizedToCart')) $('btnAddCustomizedToCart').disabled = blocked || !validModifiers();
    all('[data-cart-mutation]').forEach(el => { el.disabled = blocked || el.dataset.limit === 'true'; });
    if ($('btnClearCart')) $('btnClearCart').disabled = blocked || !state.cart.lines.length;
    if ($('btnClearCart')) $('btnClearCart').hidden = !state.cart.lines.length;
    all('.v18-proposal button').forEach(el => { el.disabled = blocked; });
    $('btnModMinus').disabled = blocked || state.qty <= 1; $('btnModPlus').disabled = blocked || state.qty >= modifierLimit();
    $('modQtyNumber').setAttribute('aria-label',String(state.qty));
    all('.payment-method-card[data-pm]').forEach(el => el.setAttribute('aria-disabled',String(blocked)));
    if ($('btnChatSend')) { $('btnChatSend').disabled = blocked || state.chatBusy || !$('chatInputText').value.trim(); $('btnChatSend').style.display = $('chatInputText').value.trim() ? '' : 'none'; }
    set('modQtyNumber',state.qty); set('modBtnAddText',t('add')); set('btnProceedToPayment',t('review')); set('btnProcessPayment',t('confirm'));
    for (const id of ['btnProceedToPayment','btnProcessPayment','btnAddCustomizedToCart','btnChatSend']) $(id).setAttribute('aria-busy',String(state.busy > 0));
  }
  function syncPaymentMethods() {
    const methods = all('.payment-method-card[data-pm]');
    const allowed = state.merchant?.paymentMethods || [];
    if (!allowed.includes(state.payment)) state.payment = allowed.find(m => ['CASH','MANUAL_TRANSFER'].includes(m)) || '';
    methods.forEach(el => {
      const available = allowed.includes(el.dataset.pm) && ['CASH','MANUAL_TRANSFER'].includes(el.dataset.pm);
      el.hidden = !available; el.style.display = available ? '' : 'none';
      const selected = available && state.payment === el.dataset.pm;
      el.classList.toggle('selected',selected); el.setAttribute('aria-checked',String(selected)); el.tabIndex = selected ? 0 : -1;
    });
    syncControls();
  }
  function updateTableLabels() {
    if (!Number.isInteger(state.tableId) || state.tableId < 1) return;
    const table = state.tableId;
    set('labelMenuTable',`Table ${table}`);
    set('cartSheetTitle',{
      id:`Keranjang Pesanan Meja ${table}`,
      en:`Table ${table} order cart`,
      ms:`Troli Pesanan Meja ${table}`
    }[state.language]);
    const badge = document.querySelector('.lang-table-badge-pill');
    if (badge) {
      badge.querySelector('span').textContent = `TABLE ${table}`;
      badge.setAttribute('aria-label',{
        id:`Nomor Meja Pelanggan: Meja ${table}`,
        en:`Customer table number: Table ${table}`,
        ms:`Nombor meja pelanggan: Meja ${table}`
      }[state.language]);
    }
  }
  function language(value) {
    state.language = typeof value === 'string' && value.startsWith('en') ? 'en' : typeof value === 'string' && value.startsWith('ms') ? 'ms' : 'id'; document.documentElement.lang = state.language;
    try {storage.put('aiodma:v18:language',state.language);} catch { /* Preferences are optional. */ }
    set('headerLangText',state.language.toUpperCase()); set('labelMenuLanguage',state.language.toUpperCase()); $('catalogSearchInput').placeholder = t('search');
    $('chatInputText').placeholder = {id:'Tulis pesanan atau pertanyaan',en:'Order or ask a question',ms:'Tulis pesanan atau soalan'}[state.language];
    all('.payment-method-card[data-pm]').forEach(el=>{const label=t(el.dataset.pm==='CASH'?'cash':'transfer');el.querySelector('.pm-name').textContent=label;el.setAttribute('aria-label',label);});
    const labels = {id:{orderSuccessTitle:'Pesanan diterima',btnTrackLiveOrder:'Lacak pesanan',btnSaveReceipt:'Lihat struk',btnBackToChat:'Kembali ke chat',btnReceiptBackToHome:'Kembali ke chat'},en:{orderSuccessTitle:'Order received',btnTrackLiveOrder:'Track order',btnSaveReceipt:'View receipt',btnBackToChat:'Back to chat',btnReceiptBackToHome:'Back to chat'},ms:{orderSuccessTitle:'Pesanan diterima',btnTrackLiveOrder:'Jejak pesanan',btnSaveReceipt:'Lihat resit',btnBackToChat:'Kembali ke chat',btnReceiptBackToHome:'Kembali ke chat'}}[state.language];
    Object.entries(labels).forEach(([id,label])=>{set(id,label);$(id).setAttribute('aria-label',label);});
    for (const [id,key] of [['btnProceedToPayment','review'],['btnProcessPayment','confirm'],['btnAddCustomizedToCart','add']]) $(id).setAttribute('aria-label',t(key));
    set('labelCustomerMemory',{id:'Preferensi & memori',en:'Preferences & memory',ms:'Pilihan & memori'}[state.language]);
    set('btnClearCart',{id:'Kosongkan keranjang',en:'Clear cart',ms:'Kosongkan troli'}[state.language]);
    $('btnHeaderBack').setAttribute('aria-label',labels.btnBackToChat);
    const closeLabel = {id:'Tutup panel',en:'Close panel',ms:'Tutup panel'}[state.language];
    all('.v18-sheet-grab').forEach(el=>{el.setAttribute('aria-label',closeLabel);el.title=closeLabel;});
    updateTableLabels();
    renderTheme();
    trackingConnection(state.trackingLive);
    renderMenu(); renderCart(); if (state.order) updateOrder(state.order);
  }
  function theme() { const dark = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try {storage.put('aiodma:v18:theme',dark ? 'dark' : 'light');} catch { /* Preferences are optional. */ }
    renderTheme();
  }
  function renderTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#000000' : '#FFFFFF';
    for (const prefix of ['header','lang']) { $(`${prefix}ThemeIconDark`).style.display = dark ? 'none' : ''; $(`${prefix}ThemeIconLight`).style.display = dark ? '' : 'none'; }
    for (const id of ['btnHeaderThemeToggle','btnLangThemeToggle']) { $(id).setAttribute('aria-pressed',String(dark)); $(id).setAttribute('aria-label',({id:dark?'Mode terang':'Mode gelap',en:dark?'Light mode':'Dark mode',ms:dark?'Mod terang':'Mod gelap'})[state.language]); }
    set('themeMenuLabel',({id:dark?'Mode terang':'Mode gelap',en:dark?'Light mode':'Dark mode',ms:dark?'Mod terang':'Mod gelap'})[state.language]);
  }
  function bind(id, action) { $(id)?.addEventListener('click',action); }
  async function openMemory({record = true} = {}) {
    const requestedView = viewRevision;
    await verifySession();
    if (requestedView !== viewRevision) return;
    const copy={
      id:{title:'Preferensi & memori',scope:'Tersimpan hanya untuk sesi meja ini, dengan persetujuan Anda.',label:'Preferensi',consent:'Saya setuju menyimpan preferensi ini',save:'Simpan preferensi',remove:'Hapus preferensi dan percakapan',saved:'Preferensi tersimpan',deleted:'Preferensi dan percakapan dihapus',hint:'Satu preferensi per baris'},
      en:{title:'Preferences & memory',scope:'Saved only for this table session, with your consent.',label:'Preferences',consent:'I consent to saving these preferences',save:'Save preferences',remove:'Delete preferences and conversation',saved:'Preferences saved',deleted:'Preferences and conversation deleted',hint:'One preference per line'},
      ms:{title:'Pilihan & memori',scope:'Disimpan untuk sesi meja ini sahaja, dengan persetujuan anda.',label:'Pilihan',consent:'Saya bersetuju menyimpan pilihan ini',save:'Simpan pilihan',remove:'Padam pilihan dan perbualan',saved:'Pilihan disimpan',deleted:'Pilihan dan perbualan dipadam',hint:'Satu pilihan setiap baris'}
    }[state.language];
    memorySheet({record});
    const openedView = viewRevision;
    set('memoryModalTitle',copy.title);set('memoryModalSubtitle',copy.scope);set('memoryModalSectionLabel',copy.label);
    const content=$('memoryModalContent');content.replaceChildren(node('p','',t('reconnect')));$('btnResetMemoryProfile').hidden=true;
    $('btnCloseMemoryModal').focus();
    const profile=await api('/profile');
    if (openedView !== viewRevision) return;
    const form=node('form','v18-memory-form'),label=node('label','',copy.label),preferences=node('textarea');
    preferences.id='v18MemoryPreferences';preferences.maxLength=4020;preferences.rows=5;preferences.value=(profile.preferences||[]).join('\n');preferences.placeholder=copy.hint;label.append(preferences);
    const checkLabel=node('label','v18-option'),consent=node('input');consent.type='checkbox';consent.id='v18MemoryConsent';consent.checked=profile.consent===true;checkLabel.append(consent,node('span','',copy.consent));
    const save=button(copy.save,'tracker-btn-outline');save.type='submit';save.disabled=!consent.checked;consent.addEventListener('change',()=>{save.disabled=!consent.checked;});
    form.append(label,checkLabel,save);content.replaceChildren(form);
    form.addEventListener('submit',event=>{event.preventDefault();if(!consent.checked||save.disabled)return;save.disabled=true;run(async()=>{
      await verifySession();const values=preferences.value.split('\n').map(value=>value.trim()).filter(Boolean);
      if (values.length>20 || values.some(value=>value.length>200)) throw new Error({id:'Maksimal 20 preferensi, masing-masing 200 karakter.',en:'Use up to 20 preferences, each up to 200 characters.',ms:'Maksimum 20 pilihan, setiap satu sehingga 200 aksara.'}[state.language]);
      await api('/profile',{method:'PUT',body:{consent:true,preferences:values}});notice(copy.saved,false,'success');
    }).finally(()=>{save.disabled=!consent.checked;});});
    const remove=$('btnResetMemoryProfile');remove.hidden=false;remove.textContent=copy.remove;remove.disabled=false;
    remove.onclick=()=>{if(remove.disabled)return;remove.disabled=true;run(async()=>{
      await verifySession();await api('/profile',{method:'DELETE'});preferences.value='';consent.checked=false;save.disabled=true;
      $('chatMessageThread').replaceChildren();$('chatMessageThread').style.display='none';$('chatEmptyState').hidden=false;notice(copy.deleted,false,'success');
    }).finally(()=>{remove.disabled=false;});};
  }
  async function initialize() {
    state.epoch++; for (const controller of controllers) controller.abort(); state.events?.close(); state.session = null; invalidate();
    let session; try { session = await api('/session'); } catch (error) { if (error.status !== 401) throw error; }
    if (!state.merchantId && session?.role === 'guest') {state.merchantId = session.tenantId; state.tableId = session.tableId;}
    if (!state.merchantId) throw new Error(t('session'));
    await loadMenu();
    if (!session || session.role !== 'guest' || session.tenantId !== state.merchantId || session.tableId !== state.tableId) {
      if (!query.get('token')) throw new Error(t('session'));
      session = await api('/session',{method:'POST',body:{merchantId:state.merchantId,tableId:state.tableId,token:query.get('token')}});
    }
    state.session = session; state.merchantId = session.tenantId; state.tableId = session.tableId;
    const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(session.csrfToken));
    state.namespace = `aiodma:v18:${state.merchantId}:${Array.from(new Uint8Array(digest)).map(n => n.toString(16).padStart(2,'0')).join('')}`;
    state.pending = readPending();
    updateTableLabels();
    const clean = new URL(location.href); clean.searchParams.delete('token'); history.replaceState(history.state,'',clean); query.delete('token');
    state.cart = await api('/cart'); renderCart(); await loadOrders(); connectEvents();
    if (state.pending) notice(t('pending'),true); else notice('');
  }
  function boot() {
    function sizeViewport() {
      const viewport = window.visualViewport;
      // Keep pinch zoom native: only keyboard/browser chrome resizing adjusts the shell.
      if (viewport && Math.abs(viewport.scale - 1) > .01) return;
      document.documentElement.style.setProperty('--app-height',`${viewport?.height || innerHeight}px`);
      document.documentElement.style.setProperty('--viewport-top',`${viewport?.offsetTop || 0}px`);
    }
    let viewportFrame = 0;
    const queueViewport = () => { if (!viewportFrame) viewportFrame = requestAnimationFrame(() => {viewportFrame=0;sizeViewport();}); };
    sizeViewport(); window.addEventListener('resize',queueViewport); window.visualViewport?.addEventListener('resize',queueViewport); window.visualViewport?.addEventListener('scroll',queueViewport);
    $('modOptionsBody').prepend(document.querySelector('.mod-header-row'));
    $('modSpecialNote').closest('.modifier-group').hidden = true;
    $('btnChatNotes').hidden = true;
    $('catalogSearchInput').style.removeProperty('outline');
    $('mobileQrBackdrop')?.remove();
    const refresh = button(t('review'),'tracker-btn-outline',() => run(reviewQuote)); refresh.id = 'btnRefreshQuote'; refresh.hidden = true; $('btnProcessPayment').before(refresh);
    $('phoneViewport').prepend(status);
    const memoryCard=$('customerMemoryBackdropModal').querySelector('.mobile-qr-card-modal'),memoryHeader=$('memoryModalTitle').parentElement,memoryBody=node('div','v18-memory-body');
    memoryHeader.classList.add('v18-memory-header');
    memoryBody.append($('memoryModalSubtitle'),$('memoryModalSectionLabel').parentElement);
    memoryCard.prepend($('btnCloseMemoryModal'));memoryHeader.after(memoryBody);
    nativeGrab($('btnCloseMemoryModal'),memoryCard,$('customerMemoryBackdropModal'));
    new ResizeObserver(measureStatus).observe(status);
    new ResizeObserver(() => { if ($('mainHeaderBar').offsetHeight) document.documentElement.style.setProperty('--measured-header-space',`${$('mainHeaderBar').offsetHeight + 4}px`); }).observe($('mainHeaderBar'));
    new ResizeObserver(() => document.documentElement.style.setProperty('--activity-height',`${$('liveOrderActivityBanner').offsetHeight ? $('liveOrderActivityBanner').offsetHeight+8 : 0}px`)).observe($('liveOrderActivityBanner'));
    all('.bottom-sheet-backdrop').forEach(el => {
      el.inert = true; el.addEventListener('click',event => {if (event.target === el) dismissSheets();});
      const close = button('×','header-btn-circle v18-sheet-close',dismissSheets); close.setAttribute('aria-label','Close'); el.querySelector('.bottom-sheet-card')?.prepend(close);
      nativeGrab(close,el.querySelector('.bottom-sheet-card'),el);
      if (el.id !== 'modifierModalBackdrop') {
        const card=el.querySelector('.bottom-sheet-card'),content=node('div','v18-sheet-content'),actions=node('div','v18-sheet-actions');
        for (const child of [...card.children]) {
          if (child===close) continue;
          if (['btnProceedToPayment','btnProcessPayment','btnRefreshQuote'].includes(child.id)) actions.append(child);
          else content.append(child);
        }
        card.classList.add('v18-framed-sheet');card.append(content);if(actions.children.length)card.append(actions);
        if (el.id==='cartBackdrop') {const clear=button('','tracker-btn-outline',()=>run(()=>changeCart(()=>[])));clear.id='btnClearCart';$('cartSheetTitle').after(clear);}
      }
    });
    all('.chat-scroll-area,.catalog-scroll-area,.v18-sheet-content,.mod-options-body,.v18-memory-body').forEach(el => {el.tabIndex=0;});
    document.addEventListener('keydown',event => {
      if (event.key === 'Escape') { event.preventDefault(); if (document.querySelector('.bottom-sheet-backdrop.open,#customerMemoryBackdropModal[aria-hidden="false"]')) dismissSheets(); else closePopups(true); }
      const opened = document.querySelector('.bottom-sheet-backdrop.open,#customerMemoryBackdropModal[aria-hidden="false"]');
      if (event.key === 'Tab' && opened) {const focusable = [...opened.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')].filter(el => el.getClientRects().length && !el.closest('[inert]')); const first=focusable[0],last=focusable.at(-1); if (event.shiftKey && (document.activeElement === first || !opened.contains(document.activeElement))) {event.preventDefault();last?.focus();} else if (!event.shiftKey && (document.activeElement === last || !opened.contains(document.activeElement))) {event.preventDefault();first?.focus();}}
      if (['Enter',' '].includes(event.key) && event.target.matches('[role="button"],[role="menuitem"],[role="menuitemradio"],[role="radio"]')) {event.preventDefault();event.target.click();}
    });
    all('[data-lang]').forEach(el => el.addEventListener('click',() => {language(el.dataset.lang);showScreen('screenChatCashier');}));
    for (const id of ['btnHeaderLangToggle','menuItemChangeLanguage']) bind(id,() => showScreen('screenSelectLanguage'));
    for (const id of ['btnHeaderThemeToggle','btnLangThemeToggle','menuItemToggleTheme']) bind(id,theme);
    for (const id of ['btnHeaderBack','btnLangBack','btnBackToChat','btnReceiptBackToHome']) bind(id,() => showScreen('screenChatCashier'));
    bind('optModeChat',() => showScreen('screenChatCashier')); for (const id of ['optModeMenu','qpLihatSemuaMenu']) bind(id,() => showScreen('screenMenuCatalog'));
    for (const [id,menu] of [['btnModeTrigger','modeDropdownMenu'],['btnHeaderOptions','actionPopupMenu']]) {
      const items=()=>[...$(menu).querySelectorAll('[role="menuitem"],[role="menuitemradio"]')].filter(el=>el.getClientRects().length);
      bind(id,() => {const open=!$(menu).classList.contains('open');closePopups();$(menu).classList.toggle('open',open);$(menu).inert=!open;$(menu).setAttribute('aria-hidden',String(!open));$(id).setAttribute('aria-expanded',String(open));if(open){$(menu).scrollTop=0;items()[0]?.focus({preventScroll:true});}});
      $(id).addEventListener('keydown',event=>{if(!['ArrowDown','ArrowUp'].includes(event.key))return;event.preventDefault();if(!$(menu).classList.contains('open'))$(id).click();const choices=items();(event.key==='ArrowUp'?choices.at(-1):choices[0])?.focus();});
      $(menu).addEventListener('keydown',event=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();const choices=items(),index=choices.indexOf(document.activeElement);const next=event.key==='Home'?0:event.key==='End'?choices.length-1:(index+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length;choices[next]?.focus();});
    }
    document.addEventListener('focusin',event=>{const opened=document.querySelector('.action-popup-menu.open,.mode-dropdown-menu.open');if(opened&&!opened.contains(event.target)&&!event.target.closest('#btnModeTrigger,#btnHeaderOptions'))closePopups();});
    document.addEventListener('click',event => {if (!event.target.closest('#btnModeTrigger,#btnHeaderOptions,.action-popup-menu,.mode-dropdown-menu')) closePopups();});
    window.addEventListener('popstate',event => {
      dismissing = false;
      const navigation = event.state?.aiodmaCustomer;
      if (!navigation) { closeSheets({record:false}); return; }
      if (navigation.screen !== currentScreen) showScreen(navigation.screen,{record:false});
      else closeSheets({record:false});
      if (['cartBackdrop','paymentBackdrop','modifierModalBackdrop','orderTrackerBackdrop','tableInfoBackdrop'].includes(navigation.sheet) && (navigation.sheet !== 'modifierModalBackdrop' || state.selected) && (navigation.sheet !== 'orderTrackerBackdrop' || state.order)) {
        if (navigation.sheet==='paymentBackdrop' && !state.cart.lines.length) {recordNavigation('cartBackdrop',true);sheet('cartBackdrop',{record:false});}
        else sheet(navigation.sheet,{record:false});
      }
      else if (navigation.sheet === 'customerMemoryBackdropModal') run(()=>openMemory({record:false}));
      syncControls();
    });
    $('actionPopupMenu').addEventListener('click',event=>{if(event.target.closest('.action-item-row'))closePopups(true);});
    for (const id of ['btnFloatingCart','btnCatalogCartPill']) bind(id,() => {renderCart();sheet('cartBackdrop');});
    bind('btnModMinus',() => {state.qty=Math.max(1,state.qty-1);syncControls();}); bind('btnModPlus',() => {state.qty=Math.min(modifierLimit(),state.qty+1);syncControls();});
    bind('btnAddCustomizedToCart',() => {if ($('btnAddCustomizedToCart').disabled || !validModifiers()) return; const view=viewRevision, line={menuId:state.selected.id,qty:state.qty,optionIds:[...state.options]}; run(async () => {await changeCart(lines => {const existing=lines.find(l => lineKey(l)===lineKey(line));if(existing)existing.qty+=line.qty;else lines.push(line);return lines;});if(view===viewRevision)dismissSheets();});});
    bind('btnProceedToPayment',() => run(reviewQuote));
    bind('btnProcessPayment',() => {if ($('btnProcessPayment').disabled) return;run(async () => {if (!state.quote) throw new Error(t('expired')); const order=await transact('/orders','POST',{quoteId:state.quote.id,confirmed:true,paymentMethod:state.payment},'order');await accepted(order);});});
    const methods=all('.payment-method-card'); methods.forEach((el,index) => {if(index===1||index===2){el.remove();return;} const method=index===0?'MANUAL_TRANSFER':'CASH';el.dataset.pm=method;el.addEventListener('click',() => {if(el.hidden || el.getAttribute('aria-disabled') === 'true')return;state.payment=method;syncPaymentMethods();});
      el.addEventListener('keydown',event => {if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;event.preventDefault();const choices=all('.payment-method-card[data-pm]').filter(card=>!card.hidden),i=choices.indexOf(el);const next=event.key==='Home'?0:event.key==='End'?choices.length-1:(i+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+choices.length)%choices.length;choices[next]?.click();choices[next]?.focus();});
    });
    for (const id of ['btnTrackLiveOrder','menuItemOpenTracker','btnOpenOrderTrackerFromBanner']) bind(id,() => {const view=viewRevision;run(async () => {await verifySession();await loadOrders();if(state.order){updateOrder(await api(`/orders/${state.order.id}`));if(view===viewRevision)sheet('orderTrackerBackdrop');}});});
    bind('btnSaveReceipt',() => {if(state.order)showScreen('screenThermalReceipt');});bind('btnPrintReceipt',() => window.print());bind('btnCloseTrackerSheet',dismissSheets);bind('btnTrackerOrderMore',() => {closeSheets();showScreen('screenMenuCatalog');});
    for (const id of ['menuItemCallWaiter','btnTrackerCallWaiter']) bind(id,() => run(async () => {await transact('/waiter-calls','POST',{reason:t('help')},'waiter');notice(t('waiter'),false,'success');}));
    bind('menuItemTableStatus',() => {const box=$('tableInfoTitle').parentElement.nextElementSibling;box.replaceChildren(node('p','',state.session?`${state.merchant.name} - Table ${state.tableId}`:t('session')));sheet('tableInfoBackdrop');});bind('btnCloseTableInfo',dismissSheets);
    $('modSpecialNote').disabled=true;$('modSpecialNote').placeholder=t('unavailable');
    $('btnChatNotes').setAttribute('aria-disabled','true');bind('btnChatNotes',()=>notice(t('unavailable')));
    bind('menuItemCustomerMemory',()=>run(openMemory));bind('btnCloseMemoryModal',dismissSheets);
    $('customerMemoryBackdropModal').inert=true;
    $('customerMemoryBackdropModal').addEventListener('click',event=>{if(event.target===$('customerMemoryBackdropModal'))dismissSheets();});
    bind('btnChatSend',() => {if($('btnChatSend').disabled)return;const message=$('chatInputText').value.trim();$('chatInputText').value='';run(() => chat(message));});$('chatInputText').addEventListener('input',syncControls);$('chatInputText').addEventListener('keydown',event => {if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&!$('btnChatSend').disabled){event.preventDefault();$('btnChatSend').click();}});
    all('.quick-prompt-pill').filter(el=>el.id!=='qpLihatSemuaMenu').forEach(el=>el.addEventListener('click',()=>run(()=>chat(el.dataset.prompt || el.textContent.trim()))));
    $('catalogSearchInput').addEventListener('input',renderMenu);bind('btnClearSearch',()=>{$('catalogSearchInput').value='';renderMenu();});
    window.addEventListener('offline',()=>{trackingConnection(false);invalidate();notice(t('offline'),false,'error');syncControls();});window.addEventListener('online',()=>{trackingConnection(false);run(async()=>{if(!state.session)await initialize();else await recover();});});
    window.addEventListener('pagehide',()=>{state.epoch++;controllers.forEach(c=>c.abort());state.events?.close();});window.addEventListener('pageshow',event=>{if(event.persisted)run(initialize);});
    language(storage.get('aiodma:v18:language')||'id');showScreen('screenSelectLanguage',{replace:true});run(initialize);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
