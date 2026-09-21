'use strict';

(() => {
  const $ = selector => document.querySelector(selector);
  const state = { session: null, tenant: null, tab: 'orders', generation: 0, controller: null,
    filters: {}, data: null, dirty: false, suspended: false, editorTenant: null, invitation: null };
  const roles = ['owner', 'manager', 'cashier', 'kitchen', 'waiter'];
  const manage = () => ['owner', 'manager'].includes(state.session?.role);
  const owner = () => state.session?.role === 'owner';
  const canCash = () => ['owner', 'manager', 'cashier'].includes(state.session?.role);
  const tabs = {
    orders: ['Pesanan', 'OPERASI', roles], kds: ['Dapur / KDS', 'OPERASI', roles],
    menu: ['Menu & stok', 'KATALOG', roles], tables: ['Meja & QR', 'OPERASI', roles],
    waiter: ['Panggilan pelayan', 'OPERASI', roles], promos: ['Promo', 'KATALOG', ['owner', 'manager']],
    knowledge: ['Pengetahuan', 'AI & KONTEN', ['owner', 'manager']], ai: ['Status AI', 'AI & KONTEN', ['owner', 'manager']],
    reports: ['Laporan', 'KEUANGAN', ['owner', 'manager', 'cashier']], staff: ['Tim & akses', 'KEAMANAN', ['owner']],
    integrations: ['Integrasi', 'KONFIGURASI', ['owner', 'manager']], settings: ['Pengaturan', 'KONFIGURASI', ['owner', 'manager']],
    audit: ['Audit', 'KEAMANAN', ['owner', 'manager']]
  };
  const labels = { received: 'Baru', accepted: 'Diterima', preparing: 'Disiapkan', ready: 'Siap', served: 'Disajikan',
    completed: 'Selesai', rejected: 'Ditolak', cancelled: 'Dibatalkan', unpaid: 'Belum dibayar', pending: 'Menunggu',
    paid: 'Lunas', partially_refunded: 'Refund sebagian', refunded: 'Dikembalikan', failed: 'Gagal', expired: 'Kedaluwarsa',
    waiting: 'Menunggu', requested: 'Menunggu', acknowledged: 'Ditangani', resolved: 'Selesai', draft: 'Draft', published: 'Terbit', archived: 'Arsip',
    owner: 'Owner', manager: 'Manajer', cashier: 'Kasir', kitchen: 'Dapur', waiter: 'Pelayan', live: 'Live', degraded: 'Degraded', mock: 'Mock' };
  const paths = { orders: '/orders', kds: '/orders', menu: '/admin/menu', tables: '/admin/tables', waiter: '/admin/waiter-calls',
    promos: '/admin/resources/promo', knowledge: '/admin/resources/knowledge', reports: '/admin/stats', staff: '/admin/staff',
    settings: '/admin/settings', audit: '/admin/audit', ai: '/admin/ai-status' };
  const editor = $('#editor');
  let toastTimer;

  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  }
  function button(text, action, className = '') {
    const node = el('button', text, className); node.type = 'button';
    if (action) node.addEventListener('click', action);
    return node;
  }
  function badge(value, customText) {
    const key = String(value || '').toLowerCase();
    const color = ['paid', 'ready', 'completed', 'resolved', 'published', 'active'].includes(key) ? 'green'
      : ['unpaid', 'pending', 'received', 'waiting', 'requested', 'draft', 'degraded'].includes(key) ? 'amber'
        : ['cancelled', 'rejected', 'failed', 'expired', 'inactive'].includes(key) ? 'red' : 'blue';
    return el('span', customText || labels[key] || value || 'Tidak diketahui', `badge ${color}`);
  }
  function formatMoney(minor, currency = state.tenant?.currency) {
    if (!Number.isSafeInteger(Number(minor)) || minor === null || minor === undefined || !['BND', 'IDR'].includes(currency)) return 'Belum tersedia';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(minor) / 100);
  }
  function date(value) {
    const instant = new Date(value);
    if (!value || !Number.isFinite(instant.getTime())) return '-';
    try { return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: state.tenant?.config?.timezone || undefined }).format(instant); }
    catch { return instant.toLocaleString('id-ID'); }
  }
  const payment = order => String(order.paymentStatus || order.payment_status || '').toLowerCase();
  const list = data => Array.isArray(data) ? data : [];
  function notify(message, isError = false) {
    clearTimeout(toastTimer); const node = $('#toast'); node.textContent = message; node.className = `toast${isError ? ' error' : ''}`; node.hidden = false;
    toastTimer = setTimeout(() => { node.hidden = true; }, 5500);
  }
  function errorText(error) {
    if (error.status === 409) return `${error.message} Isian tetap tersimpan. Tutup editor dan muat data terbaru sebelum mengubah versi.`;
    if (error.status === 403) return error.message || 'Akses tidak diizinkan untuk peran Anda.';
    return error.message || 'Permintaan belum dapat dipastikan. Periksa data terbaru sebelum mencoba lagi.';
  }
  function showError(form, error) {
    const node = form.querySelector('.form-error'); if (!node) return notify(errorText(error), true);
    node.replaceChildren(el('p', errorText(error)));
    if (Array.isArray(error.fields)) error.fields.forEach(field => node.append(el('p', `${field.field}: ${field.message}`)));
    node.hidden = false; node.tabIndex = -1; node.focus();
  }
  function offlineState() {
    const offline = !navigator.onLine;
    $('#connection').textContent = offline ? 'Offline' : state.session ? 'Sesi aktif' : 'Belum masuk';
    $('#connection').className = `connection ${offline ? 'offline' : state.session ? 'online' : ''}`;
  }

  // No token in browser storage. A form retains its request key after an uncertain
  // response; changed payloads get a new key. The server remains the authority.
  async function api(path, { method = 'GET', body, signal, requestKey, auth = true } = {}) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    const timer = setTimeout(abort, 20000);
    const headers = { Accept: 'application/json' };
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json'; headers['X-CSRF-Token'] = state.session?.csrfToken || '';
      headers['Idempotency-Key'] = requestKey || crypto.randomUUID();
    }
    try {
      const response = await fetch(`/api/v1${path}`, { method, credentials: 'same-origin', cache: 'no-store', headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: controller.signal });
      let payload;
      try { payload = await response.json(); } catch { throw new Error('Respons layanan tidak valid. Hasil permintaan belum dapat dipastikan.'); }
      if (!response.ok || payload.success !== true) {
        const error = Object.assign(new Error(payload.error?.message || 'Layanan belum tersedia.'),
          { status: response.status, code: payload.error?.code, fields: payload.error?.fieldErrors });
        if (auth && response.status === 401 && !['LOGIN_FAILED', 'MFA_INVALID'].includes(error.code)) showLogin('Sesi berakhir. Masuk kembali untuk melanjutkan.', true);
        if (auth && error.code === 'MFA_REQUIRED') showMfa();
        throw error;
      }
      if (!Object.hasOwn(payload, 'data')) throw new Error('Data layanan tidak tersedia.');
      return payload.data;
    } catch (error) {
      if (error.name === 'AbortError') {
        if (signal?.aborted) throw error;
        throw new Error('Permintaan melewati batas waktu. Hasil belum dapat dipastikan; periksa data terbaru.');
      }
      if (error instanceof TypeError) throw new Error('Koneksi terputus. Hasil permintaan belum dapat dipastikan.');
      throw error;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); offlineState(); }
  }
  async function save(form, path, method, body, options = {}) {
    const fingerprint = JSON.stringify([state.session?.tenantId, path, method, body]);
    if (form.requestFingerprint !== fingerprint) { form.requestFingerprint = fingerprint; form.requestKey = crypto.randomUUID(); }
    return api(path, { method, body, requestKey: form.requestKey, ...options });
  }
  function bindForm(form, handler) {
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (form.busy || !form.reportValidity()) return;
      form.busy = true;
      const submits = [...form.querySelectorAll('[type=submit]')]; submits.forEach(node => { node.disabled = true; });
      const error = form.querySelector('.form-error'); if (error) error.hidden = true;
      try { await handler(new FormData(form), form); }
      catch (failure) { showError(form, failure); }
      finally { form.busy = false; submits.forEach(node => { node.disabled = false; }); }
    });
  }
  function field(form, name, title, value = '', options = {}) {
    const label = el('label', undefined, options.full ? 'full' : undefined); label.append(el('span', title));
    const input = el(options.options ? 'select' : options.type === 'textarea' ? 'textarea' : 'input'); input.name = name;
    if (options.options) options.options.forEach(option => { const node = el('option', Array.isArray(option) ? option[1] : labels[option] || option); node.value = Array.isArray(option) ? option[0] : option; input.append(node); });
    else if (options.type !== 'textarea') input.type = options.type || 'text';
    ['min', 'max', 'step', 'maxLength', 'minLength', 'pattern', 'autocomplete', 'inputMode'].forEach(key => { if (options[key] !== undefined) input[key] = options[key]; });
    input.required = !!options.required; input.readOnly = !!options.readOnly; input.value = value ?? '';
    label.append(input); if (options.help) label.append(el('span', options.help, 'field-help')); form.append(label); return input;
  }
  function check(form, name, title, value = false) {
    const label = el('label', undefined, 'check-label'); const input = el('input'); input.type = 'checkbox'; input.name = name; input.checked = !!value;
    label.append(input, el('span', title)); form.append(label); return input;
  }
  function newForm(parent, submitText = 'Simpan') {
    const form = el('form', undefined, 'form-stack'); const fields = el('div', undefined, 'form-grid');
    const error = el('div', undefined, 'form-error'); error.role = 'alert'; error.hidden = true;
    const actions = el('div', undefined, 'form-actions'); const submit = el('button', submitText, 'primary'); submit.type = 'submit'; actions.append(submit);
    form.append(fields, error, actions); parent.append(form); return { form, fields, actions, submit };
  }
  function openDialog(title) {
    if (editor.open && state.dirty && !confirm('Tutup perubahan yang belum disimpan?')) return null;
    state.dirty = false; state.suspended = false; state.editorTenant = state.session?.tenantId;
    $('#dialog-title').textContent = title; $('#dialog-body').replaceChildren();
    if (!editor.open) editor.showModal(); return $('#dialog-body');
  }
  function closeDialog(force = false) {
    if (!force && state.dirty && !confirm('Tutup perubahan yang belum disimpan?')) return;
    editor.close(); state.dirty = false; state.suspended = false; $('#dialog-body').replaceChildren();
  }
  async function saved(message = 'Perubahan tersimpan.') { closeDialog(true); notify(message); await loadPage(); }
  function details(parent, entries) {
    const dl = el('dl', undefined, 'detail-list'); entries.forEach(([key, value]) => { dl.append(el('dt', key), el('dd', value ?? 'Belum tersedia')); }); parent.append(dl);
  }
  function table(parent, headings, rows) {
    const wrap = el('div', undefined, 'table-wrap'); wrap.tabIndex = 0; wrap.role = 'region'; wrap.setAttribute('aria-label', $('#page-title').textContent);
    const node = el('table'); const head = el('thead'); const headRow = el('tr'); headings.forEach(title => { const th = el('th', title); th.scope = 'col'; headRow.append(th); }); head.append(headRow);
    const body = el('tbody'); rows.forEach(cells => { const row = el('tr'); cells.forEach(value => { const td = el('td'); if (value instanceof Node) td.append(value); else td.textContent = value ?? '-'; row.append(td); }); body.append(row); });
    node.append(head, body); wrap.append(node); parent.append(wrap);
  }
  function empty(parent, title = 'Belum ada data', description = 'Data akan muncul setelah tersedia.') {
    const node = el('div', undefined, 'empty'); node.append(el('h2', title), el('p', description)); parent.append(node);
  }
  function toolbar(parent, choices = {}) {
    const bar = el('div', undefined, 'toolbar'); const current = state.filters[state.tab] ||= {};
    const search = field(bar, 'search', 'Cari', current.search || '', { full: true }); search.parentElement.className = 'search';
    search.type = 'search'; search.placeholder = 'Nama, ID, atau meja';
    const region = el('div');
    const refresh = () => choices.render(region, current);
    search.addEventListener('input', () => { current.search = search.value; region.replaceChildren(); refresh(); });
    if (choices.statuses) {
      const select = field(bar, 'status', 'Status', current.status || '', { options: [['', 'Semua status'], ...choices.statuses.map(status => [status, labels[status] || status])] });
      select.addEventListener('change', () => { current.status = select.value; region.replaceChildren(); refresh(); });
    }
    parent.append(bar, region); refresh(); return bar;
  }
  const matches = (data, filters) => !filters.search || String(data).toLocaleLowerCase().includes(filters.search.toLocaleLowerCase());
  function pageAction(title, action) { $('#page-actions').replaceChildren(button(title, action, 'primary')); }

  function showLogin(message = 'Gunakan akun staf yang terdaftar.', preserve = false) {
    state.generation++; state.controller?.abort();
    if (editor.open) { state.suspended = preserve; editor.close(); }
    state.session = null; $('#startup').hidden = true; $('#app').hidden = true; $('#mfa-gate').hidden = true; $('#auth').hidden = false;
    $('#auth-notice').textContent = message; $('#logout').hidden = true; offlineState();
  }
  async function enterSession(session) {
    if (!roles.includes(session.role) || !session.csrfToken || !session.tenantId) { showLogin('Akun staf diperlukan untuk membuka admin.'); return; }
    const previousTenant = state.editorTenant;
    state.session = session; $('#logout').hidden = false; $('#startup').hidden = true; $('#auth').hidden = true;
    if (session.mfaRequired) { showMfa(); return; }
    $('#mfa-gate').hidden = true; $('#app').hidden = false;
    $('#outlet-name').textContent = session.tenantId; $('#account-role').textContent = labels[session.role] || session.role;
    $('#session-time').textContent = session.expiresAt ? `Sesi hingga ${date(session.expiresAt)}` : '';
    const nav = $('#navigation'); nav.replaceChildren(); Object.entries(tabs).forEach(([key, [name]]) => { const a = el('a', name); a.href = `#${key}`; nav.append(a); });
    state.tenant = null;
    try {
      const data = manage() ? await api('/admin/settings') : await api(`/menu?merchant=${encodeURIComponent(session.tenantId)}`);
      if (state.session !== session) return;
      state.tenant = data.merchant || data; $('#outlet-name').textContent = state.tenant.name || session.tenantId;
    } catch { /* Each restricted view reports its own actionable error. */ }
    if (state.session !== session) return;
    offlineState(); await loadPage();
    if (state.suspended && previousTenant === session.tenantId) { state.suspended = false; editor.showModal(); }
    else if (state.suspended) closeDialog(true);
  }
  function showMfa() {
    if (editor.open) editor.close();
    $('#app').hidden = true; $('#auth').hidden = true; $('#startup').hidden = true; $('#mfa-gate').hidden = false;
    const parent = $('#mfa-content'); parent.replaceChildren();
    const { form, fields } = newForm(parent, 'Buat pendaftaran');
    field(fields, 'password', 'Kata sandi akun', '', { type: 'password', autocomplete: 'current-password', required: true, full: true, maxLength: 256 });
    bindForm(form, async (_, current) => {
      const result = await save(current, '/auth/mfa/enroll', 'POST', { password: current.elements.password.value });
      current.elements.password.value = ''; parent.replaceChildren();
      const secret = field(parent, 'secret', 'Kunci autentikator', result.secret, { readOnly: true }); secret.className = 'secret';
      if (typeof result.otpauthUri === 'string' && result.otpauthUri.startsWith('otpauth://totp/')) { const link = el('a', 'Buka autentikator', 'link-field section-space'); link.href = result.otpauthUri; parent.append(link); }
      const next = newForm(parent, 'Verifikasi & aktifkan');
      field(next.fields, 'otp', 'Kode autentikator', '', { inputMode: 'numeric', autocomplete: 'one-time-code', pattern: '[0-9]{6}', maxLength: 6, required: true, full: true });
      bindForm(next.form, async (_, verify) => {
        const response = await save(verify, '/auth/mfa/verify', 'POST', { otp: verify.elements.otp.value });
        state.session.csrfToken = response.csrfToken; state.session.mfaRequired = false;
        parent.replaceChildren(el('h2', 'MFA aktif'), el('p', 'Kode pemulihan ditampilkan sekali. Simpan di tempat aman.', 'section-note'));
        const grid = el('div', undefined, 'code-grid'); list(response.recoveryCodes).forEach(code => grid.append(el('code', code))); parent.append(grid);
        parent.append(button('Unduh kode pemulihan', () => downloadText('aiodma-recovery-codes.txt', list(response.recoveryCodes).join('\n'))));
        parent.append(button('Kode sudah disimpan', async () => { parent.replaceChildren(); await enterSession(await api('/session')); }, 'primary section-space'));
      });
    });
  }
  function invitationFromHash() {
    const params = new URLSearchParams(location.hash.slice(1));
    if (!params.has('invite')) return null;
    return { id: params.get('invite'), tenantId: params.get('tenant'), token: params.get('token') };
  }
  function showInvitation(invitation) {
    state.invitation = invitation; showLogin(); $('#login-form').hidden = true;
    $('#auth h1').textContent = 'Terima undangan'; $('#auth-notice').textContent = 'Akun baru: gunakan kata sandi minimal 12 karakter. Akun terdaftar: gunakan kata sandi akun dan kode MFA jika aktif.';
    const existing = $('#invitation-form'); existing?.remove(); const section = el('div'); section.id = 'invitation-form'; $('#auth').append(section);
    const { form, fields } = newForm(section, 'Terima undangan');
    field(fields, 'outlet', 'Outlet', invitation.tenantId, { readOnly: true, full: true });
    field(fields, 'password', 'Kata sandi akun', '', { type: 'password', autocomplete: 'current-password', minLength: 12, maxLength: 256, required: true, full: true });
    field(fields, 'otp', 'Kode autentikator (jika aktif)', '', { inputMode: 'numeric', autocomplete: 'one-time-code', pattern: '[0-9]{6}', maxLength: 6, full: true });
    bindForm(form, async (_, current) => {
      const body = { ...invitation, password: current.elements.password.value }; if (current.elements.otp.value) body.otp = current.elements.otp.value;
      const result = await save(current, '/auth/accept-invitation', 'POST', body, { auth: false });
      if (result.accepted !== true) throw new Error('Penerimaan undangan belum dikonfirmasi.');
      current.elements.password.value = ''; state.invitation = null; section.remove(); $('#login-form').hidden = false; $('#auth h1').textContent = 'Masuk ke outlet';
      $('#login-form').elements.merchantId.value = invitation.tenantId; history.replaceState(null, '', `${location.pathname}#orders`);
      showLogin('Undangan diterima. Masuk dengan email undangan dan kata sandi akun.');
    });
  }

  async function loadPage() {
    if (!state.session || state.session.mfaRequired || state.invitation) return;
    const hash = location.hash.slice(1); const aliases = { analytics: 'reports', 'table-qr': 'tables', stock: 'menu', billing: 'ai', security: 'staff', api: 'integrations', help: 'audit' };
    state.tab = tabs[hash] ? hash : aliases[hash] || 'orders';
    const [title, group, permitted] = tabs[state.tab]; const generation = ++state.generation;
    state.controller?.abort(); state.controller = new AbortController();
    $('#page-title').textContent = title; $('#page-group').textContent = group; $('#page-actions').replaceChildren(); $('#page-status').replaceChildren(); $('#updated-at').textContent = '';
    $('#navigation').querySelectorAll('a').forEach(a => { if (a.hash === `#${state.tab}`) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const parent = $('#page-content'); parent.replaceChildren();
    if (!permitted.includes(state.session.role)) { empty(parent, 'Akses terbatas', 'Peran Anda tidak memiliki izin untuk modul ini.'); return; }
    if (state.tab === 'integrations') { renderIntegrations(parent); return; }
    const loading = el('div', undefined, 'loading'); loading.append(el('span', undefined, 'spinner'), el('span', 'Memuat data...')); parent.append(loading); parent.setAttribute('aria-busy', 'true');
    try {
      const data = await api(paths[state.tab], { signal: state.controller.signal });
      if (generation !== state.generation || !state.session) return;
      state.data = data; parent.replaceChildren(); renderers[state.tab](parent, data);
      $('#updated-at').textContent = `Diperbarui ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
    } catch (error) {
      if (generation !== state.generation || error.name === 'AbortError') return;
      parent.replaceChildren(); const notice = el('div', undefined, 'notice error'); notice.role = 'alert';
      notice.append(el('h2', error.status === 403 ? 'Akses tidak diizinkan' : 'Data belum dapat dimuat'), el('p', errorText(error)), button('Coba lagi', loadPage)); parent.append(notice);
    } finally { if (generation === state.generation) parent.removeAttribute('aria-busy'); }
  }

  function orderItems(parent, order) {
    const ul = el('ul'); list(order.items).forEach(item => {
      const li = el('li'); const content = el('div', item.name || item.menuId); const mods = list(item.modifiers).map(option => option.name).filter(Boolean);
      if (mods.length) content.append(el('small', mods.join(', '))); li.append(el('strong', `${item.qty} x`), content); ul.append(li);
    }); parent.append(ul);
  }
  function elapsed(order) {
    const minutes = Math.floor((Date.now() - new Date(order.createdAt || order.created_at).getTime()) / 60000);
    return Number.isFinite(minutes) ? `${Math.max(0, minutes)} menit` : '-';
  }
  function renderOrders(parent, data) {
    const orders = list(data); const strip = el('div', undefined, 'summary-strip');
    [['Aktif', orders.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status)).length], ['Belum dibayar', orders.filter(o => payment(o) === 'unpaid').length], ['Siap disajikan', orders.filter(o => o.status === 'ready').length]].forEach(([title, count]) => { const block = el('div'); block.append(el('span', title), el('strong', count)); strip.append(block); }); parent.append(strip);
    toolbar(parent, { statuses: ['received', 'accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled', 'rejected'], render: (region, filters) => {
      const selected = orders.filter(o => matches(`${o.id} ${o.orderNumber} ${o.tableNum} ${list(o.items).map(i => i.name).join(' ')}`, filters) && (!filters.status || o.status === filters.status));
      if (!selected.length) return empty(region, 'Tidak ada pesanan', 'Belum ada pesanan yang sesuai dengan filter ini.');
      if (state.tab === 'kds') {
        const board = el('div', undefined, 'board');
        const lanes = filters.status ? [[labels[filters.status], [filters.status]]] : [['Antrean', ['received', 'accepted']], ['Disiapkan', ['preparing']], ['Siap / disajikan', ['ready', 'served']]];
        lanes.forEach(([title, statuses]) => {
          const lane = el('section', undefined, 'lane'); const subset = selected.filter(o => statuses.includes(o.status)); const head = el('div', undefined, 'lane-heading'); head.append(el('h2', title), el('span', subset.length, 'muted')); lane.append(head);
          if (!subset.length) lane.append(el('p', 'Antrean kosong', 'muted'));
          subset.forEach(order => { const ticket = el('article', undefined, 'ticket'); const header = el('header'); header.append(el('strong', `#${order.orderNumber || order.id.slice(0, 8)}`), el('span', `Meja ${order.tableNum ?? '-'} / ${elapsed(order)}`, 'muted')); ticket.append(header, badge(payment(order))); orderItems(ticket, order); const footer = el('footer'); footer.append(button('Lihat pesanan', () => orderDialog(order))); ticket.append(footer); lane.append(ticket); }); board.append(lane);
        }); region.append(board);
      } else table(region, ['Pesanan', 'Meja', 'Status', 'Pembayaran', 'Total', 'Dibuat', ''], selected.map(order => {
        const title = el('div'); title.append(el('strong', `#${order.orderNumber || order.id.slice(0, 8)}`), el('span', `${list(order.items).reduce((sum, item) => sum + Number(item.qty || 0), 0)} item`, 'muted'));
        return [title, order.tableNum ?? '-', badge(order.status), badge(payment(order)), formatMoney(order.totalMinor, order.currency), date(order.createdAt), button('Detail', () => orderDialog(order))];
      }));
    } });
    parent.append(el('p', 'Maksimal 200 pesanan terbaru. Waktu antrean dihitung saat data dimuat.', 'section-note'));
  }
  function orderDialog(order) {
    const body = openDialog(`Pesanan #${order.orderNumber || order.id.slice(0, 8)}`); if (!body) return;
    details(body, [['Meja', order.tableNum], ['Status', labels[order.status] || order.status], ['Pembayaran', labels[payment(order)] || payment(order)], ['Dibuat', date(order.createdAt)], ['Versi', order.version]]);
    const items = el('div', undefined, 'ticket section-space'); orderItems(items, order); body.append(items);
    details(body, [['Subtotal', formatMoney(order.subtotalMinor, order.currency)], ['Diskon', formatMoney(order.discountMinor, order.currency)], ['Service', formatMoney(order.serviceMinor, order.currency)], ['Pajak', formatMoney(order.taxMinor, order.currency)], ['Total', formatMoney(order.totalMinor, order.currency)]]);
    const next = { received: ['accepted', 'rejected', 'cancelled'], accepted: ['preparing', 'cancelled'], preparing: ['ready', 'cancelled'], ready: ['served', 'cancelled'], served: ['completed'] }[order.status] || [];
    const allowed = next.filter(status => !['cancelled', 'rejected'].includes(status) || manage()).filter(status => !['preparing', 'completed'].includes(status) || payment(order) === 'paid');
    if (['owner', 'manager', 'kitchen', 'cashier'].includes(state.session.role) && allowed.length) {
      const edit = newForm(body, 'Ubah status'); field(edit.fields, 'status', 'Status berikutnya', allowed[0], { options: allowed }); const reason = field(edit.fields, 'reason', 'Alasan pembatalan / penolakan', '', { maxLength: 300 });
      const syncReason = () => { reason.required = ['cancelled', 'rejected'].includes(edit.form.elements.status.value); reason.minLength = reason.required ? 3 : 0; };
      edit.form.elements.status.addEventListener('change', syncReason); syncReason();
      bindForm(edit.form, async (_, form) => { const payload = { status: form.elements.status.value, expectedVersion: order.version }; if (form.elements.reason.value) payload.reason = form.elements.reason.value; await save(form, `/admin/orders/${encodeURIComponent(order.id)}/status`, 'PATCH', payload); await saved('Status pesanan diperbarui.'); });
    }
    if (canCash() && payment(order) === 'unpaid' && !['cancelled', 'rejected'].includes(order.status)) {
      body.append(el('h3', 'Verifikasi pembayaran manual', 'section-space'));
      const edit = newForm(body, 'Catat pembayaran'); field(edit.fields, 'amount', 'Jumlah diterima', formatMoney(order.totalMinor, order.currency), { readOnly: true }); field(edit.fields, 'reference', 'Referensi / catatan kasir', '', { required: true, minLength: 3, maxLength: 200 });
      bindForm(edit.form, async (_, form) => { if (!confirm(`Konfirmasi dana ${formatMoney(order.totalMinor, order.currency)} sudah diterima?`)) return; await save(form, `/admin/orders/${encodeURIComponent(order.id)}/payment`, 'PATCH', { expectedVersion: order.version, amountMinor: order.totalMinor, reference: form.elements.reference.value }); await saved('Pembayaran tercatat.'); });
    }
    if (owner() && ['paid', 'partially_refunded'].includes(payment(order))) {
      body.append(el('h3', 'Catat pengembalian manual', 'section-space')); const refund = newForm(body, 'Catat refund');
      field(refund.fields, 'amount', 'Jumlah refund', '', { type: 'number', min: .01, step: .01, max: Number(order.totalMinor) / 100, required: true }); field(refund.fields, 'reference', 'Referensi pengembalian', '', { minLength: 3, maxLength: 200, required: true });
      bindForm(refund.form, async (_, form) => { const amountMinor = toMinor(form.elements.amount.value); if (!confirm(`Catat pengembalian manual ${formatMoney(amountMinor, order.currency)} yang telah dilakukan?`)) return; await save(form, `/admin/orders/${encodeURIComponent(order.id)}/refund`, 'POST', { expectedVersion: order.version, amountMinor, reference: form.elements.reference.value }); await saved('Pengembalian manual tercatat.'); });
    }
  }
  function toMinor(value) {
    if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('Jumlah harus memiliki maksimal dua desimal.');
    const [major, fraction = ''] = value.split('.'); const amount = Number(major) * 100 + Number(fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Jumlah pembayaran tidak valid.'); return amount;
  }

  function productImage(item) {
    const wrapper = el('div', undefined, 'product-cell'); let url;
    try { const candidate = new URL(item.image || '', location.origin); if ((item.image?.startsWith('assets/') && candidate.origin === location.origin) || candidate.protocol === 'https:') url = candidate.href; } catch { /* Missing or invalid images are not fabricated. */ }
    if (url) { const image = el('img'); image.src = url; image.alt = item.name || 'Menu'; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'; image.addEventListener('error', () => image.replaceWith(el('span', 'Foto', 'product-placeholder')), { once: true }); wrapper.append(image); }
    else wrapper.append(el('span', 'Foto', 'product-placeholder'));
    const title = el('div'); title.append(el('strong', item.name), el('span', item.id, 'muted')); wrapper.append(title); return wrapper;
  }
  function renderMenu(parent, data) {
    if (manage()) pageAction('+ Tambah menu', () => menuDialog());
    toolbar(parent, { statuses: ['active', 'inactive'], render: (region, filters) => {
      const selected = list(data).filter(item => matches(`${item.name} ${item.id} ${item.category}`, filters) && (!filters.status || item.available === (filters.status === 'active')));
      if (!selected.length) return empty(region, 'Menu belum tersedia', 'Tambahkan menu atau ubah filter pencarian.');
      table(region, ['Menu', 'Kategori', 'Harga', 'Ketersediaan', 'Stok', ''], selected.map(item => [productImage(item), item.category,
        state.tenant?.currency ? `${state.tenant.currency} ${item.price}` : String(item.price), badge(item.available ? 'active' : 'inactive', item.available ? 'Tersedia' : 'Habis'), item.stock ?? 'Tidak dibatasi', button(manage() ? 'Edit' : 'Lihat', () => menuDialog(item))]));
    } });
  }
  function menuDialog(item) {
    const body = openDialog(item ? item.name : 'Menu baru'); if (!body) return;
    const edit = newForm(body); const f = edit.fields;
    field(f, 'id', 'ID menu', item?.id || '', { required: true, readOnly: !!item, pattern: '[a-zA-Z0-9_-]{1,100}', maxLength: 100 });
    field(f, 'name', 'Nama menu', item?.name || '', { required: true, maxLength: 150 });
    field(f, 'price', `Harga (${state.tenant?.currency || 'mata uang outlet'})`, item?.price ?? '', { type: 'number', required: true, min: 0, max: 100000000, step: .01 });
    field(f, 'category', 'Kategori', item?.category || '', { required: true, maxLength: 80 });
    field(f, 'desc', 'Deskripsi', item?.desc || '', { type: 'textarea', full: true, maxLength: 2000 });
    field(f, 'image', 'Foto menu', item?.image || '', { full: true, maxLength: 500, help: 'Path assets/products/... atau URL HTTPS.' });
    check(f, 'available', 'Tersedia untuk dipesan', item?.available ?? true);
    const groups = el('fieldset', undefined, 'editor-section full'); groups.append(el('legend', 'Pilihan & modifier')); const groupList = el('div'); groups.append(groupList); f.append(groups);
    const addGroup = group => {
      if (groupList.children.length >= 10) return notify('Maksimal 10 grup modifier.', true);
      const section = el('section', undefined, 'modifier-group'); const header = el('div', undefined, 'group-fields'); section.append(header);
      field(header, 'groupId', 'ID grup', group?.id || '', { required: true, pattern: '[a-zA-Z0-9_-]{1,100}', maxLength: 100 });
      field(header, 'min', 'Min', group?.min ?? 0, { type: 'number', required: true, min: 0, step: 1 }); field(header, 'max', 'Max', group?.max ?? 1, { type: 'number', required: true, min: 0, step: 1 });
      const remove = button('×', () => { section.remove(); state.dirty = true; }, 'icon-button'); remove.title = 'Hapus grup'; remove.setAttribute('aria-label', 'Hapus grup'); header.append(remove);
      const options = el('div'); options.className = 'modifier-options'; section.append(options);
      const addOption = option => {
        if (options.children.length >= 30) return notify('Maksimal 30 opsi per grup.', true);
        const row = el('div', undefined, 'option-fields');
        field(row, 'optionId', 'ID opsi', option?.id || '', { required: true, pattern: '[a-zA-Z0-9_-]{1,100}', maxLength: 100 }); field(row, 'optionName', 'Nama opsi', option?.name || '', { required: true, maxLength: 150 }); field(row, 'optionPrice', 'Harga tambahan', option?.price ?? 0, { type: 'number', required: true, min: 0, max: 100000000, step: .01 });
        row.dataset.available = String(option?.available !== false); const removeOption = button('×', () => { row.remove(); state.dirty = true; }, 'icon-button'); removeOption.title = 'Hapus opsi'; removeOption.setAttribute('aria-label', 'Hapus opsi'); row.append(removeOption); options.append(row);
      };
      list(group?.options).forEach(addOption); section.append(button('+ Opsi', () => { addOption(); state.dirty = true; }, 'quiet section-space')); groupList.append(section);
    };
    list(item?.modifierGroups).forEach(addGroup); groups.append(button('+ Grup modifier', () => { addGroup(); state.dirty = true; }, 'quiet section-space'));
    if (!manage()) { [...edit.form.elements].forEach(input => { input.disabled = true; }); return; }
    if (item) edit.actions.prepend(button('Arsipkan', async () => {
      if (!confirm(`Arsipkan ${item.name}? Menu tidak dapat dipesan lagi.`)) return;
      try { await save(edit.form, `/admin/menu/${encodeURIComponent(item.id)}`, 'DELETE', { expectedVersion: item.version }); await saved('Menu diarsipkan.'); } catch (error) { showError(edit.form, error); }
    }, 'danger'));
    bindForm(edit.form, async (_, form) => {
      const modifierGroups = [...groupList.children].map(section => ({ id: section.querySelector('[name=groupId]').value,
        min: Number(section.querySelector('[name=min]').value), max: Number(section.querySelector('[name=max]').value),
        options: [...section.querySelector('.modifier-options').children].map(row => ({ id: row.querySelector('[name=optionId]').value, name: row.querySelector('[name=optionName]').value, price: Number(row.querySelector('[name=optionPrice]').value), available: row.dataset.available === 'true' })) }));
      const groupIds = modifierGroups.map(group => group.id); const optionIds = modifierGroups.flatMap(group => group.options.map(option => option.id));
      if (new Set(groupIds).size !== groupIds.length || new Set(optionIds).size !== optionIds.length || modifierGroups.some(group => group.min > group.max || group.max > group.options.length)) throw new Error('ID grup dan opsi harus unik. Min / max harus sesuai jumlah opsi.');
      const value = { id: form.elements.id.value, name: form.elements.name.value, price: Number(form.elements.price.value), category: form.elements.category.value,
        desc: form.elements.desc.value, available: form.elements.available.checked, modifierGroups };
      if (form.elements.image.value) { if (!/^(assets\/|https:\/\/)/.test(form.elements.image.value)) throw new Error('Foto harus memakai assets/ atau HTTPS.'); value.image = form.elements.image.value; }
      await save(form, item ? `/admin/menu/${encodeURIComponent(item.id)}` : '/admin/menu', item ? 'PUT' : 'POST', item ? { item: value, expectedVersion: item.version } : value); await saved('Menu tersimpan.');
    });
  }

  function renderTables(parent, data) {
    if (manage()) pageAction('+ Tambah meja', () => { const body = openDialog('Tambah meja'); if (!body) return; const edit = newForm(body); field(edit.fields, 'id', 'Nomor meja', '', { type: 'number', min: 1, max: 999, step: 1, required: true }); bindForm(edit.form, async (_, form) => { await save(form, '/admin/tables', 'POST', { id: Number(form.elements.id.value) }); await saved('Meja dibuat.'); }); });
    if (!list(data).length) return empty(parent, 'Belum ada meja', 'Meja yang terdaftar akan muncul di sini.');
    table(parent, ['Meja', 'Status', 'Versi QR', ''], data.map(row => {
      const actions = el('div', undefined, 'row-actions'); const qr = button('QR', () => qrDialog(row)); qr.disabled = !row.active; actions.append(qr);
      if (manage()) actions.append(button('Kelola', () => {
        const body = openDialog(`Meja ${row.id}`); if (!body) return; const edit = newForm(body); check(edit.fields, 'active', 'Meja aktif', row.active); check(edit.fields, 'rotate', 'Ganti QR dan cabut sesi meja', false);
        body.prepend(el('p', 'Menonaktifkan meja atau mengganti QR mengakhiri sesi pelanggan yang terkait.', 'notice warning'));
        bindForm(edit.form, async (_, form) => { await save(form, `/admin/tables/${row.id}`, 'PATCH', { active: form.elements.active.checked, rotate: form.elements.rotate.checked }); await saved('Meja diperbarui.'); });
      })); return [`Meja ${row.id}`, badge(row.active ? 'active' : 'inactive', row.active ? 'Aktif' : 'Nonaktif'), row.qr_version, actions];
    }));
  }
  async function qrDialog(row) {
    const body = openDialog(`QR meja ${row.id}`); if (!body) return; body.append(el('p', 'Memuat QR...', 'muted'));
    try {
      const data = await api(`/admin/tables/${row.id}/qr`); if (!editor.open || !body.isConnected) return;
      const url = new URL(data.url); if (url.origin !== location.origin) throw new Error('Alamat QR berbeda dari origin aplikasi. Periksa pengaturan server.');
      if (typeof data.svg !== 'string' || !data.svg.includes('<svg')) throw new Error('QR belum tersedia.');
      body.replaceChildren(); const image = el('img', undefined, 'qr-image'); image.alt = `QR meja ${row.id}`;
      // SVG is an image document, never inserted as executable DOM markup.
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.svg)}`; body.append(image);
      const link = el('a', 'Buka halaman meja', 'link-field'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; body.append(link);
      const actions = el('div', undefined, 'form-actions'); actions.append(button('Cetak QR', () => window.print(), 'primary'), button('Unduh SVG', () => downloadText(`meja-${row.id}.svg`, data.svg, 'image/svg+xml'))); body.append(actions);
    } catch (error) { body.replaceChildren(el('p', errorText(error), 'notice error')); }
  }
  function renderWaiter(parent, data) {
    toolbar(parent, { statuses: ['waiting', 'acknowledged', 'resolved'], render: (region, filters) => {
      const selected = list(data).filter(row => matches(`${row.table_id} ${row.reason} ${row.id}`, filters) && (!filters.status || row.status === filters.status || filters.status === 'waiting' && row.status === 'requested'));
      if (!selected.length) return empty(region, 'Tidak ada panggilan', 'Panggilan pelanggan akan muncul di sini.');
      table(region, ['Meja', 'Permintaan', 'Status', 'Dibuat', ''], selected.map(row => {
        const action = row.status === 'resolved' ? el('span', 'Selesai', 'muted') : button('Tindak lanjut', () => {
          const body = openDialog(`Panggilan meja ${row.table_id}`); if (!body) return; body.append(el('p', row.reason, 'notice')); const edit = newForm(body, 'Perbarui panggilan');
          field(edit.fields, 'status', 'Status', row.status === 'acknowledged' ? 'resolved' : 'acknowledged', { options: row.status === 'acknowledged' ? ['resolved'] : ['acknowledged', 'resolved'] });
          bindForm(edit.form, async (_, form) => { await save(form, `/admin/waiter-calls/${encodeURIComponent(row.id)}`, 'PATCH', { status: form.elements.status.value, expectedVersion: row.version }); await saved('Panggilan diperbarui.'); });
        }); const reason = el('div', row.reason); reason.style.maxWidth = '320px'; reason.style.whiteSpace = 'normal'; return [row.table_id, reason, badge(row.status), date(row.created_at), action];
      }));
    } });
  }

  function renderResources(parent, data) {
    const knowledge = state.tab === 'knowledge'; pageAction(knowledge ? '+ Dokumen' : '+ Promo', () => resourceDialog(undefined, knowledge));
    toolbar(parent, { render: (region, filters) => {
      const selected = list(data).filter(row => matches(`${row.id} ${row.content?.title || ''}`, filters));
      if (!selected.length) return empty(region, knowledge ? 'Belum ada dokumen' : 'Belum ada promo', 'Data tersimpan akan muncul di sini.');
      if (knowledge) table(region, ['Dokumen', 'Status', 'Versi', 'Diperbarui', ''], selected.map(row => [row.content.title, badge(row.content.status), row.version, date(row.updated_at), button('Edit', () => resourceDialog(row, true))]));
      else table(region, ['Kode promo', 'Potongan', 'Status', 'Penukaran', 'Berakhir', ''], selected.map(row => {
        const promo = row.content; const expired = promo.endsAt && new Date(promo.endsAt) <= new Date(); const status = expired ? 'expired' : promo.active ? 'active' : 'inactive';
        return [row.id, promo.type === 'percent' ? `${promo.value}%` : `${state.tenant?.currency || ''} ${promo.value}`, badge(status, expired ? 'Kedaluwarsa' : promo.active ? 'Aktif' : 'Nonaktif'), `${promo.redemptions ?? 0}${promo.limit ? ` / ${promo.limit}` : ''}`, date(promo.endsAt), button('Edit', () => resourceDialog(row, false))];
      }));
    } });
  }
  function localDatetime(value) {
    if (!value) return ''; const instant = new Date(value); if (!Number.isFinite(instant.getTime())) return '';
    return new Date(instant.getTime() - instant.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  function resourceDialog(row, knowledge) {
    const body = openDialog(knowledge ? row ? 'Edit dokumen' : 'Dokumen baru' : row ? 'Edit promo' : 'Promo baru'); if (!body) return;
    const edit = newForm(body); const content = row?.content || {}; const f = edit.fields;
    field(f, 'id', knowledge ? 'ID dokumen' : 'Kode promo', row?.id || '', { required: true, pattern: '[a-zA-Z0-9_-]{1,100}', maxLength: 100, readOnly: !!row });
    if (knowledge) {
      field(f, 'status', 'Status publikasi', content.status || 'draft', { options: ['draft', 'published', 'archived'] });
      field(f, 'title', 'Judul', content.title || '', { full: true, required: true, maxLength: 200 }); field(f, 'text', 'Isi pengetahuan', content.text || '', { type: 'textarea', full: true, required: true, maxLength: 4000 });
    } else {
      field(f, 'type', 'Jenis diskon', content.type || 'percent', { options: [['percent', 'Persentase'], ['fixed', 'Nominal']] });
      field(f, 'value', 'Nilai diskon', content.value ?? 0, { type: 'number', min: 0, max: 100000000, step: .01, required: true }); field(f, 'minSpend', 'Belanja minimum', content.minSpend ?? '', { type: 'number', min: 0, step: .01 });
      field(f, 'maxDiscount', 'Maksimal potongan', content.maxDiscount ?? '', { type: 'number', min: 0, step: .01 }); field(f, 'limit', 'Batas penukaran', content.limit ?? '', { type: 'number', min: 1, step: 1 });
      field(f, 'startsAt', 'Mulai (waktu perangkat)', localDatetime(content.startsAt), { type: 'datetime-local' }); field(f, 'endsAt', 'Berakhir (waktu perangkat)', localDatetime(content.endsAt), { type: 'datetime-local' }); check(f, 'active', 'Promo aktif', content.active ?? false);
    }
    bindForm(edit.form, async (_, form) => {
      let value;
      if (knowledge) value = { title: form.elements.title.value, text: form.elements.text.value, status: form.elements.status.value };
      else {
        value = { type: form.elements.type.value, value: Number(form.elements.value.value), active: form.elements.active.checked };
        if (value.type === 'percent' && value.value > 100) throw new Error('Diskon persentase maksimal 100%.');
        ['minSpend', 'maxDiscount', 'limit'].forEach(name => { if (form.elements[name].value !== '') value[name] = Number(form.elements[name].value); });
        ['startsAt', 'endsAt'].forEach(name => { if (form.elements[name].value) value[name] = new Date(form.elements[name].value).toISOString(); });
        if (value.startsAt && value.endsAt && value.startsAt >= value.endsAt) throw new Error('Waktu berakhir harus setelah waktu mulai.');
      }
      await save(form, `/admin/resources/${knowledge ? 'knowledge' : 'promo'}`, row ? 'PUT' : 'POST', { id: form.elements.id.value, expectedVersion: row?.version || 0, content: value }); await saved(knowledge ? 'Dokumen tersimpan.' : 'Promo tersimpan.');
    });
  }

  function renderReports(parent, data) {
    const strip = el('div', undefined, 'summary-strip'); [['Pembayaran tercatat', data.settledMinor], ['Pengembalian', data.refundedMinor], ['Pendapatan neto', data.netMinor]].forEach(([title, value]) => { const block = el('div'); block.append(el('span', title), el('strong', formatMoney(value))); strip.append(block); }); parent.append(strip);
    parent.append(el('p', `Seluruh settlement tercatat untuk outlet ini. Mata uang: ${state.tenant?.currency || 'belum tersedia'}. Filter periode dan rincian piutang belum tersedia.`, 'section-note'));
    pageAction('Ekspor CSV', () => downloadText('laporan-settlement.csv', `currency,settledMinor,refundedMinor,netMinor\n${csv(state.tenant?.currency || '')},${csv(data.settledMinor)},${csv(data.refundedMinor)},${csv(data.netMinor)}\n`, 'text/csv'));
  }
  function renderAudit(parent, data) {
    toolbar(parent, { render: (region, filters) => {
      const selected = list(data).filter(row => matches(`${row.action} ${row.actor_id} ${row.entity_id}`, filters));
      if (!selected.length) return empty(region, 'Tidak ada aktivitas', 'Belum ada audit yang sesuai dengan pencarian.');
      table(region, ['Waktu', 'Tindakan', 'Aktor', 'Entitas', ''], selected.map(row => [date(row.created_at), row.action, String(row.actor_id || '-').slice(0, 12), row.entity_id, button('Detail', () => {
        const body = openDialog('Detail audit'); if (!body) return; details(body, [['Waktu', date(row.created_at)], ['Tindakan', row.action], ['Aktor', row.actor_id], ['Entitas', row.entity_id]]);
        const payload = row.detail || row.details || {}; const detailRows = Object.entries(payload).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : value]); if (detailRows.length) details(body, detailRows);
      })]));
    } }); parent.append(el('p', 'Maksimal 200 aktivitas terbaru.', 'section-note'));
  }
  function renderSettings(parent, data) {
    state.tenant = data; const config = data.config || {}; const edit = newForm(parent); edit.form.classList.add('settings-form');
    field(edit.fields, 'name', 'Nama outlet', data.name, { required: true, maxLength: 150 }); field(edit.fields, 'currency', 'Mata uang', data.currency, { readOnly: true });
    field(edit.fields, 'timezone', 'Zona waktu IANA', config.timezone || 'Asia/Brunei', { required: true, maxLength: 80 }); field(edit.fields, 'language', 'Bahasa pelanggan', config.language || 'id', { options: [['id', 'Indonesia'], ['en', 'English'], ['ms', 'Melayu']] });
    field(edit.fields, 'taxRate', 'Pajak (%)', config.taxRate ?? 0, { type: 'number', required: true, min: 0, max: 100, step: .01 }); field(edit.fields, 'serviceRate', 'Service (%)', config.serviceRate ?? 0, { type: 'number', required: true, min: 0, max: 100, step: .01 }); check(edit.fields, 'orderingPaused', 'Jeda penerimaan pesanan', config.orderingPaused);
    details(parent, [['Status outlet', data.published ? 'Terbit' : 'Belum terbit'], ['Versi pengaturan', data.version]]);
    if (!owner()) { [...edit.form.elements].forEach(input => { input.disabled = true; }); parent.append(el('p', 'Perubahan pengaturan memerlukan akses owner.', 'section-note')); return; }
    edit.form.addEventListener('input', () => { state.dirty = true; });
    bindForm(edit.form, async (_, form) => {
      const timezone = form.elements.timezone.value; try { new Intl.DateTimeFormat('id-ID', { timeZone: timezone }); } catch { throw new Error('Zona waktu tidak valid.'); }
      const body = { expectedVersion: data.version, name: form.elements.name.value, config: { orderingPaused: form.elements.orderingPaused.checked, timezone, language: form.elements.language.value, taxRate: Number(form.elements.taxRate.value), serviceRate: Number(form.elements.serviceRate.value) } };
      await save(form, '/admin/settings', 'POST', body); state.dirty = false; notify('Pengaturan tersimpan.'); await loadPage();
    });
  }
  function renderStaff(parent, data) {
    pageAction('+ Undang staf', invitationDialog);
    if (!list(data).length) return empty(parent, 'Belum ada staf', 'Undang staf untuk memberikan akses outlet.');
    table(parent, ['Akun', 'Peran', 'MFA', 'Status akun', ''], data.map(row => [row.email, labels[row.role] || row.role, badge(row.mfa_enabled ? 'active' : 'inactive', row.mfa_enabled ? 'Aktif' : 'Belum aktif'), row.disabled ? 'Dinonaktifkan' : 'Aktif', button('Kelola akses', () => {
      const body = openDialog(row.email); if (!body) return; const edit = newForm(body); field(edit.fields, 'role', 'Peran outlet', row.role, { options: roles }); check(edit.fields, 'revoke', 'Cabut sesi aktif', false);
      body.prepend(el('p', 'Perubahan peran mengakhiri sesi akun di outlet ini.', 'notice'));
      bindForm(edit.form, async (_, form) => { await save(form, `/admin/staff/${encodeURIComponent(row.id)}`, 'PATCH', { role: form.elements.role.value, revoke: form.elements.revoke.checked }); await saved('Akses staf diperbarui.'); });
    })]));
  }
  function invitationDialog() {
    const body = openDialog('Undang staf'); if (!body) return; const edit = newForm(body, 'Buat tautan undangan');
    field(edit.fields, 'email', 'Email staf', '', { type: 'email', maxLength: 200, required: true }); field(edit.fields, 'role', 'Peran outlet', 'waiter', { options: roles });
    bindForm(edit.form, async (_, form) => {
      const result = await save(form, '/admin/invitations', 'POST', { email: form.elements.email.value, role: form.elements.role.value });
      state.dirty = false; body.replaceChildren(el('h3', 'Undangan dibuat'), el('p', 'Email belum dikirim. Bagikan tautan ini langsung kepada staf yang diundang.', 'section-note'));
      const url = new URL(result.invitationUrl); if (url.origin !== location.origin) throw new Error('Origin tautan undangan tidak sesuai.');
      field(body, 'invitationUrl', 'Tautan undangan', url.href, { readOnly: true, full: true }); body.append(el('p', `Berlaku ${result.expiresInHours || 24} jam.`, 'section-note'));
      body.append(button('Salin tautan', async () => { try { await navigator.clipboard.writeText(url.href); notify('Tautan disalin.'); } catch { notify('Salin tautan dari kolom undangan.', true); } }));
    });
  }
  function renderAi(parent, data) {
    details(parent, [['Konfigurasi provider', data.configured ? 'Tersedia' : 'Belum tersedia'], ['Model terkonfigurasi', data.model || 'Tidak ada'], ['Verifikasi live', data.liveVerified ? 'Terverifikasi' : 'Belum terverifikasi'], ['Vision', data.visionEnabled ? 'Diaktifkan' : 'Tidak tersedia'], ['Integrasi eksternal', data.externalIntegrationsEnabled ? 'Diaktifkan' : 'Tidak tersedia']]);
    parent.append(el('h2', 'Run terbaru', 'section-space')); if (!list(data.runs).length) return empty(parent, 'Belum ada run AI', 'Pemakaian ditampilkan hanya jika dilaporkan provider.');
    table(parent, ['Waktu', 'Mode', 'Status', 'Usage aktual'], data.runs.map(run => {
      let reported = null;
      if (run.usage?.calls) {
        const calls = run.usage.calls; const complete = calls.length && calls.every(call => Number.isSafeInteger(call.usage?.totalTokenCount));
        if (complete) reported = calls.reduce((sum, call) => sum + call.usage.totalTokenCount, 0);
      } else if (Number.isSafeInteger(run.usage?.totalTokenCount)) reported = run.usage.totalTokenCount;
      return [date(run.createdAt), badge(run.mode), run.status || '-', reported === null ? 'Tidak dilaporkan' : `${reported} token`];
    }));
  }
  function renderIntegrations(parent) {
    [['Payment gateway', 'Belum tersedia. Pembayaran manual tetap melalui kasir.'], ['POS & printer', 'Belum ada koneksi perangkat yang terverifikasi.'], ['Pengiriman email', 'Belum tersedia. Undangan staf memakai tautan manual.'], ['Billing & kredit AI', 'Belum ada layanan billing yang terhubung.']].forEach(([title, detail]) => {
      const row = el('section', undefined, 'capability-row'); const text = el('div'); text.append(el('h3', title), el('p', detail)); row.append(text, badge('inactive', 'Tidak tersedia')); parent.append(row);
    });
  }
  function csv(value) { const text = String(value ?? ''); return `"${(/^[=+@-]/.test(text) ? "'" : '') + text.replaceAll('"', '""')}"`; }
  function downloadText(name, text, type = 'text/plain') {
    const url = URL.createObjectURL(new Blob([text], { type })); const link = el('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const renderers = { orders: renderOrders, kds: renderOrders, menu: renderMenu, tables: renderTables, waiter: renderWaiter,
    promos: renderResources, knowledge: renderResources, reports: renderReports, audit: renderAudit, settings: renderSettings, staff: renderStaff, ai: renderAi };

  const login = $('#login-form');
  login.elements.verification.addEventListener('change', () => {
    const type = login.elements.verification.value; $('#verification-field').hidden = type === 'none'; $('#verification-label').textContent = type === 'otp' ? 'Kode autentikator' : 'Kode pemulihan';
    login.elements.verificationCode.required = type !== 'none'; login.elements.verificationCode.value = ''; login.elements.verificationCode.inputMode = type === 'otp' ? 'numeric' : 'text';
  });
  bindForm(login, async (_, form) => {
    const payload = { email: form.elements.email.value, password: form.elements.password.value, merchantId: form.elements.merchantId.value };
    if (form.elements.verification.value !== 'none') payload[form.elements.verification.value] = form.elements.verificationCode.value;
    const session = await save(form, '/auth/login', 'POST', payload, { auth: false }); form.elements.password.value = ''; form.elements.verificationCode.value = ''; form.requestFingerprint = null; await enterSession(session);
  });
  $('#logout').addEventListener('click', async () => {
    if (state.dirty && !confirm('Keluar dan tutup perubahan yang belum disimpan?')) return;
    try { await api('/auth/logout', { method: 'POST', body: {} }); closeDialog(true); state.tenant = null; state.filters = {}; state.data = null; showLogin('Anda telah keluar.'); }
    catch (error) { notify(errorText(error), true); }
  });
  $('#switch-outlet').addEventListener('click', () => { if (confirm('Keluar dari sesi ini untuk masuk ke outlet lain?')) $('#logout').click(); });
  $('#refresh').addEventListener('click', () => { if (state.dirty && !confirm('Muat ulang dan tutup perubahan yang belum disimpan?')) return; state.dirty = false; loadPage(); });
  $('#close-editor').addEventListener('click', () => closeDialog());
  editor.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
  editor.addEventListener('input', () => { state.dirty = true; });
  window.addEventListener('beforeunload', event => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('hashchange', () => {
    const invitation = invitationFromHash(); if (invitation) return showInvitation(invitation);
    if (state.invitation) return;
    if (state.dirty && !confirm('Pindah halaman dan tutup perubahan yang belum disimpan?')) { history.replaceState(null, '', `#${state.tab}`); return; }
    state.dirty = false; if (editor.open) closeDialog(true); loadPage();
  });
  window.addEventListener('offline', offlineState); window.addEventListener('online', () => { offlineState(); notify('Koneksi tersedia. Muat ulang untuk melihat data terbaru.'); });
  $('#theme-toggle').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; $('#theme-toggle').setAttribute('aria-pressed', String(dark));
    try { localStorage.setItem('aiodma-admin-theme', dark ? 'dark' : 'light'); } catch { /* Storage is optional. */ }
  });
  try { const dark = localStorage.getItem('aiodma-admin-theme') === 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; $('#theme-toggle').setAttribute('aria-pressed', String(dark)); } catch { /* Storage is optional. */ }
  const invitation = invitationFromHash();
  if (invitation) showInvitation(invitation);
  else api('/session', { auth: false }).then(enterSession).catch(error => showLogin(error.status === 401 ? 'Masuk untuk membuka operasional outlet.' : errorText(error)));
})();
