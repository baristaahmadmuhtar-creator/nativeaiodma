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
  let queue = Promise.resolve(), quoteTimer, focusReturn;
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
  const status = node('div', 'v18-status'); status.id = 'customerV18Status'; status.setAttribute('role','status'); status.hidden = true;
  const statusText = node('span'); const retry = button('', 'tracker-btn-outline', () => run(async () => state.session ? recover() : initialize()));
  status.append(statusText, retry);
  function placeStatus() { (document.querySelector('#customerMemoryBackdropModal[aria-hidden="false"] .mobile-qr-card-modal,.bottom-sheet-backdrop.open .bottom-sheet-card') || $('phoneViewport')).prepend(status); }
  function notice(message, canRetry = false) { placeStatus(); status.hidden = !message; statusText.textContent = message || ''; retry.hidden = !canRetry; retry.textContent = t('retry'); set('accessibilityLiveRegion',message || ''); }
  function report(error) { if (error.name !== 'AbortError') notice(`${error.message || t('failed')}${error.requestId ? ` (${error.requestId})` : ''}`, !!state.pending || !state.session || !navigator.onLine); }
  function invalidate() { state.quote = null; clearTimeout(quoteTimer); syncControls(); }
  async function api(path, { method = 'GET', body, key } = {}) {
    const controller = new AbortController(), epoch = state.epoch; controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`/api/v1${path}`, { method, credentials:'same-origin', cache:'no-store', signal:controller.signal,
        headers: { ...(body ? {'Content-Type':'application/json'} : {}), ...(method !== 'GET' && state.session ? {'X-CSRF-Token':state.session.csrfToken} : {}), ...(key ? {'Idempotency-Key':key} : {}) },
        ...(body ? {body:JSON.stringify(body)} : {}) });
      const envelope = await response.json();
      if (epoch !== state.epoch) throw new DOMException('Stale response','AbortError');
      if (!response.ok || envelope.success !== true) {
        const error = Object.assign(new Error(envelope.error?.message || t('failed')), {status:response.status,code:envelope.error?.code,requestId:envelope.requestId});
        if (response.status === 401) { state.session = null; state.events?.close(); invalidate(); }
        throw error;
      }
      return envelope.data;
    } catch (error) {
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
    if (value) storage.put(`${state.namespace}:pending`, value); else storage.remove(`${state.namespace}:pending`);
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
    if (!state.pending) state.pending = storage.get(`${state.namespace}:pending`);
    const p = state.pending;
    if (p) {
      if (p.kind === 'order') {
        const found = await api(`/submissions/${encodeURIComponent(p.key)}`);
        if (found.found) { savePending(null); await accepted(found.order); return; }
      }
      const result = await sendPending();
      if (p.kind === 'order') await accepted(result);
      if (p.kind === 'waiter') notice(t('waiter'));
    }
    state.cart = await api('/cart'); invalidate(); renderCart();
    await loadOrders(); if (!p || p.kind !== 'waiter') notice('');
  }
  function showScreen(id) {
    all('.screen').forEach(el => { const active = el.id === id; el.classList.toggle('active',active); el.setAttribute('aria-hidden',String(!active)); el.inert = !active; });
    const language = id === 'screenSelectLanguage'; $('mainHeaderBar').classList.toggle('hidden',language); $('mainHeaderBar').style.display = language ? 'none' : '';
    all('.mode-dropdown-menu,.action-popup-menu').forEach(el => el.classList.remove('open'));
  }
  function closeSheets() {
    all('.action-popup-menu,.mode-dropdown-menu').forEach(el=>el.classList.remove('open'));
    $('btnHeaderOptions').setAttribute('aria-expanded','false');$('btnModeTrigger').setAttribute('aria-expanded','false');
    all('.bottom-sheet-backdrop.open').forEach(el => { el.classList.remove('open'); el.setAttribute('aria-hidden','true'); el.inert = true; });
    const memory=$('customerMemoryBackdropModal');memory.style.display='none';memory.setAttribute('aria-hidden','true');memory.inert=true;$('phoneViewport').inert=false;
    placeStatus();
    focusReturn?.focus();
  }
  function sheet(id) { closeSheets(); focusReturn = document.activeElement; const el = $(id); el.inert = false; el.classList.add('open'); el.setAttribute('aria-hidden','false'); placeStatus(); (el.querySelector('button:not(:disabled):not([hidden]),input:not(:disabled)') || el).focus(); }
  function imageFor(item, cls) { const img = node('img',cls); img.alt = item.name || ''; img.loading = 'lazy';
    if (/^(assets\/|https:\/\/)/.test(item.image || '')) img.src = item.image;
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
    const tabs = document.querySelector('.category-filter-scroll'); tabs.replaceChildren();
    for (const category of ['all',...new Set(state.items.map(item => item.category).filter(Boolean))]) {
      const tab = button(category === 'all' ? t('all') : category,`cat-pill-btn${state.category === category ? ' active' : ''}`,() => {state.category = category; renderMenu();});
      tab.dataset.cat = category; tab.setAttribute('role','tab'); tab.setAttribute('aria-selected',String(state.category === category)); tabs.append(tab);
    }
    const term = $('catalogSearchInput').value.trim().toLocaleLowerCase();
    const items = state.items.filter(item => (state.category === 'all' || item.category === state.category) && `${item.name} ${item.desc || ''}`.toLocaleLowerCase().includes(term));
    $('menuGridContainer').replaceChildren(...items.map(product)); if (!items.length) $('menuGridContainer').append(node('p','',t('empty')));
    $('btnClearSearch').style.display = term ? '' : 'none';
  }
  async function loadMenu() { const data = await api(`/menu?merchant=${encodeURIComponent(state.merchantId)}`); state.merchant = data.merchant; state.items = data.items; renderMenu(); }
  function openModifier(item) {
    state.selected = item; state.qty = 1; state.options = new Set(); set('modProductTitle',item.name); set('modProductDesc',item.desc || ''); set('modProductBasePrice',money(Number(item.price)*100));
    const img = imageFor(item,'mod-product-thumb'); img.id = 'modProductImg'; $('modProductImg').replaceWith(img);
    $('modDynamicGroups').replaceChildren();
    for (const group of item.modifierGroups || []) {
      const field = node('fieldset','modifier-group'), legend = node('legend','mod-group-title',`${group.name || group.id} (${group.min}-${group.max})`); field.append(legend);
      for (const option of group.options) {
        const label = node('label','v18-option'); const input = node('input'); input.type = 'checkbox'; input.value = option.id; input.dataset.group = group.id; input.disabled = option.available === false || group.max === 0;
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
  function validModifiers() { return !!state.selected && (state.selected.modifierGroups || []).every(group => { const count = group.options.filter(o => state.options.has(o.id)).length; return count >= group.min && count <= group.max; }); }
  function lineKey(line) { return JSON.stringify([line.menuId,[...(line.optionIds || [])].sort()]); }
  async function changeCart(transform) {
    invalidate(); const lines = transform(state.cart.lines.map(line => ({menuId:line.menuId,qty:line.qty,optionIds:[...line.optionIds]})));
    state.cart = await transact('/cart','PUT',{expectedVersion:state.cart.version,lines},'cart'); renderCart(); notice(t('saved'));
  }
  function renderCart() {
    const list = $('cartSheetItemsList'); list.replaceChildren(); let count = 0;
    for (const line of state.cart.lines) {
      count += line.qty; const item = state.items.find(i => i.id === line.menuId), row = node('div','cart-item-row'), info = node('div','cart-item-info');
      if (item) row.append(imageFor(item,'cart-item-thumb'));
      const names = (item?.modifierGroups || []).flatMap(g => g.options).filter(o => line.optionIds.includes(o.id)).map(o => o.name);
      info.append(node('div','cart-item-title',item?.name || line.menuId),node('div','cart-item-sub',names.join(', '))); row.append(info);
      const stepper = node('div','cart-stepper-control');
      for (const delta of [-1,1]) {
        const control = button(delta < 0 ? '-' : '+','stepper-btn',() => run(() => changeCart(lines => lines.map(l => lineKey(l) === lineKey(line) ? {...l,qty:l.qty+delta} : l).filter(l => l.qty > 0))));
        control.dataset.cartMutation = 'true'; control.dataset.limit = String(delta > 0 && line.qty >= 99); control.setAttribute('aria-label',`${delta < 0 ? '-' : '+'} ${item?.name || line.menuId}`);
        stepper.append(control); if (delta < 0) stepper.append(node('span','stepper-qty-val',line.qty));
      }
      row.append(stepper); list.append(row);
    }
    if (!count) list.append(node('p','',t('empty')));
    set('chatCartBadge',count); set('catalogCartBadge',count); set('catalogCartTotal',t('review'));
    // Cart has no priced snapshot. Only a server quote may populate financial totals.
    for (const id of ['cartSheetSubtotal','cartSheetTax','cartSheetTotal']) set(id,'-');
    syncControls();
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
    await verifySession(); if (state.pending) throw new Error(t('pending'));
    state.cart = await api('/cart'); renderCart();
    state.quote = await api('/quotes',{method:'POST',body:{expectedVersion:state.cart.version}});
    snapshotItems($('paymentItemsPreviewList'),state.quote); totals('paySheet',state.quote); set('paySheetTitle',t('review'));
    document.querySelector('.pm-header-sub').textContent = t('paymentNote'); sheet('paymentBackdrop');
    clearTimeout(quoteTimer); quoteTimer = setTimeout(() => {invalidate(); notice(t('expired'));},Math.max(0,new Date(state.quote.expiresAt).getTime()-Date.now())); syncControls();
  }
  async function accepted(order) {
    updateOrder(order); invalidate(); closeSheets(); showScreen('screenOrderSuccess'); notice('');
    state.cart = await api('/cart'); renderCart();
  }
  function updateOrder(order) {
    if (state.order?.id === order.id && state.order.version > order.version) return;
    state.order = order;
    const label = t(order.status), paid = order.paymentStatus === 'PAID' ? t('paid') : (order.paymentStatus === 'UNPAID' ? t('unpaid') : order.paymentStatus);
    set('successSubtitle',`#${order.orderNumber} - ${label}. ${paid}`); set('receiptBrandName',state.merchant?.name || 'AIODMA'); set('receiptOrderId',`#${order.orderNumber}`);
    set('receiptDateTime',new Date(order.createdAt).toLocaleString({id:'id-ID',en:'en-US',ms:'ms-BN'}[state.language]));
    set('receiptPaymentName',order.paymentMethod === 'CASH' ? t('cash') : t('transfer'));
    document.querySelector('.receipt-success-text').textContent = paid; document.querySelector('.receipt-pm-status-pill').textContent = paid;
    snapshotItems($('receiptItemsContainer'),order); totals('receipt',order);
    set('trackerOrderNumberLabel',`#${order.orderNumber} - ${order.table}`); set('trackerStatusBadge',label); set('trackerPaymentStatusLabel',paid); set('trackerOrderTotalVal',money(order.totalMinor,order.currency)); snapshotItems($('trackerItemsList'),order);
    const progress = {received:1,accepted:1,preparing:2,ready:3,served:4,completed:4}[order.status] || 0;
    ['Received','Preparing','Ready','Completed'].forEach((name,i) => $(`trackerStep${name}`).classList.toggle('active',progress > i));
    const timeline = document.querySelector('.tracker-steps-timeline'); timeline.setAttribute('aria-valuemin','0'); timeline.setAttribute('aria-valuenow',String(progress)); timeline.setAttribute('aria-valuetext',label);
    set('activityBannerTitle',`#${order.orderNumber} - ${order.table}`); set('activityBannerSub',`${label} - ${paid}`); set('activityBannerBadge',label);
    $('liveOrderActivityBanner').style.display = ''; $('menuItemOpenTracker').style.display = '';
  }
  async function loadOrders() { const orders = await api('/orders'); const selected = orders.find(o => o.id === state.order?.id) || orders[0]; if (selected) updateOrder(selected); }
  function connectEvents() {
    state.events?.close(); const epoch = state.epoch; const events = new EventSource('/api/v1/events'); state.events = events;
    events.onmessage = event => {
      if (epoch !== state.epoch) return;
      try { const data = JSON.parse(event.data); if (data.order && (!state.order || state.order.id === data.order.id)) updateOrder(data.order);
        if (data.type === 'MENU_UPDATED') { invalidate(); run(loadMenu); }
      } catch { /* Malformed events must not mutate customer state. */ }
    };
    events.onopen = () => { if (state.session) run(loadOrders); };
    events.onerror = () => { if (!navigator.onLine) notice(t('offline')); };
  }
  function bubble(text, user = false) { const el = node('div',user ? 'chat-bubble-user' : 'chat-bubble-ai'); el.append(node('div',user ? '' : 'chat-bubble-ai-text',text)); $('chatMessageThread').style.display = ''; $('chatMessageThread').append(el); $('chatScrollArea').scrollTop = $('chatScrollArea').scrollHeight; return el; }
  async function chat(message) {
    if (!message || state.chatBusy) return; state.chatBusy = true; syncControls(); bubble(message,true); $('chatInputText').value = '';
    try {
      await verifySession(); const messageId = crypto.randomUUID();
      const response = await api('/ai/chat',{method:'POST',body:{messageId,message,language:state.language}}); const el = bubble(response.text || t('unavailable')); el.dataset.mode = response.mode || '';
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
          }).finally(() => { if(confirm.isConnected)confirm.disabled = !!state.pending; });
        }); panel.append(confirm); el.append(panel);
      }
    } finally {state.chatBusy = false; syncControls();}
  }
  function syncControls() {
    const blocked = !state.session || !navigator.onLine || state.busy > 0 || !!state.pending || state.merchant?.orderingPaused;
    if ($('btnProceedToPayment')) $('btnProceedToPayment').disabled = blocked || !state.cart.lines.length;
    if ($('btnProcessPayment')) $('btnProcessPayment').disabled = blocked || !state.quote || state.quote.cartVersion !== state.cart.version || Date.parse(state.quote.expiresAt) <= Date.now();
    if ($('btnAddCustomizedToCart')) $('btnAddCustomizedToCart').disabled = blocked || !validModifiers();
    all('[data-cart-mutation]').forEach(el => { el.disabled = blocked || el.dataset.limit === 'true'; });
    if ($('btnChatSend')) { $('btnChatSend').disabled = blocked || state.chatBusy || !$('chatInputText').value.trim(); $('btnChatSend').style.display = $('chatInputText').value.trim() ? '' : 'none'; }
    set('modQtyNumber',state.qty); set('modBtnAddText',t('add')); set('btnProceedToPayment',t('review')); set('btnProcessPayment',t('confirm'));
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
    state.language = value.startsWith('en') ? 'en' : value.startsWith('ms') ? 'ms' : 'id'; document.documentElement.lang = state.language;
    try {storage.put('aiodma:v18:language',state.language);} catch { /* Preferences are optional. */ }
    set('headerLangText',state.language.toUpperCase()); set('labelMenuLanguage',state.language.toUpperCase()); $('catalogSearchInput').placeholder = t('search');
    $('chatInputText').placeholder = {id:'Tulis pesanan atau pertanyaan',en:'Order or ask a question',ms:'Tulis pesanan atau soalan'}[state.language];
    all('.payment-method-card[data-pm]').forEach(el=>{el.querySelector('.pm-name').textContent=t(el.dataset.pm==='CASH'?'cash':'transfer');});
    set('labelCustomerMemory',{id:'Preferensi & memori',en:'Preferences & memory',ms:'Pilihan & memori'}[state.language]);
    updateTableLabels();
    renderMenu(); renderCart(); if (state.order) updateOrder(state.order);
  }
  function theme() { const dark = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try {storage.put('aiodma:v18:theme',dark ? 'dark' : 'light');} catch { /* Preferences are optional. */ }
    for (const prefix of ['header','lang']) { $(`${prefix}ThemeIconDark`).style.display = dark ? 'none' : ''; $(`${prefix}ThemeIconLight`).style.display = dark ? '' : 'none'; }
  }
  function bind(id, action) { $(id)?.addEventListener('click',action); }
  async function openMemory() {
    await verifySession();closeSheets();focusReturn=document.activeElement;
    const copy={
      id:{title:'Preferensi & memori',scope:'Tersimpan hanya untuk sesi meja ini, dengan persetujuan Anda.',label:'Preferensi',consent:'Saya setuju menyimpan preferensi ini',save:'Simpan preferensi',remove:'Hapus preferensi dan percakapan',saved:'Preferensi tersimpan',deleted:'Preferensi dan percakapan dihapus',hint:'Satu preferensi per baris'},
      en:{title:'Preferences & memory',scope:'Saved only for this table session, with your consent.',label:'Preferences',consent:'I consent to saving these preferences',save:'Save preferences',remove:'Delete preferences and conversation',saved:'Preferences saved',deleted:'Preferences and conversation deleted',hint:'One preference per line'},
      ms:{title:'Pilihan & memori',scope:'Disimpan untuk sesi meja ini sahaja, dengan persetujuan anda.',label:'Pilihan',consent:'Saya bersetuju menyimpan pilihan ini',save:'Simpan pilihan',remove:'Padam pilihan dan perbualan',saved:'Pilihan disimpan',deleted:'Pilihan dan perbualan dipadam',hint:'Satu pilihan setiap baris'}
    }[state.language];
    const modal=$('customerMemoryBackdropModal');modal.style.display='flex';modal.setAttribute('aria-hidden','false');modal.inert=false;
    $('phoneViewport').inert=true;all('.action-popup-menu').forEach(el=>el.classList.remove('open'));placeStatus();
    set('memoryModalTitle',copy.title);set('memoryModalSubtitle',copy.scope);set('memoryModalSectionLabel',copy.label);
    const content=$('memoryModalContent');content.replaceChildren(node('p','',t('reconnect')));$('btnResetMemoryProfile').hidden=true;
    $('btnCloseMemoryModal').focus();
    const profile=await api('/profile');
    const form=node('form','v18-memory-form'),label=node('label','',copy.label),preferences=node('textarea');
    preferences.id='v18MemoryPreferences';preferences.maxLength=4020;preferences.rows=5;preferences.value=(profile.preferences||[]).join('\n');preferences.placeholder=copy.hint;label.append(preferences);
    const checkLabel=node('label','v18-option'),consent=node('input');consent.type='checkbox';consent.id='v18MemoryConsent';consent.checked=profile.consent===true;checkLabel.append(consent,node('span','',copy.consent));
    const save=button(copy.save,'tracker-btn-outline');save.type='submit';save.disabled=!consent.checked;consent.addEventListener('change',()=>{save.disabled=!consent.checked;});
    form.append(label,checkLabel,save);content.replaceChildren(form);
    form.addEventListener('submit',event=>{event.preventDefault();if(!consent.checked||save.disabled)return;save.disabled=true;run(async()=>{
      await verifySession();const values=preferences.value.split('\n').map(value=>value.trim()).filter(Boolean);
      await api('/profile',{method:'PUT',body:{consent:true,preferences:values}});notice(copy.saved);
    }).finally(()=>{save.disabled=!consent.checked;});});
    const remove=$('btnResetMemoryProfile');remove.hidden=false;remove.textContent=copy.remove;remove.disabled=false;
    remove.onclick=()=>{if(remove.disabled)return;remove.disabled=true;run(async()=>{
      await verifySession();await api('/profile',{method:'DELETE'});preferences.value='';consent.checked=false;save.disabled=true;
      $('chatMessageThread').replaceChildren();notice(copy.deleted);
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
    state.pending = storage.get(`${state.namespace}:pending`);
    updateTableLabels();
    const clean = new URL(location.href); clean.searchParams.delete('token'); history.replaceState(null,'',clean); query.delete('token');
    state.cart = await api('/cart'); renderCart(); await loadOrders(); connectEvents();
    if (state.pending) notice(t('pending'),true); else notice('');
  }
  function boot() {
    $('phoneViewport').prepend(status);
    all('.bottom-sheet-backdrop').forEach(el => {
      el.inert = true; el.addEventListener('click',event => {if (event.target === el) closeSheets();});
      const close = button('×','header-btn-circle v18-sheet-close',closeSheets); close.setAttribute('aria-label','Close'); el.querySelector('.bottom-sheet-card')?.prepend(close);
    });
    document.addEventListener('keydown',event => {
      if (event.key === 'Escape') closeSheets();
      const opened = document.querySelector('.bottom-sheet-backdrop.open,#customerMemoryBackdropModal[aria-hidden="false"]');
      if (event.key === 'Tab' && opened) {const focusable = [...opened.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length); const first=focusable[0],last=focusable.at(-1); if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus();} else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();}}
      if (['Enter',' '].includes(event.key) && event.target.matches('[role="button"],[role="menuitem"],[role="radio"]')) {event.preventDefault();event.target.click();}
    });
    all('[data-lang]').forEach(el => el.addEventListener('click',() => {language(el.dataset.lang);showScreen('screenChatCashier');}));
    for (const id of ['btnHeaderLangToggle','menuItemChangeLanguage']) bind(id,() => showScreen('screenSelectLanguage'));
    for (const id of ['btnHeaderThemeToggle','btnLangThemeToggle','menuItemToggleTheme']) bind(id,theme);
    for (const id of ['btnHeaderBack','btnLangBack','btnBackToChat','btnReceiptBackToHome']) bind(id,() => showScreen('screenChatCashier'));
    bind('optModeChat',() => showScreen('screenChatCashier')); for (const id of ['optModeMenu','qpLihatSemuaMenu']) bind(id,() => showScreen('screenMenuCatalog'));
    for (const [id,menu] of [['btnModeTrigger','modeDropdownMenu'],['btnHeaderOptions','actionPopupMenu']]) bind(id,() => {const open=$(menu).classList.toggle('open');$(id).setAttribute('aria-expanded',String(open));});
    $('actionPopupMenu').addEventListener('click',event=>{if(event.target.closest('.action-item-row')){$('actionPopupMenu').classList.remove('open');$('btnHeaderOptions').setAttribute('aria-expanded','false');}});
    for (const id of ['btnFloatingCart','btnCatalogCartPill']) bind(id,() => {renderCart();sheet('cartBackdrop');});
    bind('btnModMinus',() => {state.qty=Math.max(1,state.qty-1);syncControls();}); bind('btnModPlus',() => {state.qty=Math.min(99,state.qty+1);syncControls();});
    bind('btnAddCustomizedToCart',() => {if (!validModifiers()) return; const line={menuId:state.selected.id,qty:state.qty,optionIds:[...state.options]}; run(async () => {await changeCart(lines => {const existing=lines.find(l => lineKey(l)===lineKey(line));if(existing)existing.qty+=line.qty;else lines.push(line);return lines;});closeSheets();});});
    bind('btnProceedToPayment',() => run(reviewQuote));
    bind('btnProcessPayment',() => {if ($('btnProcessPayment').disabled) return;run(async () => {if (!state.quote) throw new Error(t('expired')); const order=await transact('/orders','POST',{quoteId:state.quote.id,confirmed:true,paymentMethod:state.payment},'order');await accepted(order);});});
    const methods=all('.payment-method-card'); methods.forEach((el,index) => {if(index===1||index===2){el.hidden=true;el.style.display='none';return;} const method=index===0?'MANUAL_TRANSFER':'CASH';el.dataset.pm=method;el.querySelector('.pm-name').textContent=method==='CASH'?t('cash'):t('transfer');el.setAttribute('aria-label',method);el.classList.toggle('selected',method===state.payment);el.setAttribute('aria-checked',String(method===state.payment));el.addEventListener('click',() => {if(state.pending||state.busy)return;state.payment=method;methods.forEach(card => {card.classList.toggle('selected',card===el);card.setAttribute('aria-checked',String(card===el));});});});
    for (const id of ['btnTrackLiveOrder','menuItemOpenTracker','btnOpenOrderTrackerFromBanner']) bind(id,() => run(async () => {await verifySession();await loadOrders();if(state.order){updateOrder(await api(`/orders/${state.order.id}`));sheet('orderTrackerBackdrop');}}));
    bind('btnSaveReceipt',() => {if(state.order)showScreen('screenThermalReceipt');});bind('btnPrintReceipt',() => window.print());bind('btnCloseTrackerSheet',closeSheets);bind('btnTrackerOrderMore',() => {closeSheets();showScreen('screenMenuCatalog');});
    for (const id of ['menuItemCallWaiter','btnTrackerCallWaiter']) bind(id,() => run(async () => {await transact('/waiter-calls','POST',{reason:t('help')},'waiter');notice(t('waiter'));}));
    bind('menuItemTableStatus',() => {const box=$('tableInfoTitle').parentElement.nextElementSibling;box.replaceChildren(node('p','',state.session?`${state.merchant.name} - Table ${state.tableId}`:t('session')));sheet('tableInfoBackdrop');});bind('btnCloseTableInfo',closeSheets);
    $('modSpecialNote').disabled=true;$('modSpecialNote').placeholder=t('unavailable');
    $('btnChatNotes').setAttribute('aria-disabled','true');bind('btnChatNotes',()=>notice(t('unavailable')));
    bind('menuItemCustomerMemory',()=>run(openMemory));bind('btnCloseMemoryModal',closeSheets);
    $('customerMemoryBackdropModal').inert=true;
    $('customerMemoryBackdropModal').addEventListener('click',event=>{if(event.target===$('customerMemoryBackdropModal'))closeSheets();});
    bind('btnChatSend',() => run(() => chat($('chatInputText').value.trim())));$('chatInputText').addEventListener('input',syncControls);$('chatInputText').addEventListener('keydown',event => {if(event.key==='Enter'&&!event.isComposing&&!$('btnChatSend').disabled){event.preventDefault();$('btnChatSend').click();}});
    all('.quick-prompt-pill').filter(el=>el.id!=='qpLihatSemuaMenu').forEach(el=>el.addEventListener('click',()=>run(()=>chat(el.dataset.prompt || el.textContent.trim()))));
    $('catalogSearchInput').addEventListener('input',renderMenu);bind('btnClearSearch',()=>{$('catalogSearchInput').value='';renderMenu();});
    window.addEventListener('offline',()=>{invalidate();notice(t('offline'));syncControls();});window.addEventListener('online',()=>run(async()=>{if(!state.session)await initialize();else await recover();}));
    window.addEventListener('pagehide',()=>{state.epoch++;controllers.forEach(c=>c.abort());state.events?.close();});window.addEventListener('pageshow',event=>{if(event.persisted)run(initialize);});
    document.documentElement.dataset.theme=storage.get('aiodma:v18:theme')||'light';language(storage.get('aiodma:v18:language')||'id');showScreen('screenSelectLanguage');run(initialize);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
