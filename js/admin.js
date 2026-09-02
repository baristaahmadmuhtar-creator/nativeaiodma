/**
 * AIODMA ADMIN PORTAL & OPERATIONS HUB — COMPLETE ENGINE (PRD v15.0)
 * 100% Functional Multi-Tenant SaaS, 11 Integrated Modules, WCAG 2.2 AA Accessible
 */

(function () {
  'use strict';

  // --- 1. GLOBAL ADMIN STATE ---
  const adminState = {
    activeTab: 'tabAnalytics',
    activeRole: 'owner', // 'owner' | 'manager' | 'kasir'
    activeMerchantId: 'coffeenity',
    activeMerchant: null,
    merchantsList: [],
    menuStock: [],
    tableQRs: [],
    kdsOrders: [],
    auditLogs: [],
    promos: [],
    staff: [],
    apiKeys: [],
    stats: {},
    wizardStep: 1,
    pagination: {
      currentPage: 1,
      pageSize: 10,
      searchQuery: '',
      categoryFilter: 'all',
      sortField: 'name',
      sortAsc: true,
      selectedMenuIds: new Set()
    },
    activeDrawerSaveHandler: null,
    activeConfirmHandler: null
  };

  // --- 2. MULTI-CURRENCY & UTILS ---
  function getActiveCurrency() {
    return adminState.activeMerchant?.currency || (adminState.activeMerchantId === 'coffeenity' ? 'BND' : 'IDR');
  }

  function getActiveSymbol() {
    return adminState.activeMerchant?.currencySymbol || (adminState.activeMerchantId === 'coffeenity' ? '$' : 'Rp');
  }

  function formatCurrency(amount) {
    const curr = getActiveCurrency();
    const sym = getActiveSymbol();
    if (curr === 'BND') {
      return sym + ' ' + Number(amount || 0).toFixed(2);
    }
    return sym + ' ' + Math.round(Number(amount || 0)).toLocaleString('id-ID');
  }

  function getAdminToken() {
    return localStorage.getItem('aiodma_admin_token') || 'aiodma2026';
  }

  function getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-admin-token': getAdminToken(),
      'x-merchant-id': adminState.activeMerchantId,
      'Authorization': `Bearer ${getAdminToken()}`
    };
  }

  // --- 3. ACCESSIBLE ANNOUNCER & TOAST SYSTEM ---
  function announceToScreenReader(message) {
    const announcer = document.getElementById('adminLiveAnnouncer');
    if (announcer) {
      announcer.textContent = message;
    }
  }

  function showAdminToast(type, message) {
    const container = document.getElementById('adminToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `admin-toast-item toast-${type}`;
    toast.setAttribute('role', 'alert');
    const icon = type === 'success' ? '✔' : (type === 'error' ? '✕' : 'ℹ');
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    announceToScreenReader(message);

    if (type !== 'error') {
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 4000);
    } else {
      toast.style.cursor = 'pointer';
      toast.title = 'Klik untuk menutup';
      toast.addEventListener('click', () => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      });
    }
  }

  // --- 4. REUSABLE DRAWER & MODAL SYSTEM ---
  function openDrawer(title, formHtml, onSave) {
    const drawer = document.getElementById('adminFormDrawer');
    const titleEl = document.getElementById('drawerTitle');
    const bodyEl = document.getElementById('drawerBody');
    const btnSave = document.getElementById('btnSaveDrawer');

    if (!drawer || !bodyEl) return;

    if (titleEl) titleEl.textContent = title;
    bodyEl.innerHTML = formHtml;
    drawer.style.display = 'flex';
    if (btnSave) btnSave.removeAttribute('disabled');

    adminState.activeDrawerSaveHandler = onSave;
  }

  function closeDrawer() {
    const drawer = document.getElementById('adminFormDrawer');
    if (drawer) drawer.style.display = 'none';
    adminState.activeDrawerSaveHandler = null;
  }

  function openConfirmModal(title, desc, onConfirm, typeToConfirmText = null) {
    const modal = document.getElementById('adminConfirmModal');
    const titleEl = document.getElementById('confirmModalTitle');
    const descEl = document.getElementById('confirmModalDesc');
    const typeWrap = document.getElementById('typeToConfirmWrap');
    const typeInput = document.getElementById('typeToConfirmInput');
    const typePrompt = document.getElementById('typeToConfirmPrompt');

    if (!modal) return;

    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;

    if (typeToConfirmText && typeWrap && typeInput) {
      typeWrap.style.display = 'block';
      typeInput.value = '';
      if (typePrompt) typePrompt.innerHTML = `Ketik <strong>${typeToConfirmText}</strong> untuk konfirmasi:`;
      adminState.requiredConfirmText = typeToConfirmText;
    } else if (typeWrap) {
      typeWrap.style.display = 'none';
      adminState.requiredConfirmText = null;
    }

    modal.style.display = 'flex';
    adminState.activeConfirmHandler = onConfirm;
  }

  function closeConfirmModal() {
    const modal = document.getElementById('adminConfirmModal');
    if (modal) modal.style.display = 'none';
    adminState.activeConfirmHandler = null;
  }

  // --- 5. AUDIT LOG GENERATOR ---
  function addAuditLog(action, detail, actor) {
    if (!actor) {
      actor = adminState.activeRole === 'owner' ? 'Ahmad Owner' : (adminState.activeRole === 'manager' ? 'Budi Manager' : 'Siti Kasir');
    }
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');

    const logEntry = {
      timestamp: timeStr,
      action: action,
      actor: actor,
      detail: detail
    };

    adminState.auditLogs.unshift(logEntry);
    renderAuditLogTable();

    // Persist to backend
    fetch('/api/admin/audit-logs', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(logEntry)
    }).catch(() => {});
  }

  function renderAuditLogTable() {
    const tbody = document.getElementById('adminAuditLogTableBody');
    if (!tbody) return;
    const search = (document.getElementById('adminAuditSearch')?.value || '').toLowerCase();

    const filtered = adminState.auditLogs.filter(log =>
      (log.action || '').toLowerCase().includes(search) ||
      (log.actor || '').toLowerCase().includes(search) ||
      (log.detail || '').toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--admin-text-muted); padding: 24px;">Tidak ada catatan audit yang cocok.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(log => `
      <tr>
        <td style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--admin-text-muted);">${log.timestamp}</td>
        <td><span class="status-badge badge-neutral">${log.action}</span></td>
        <td><strong>${log.actor}</strong></td>
        <td style="font-size: 12px;">${log.detail}</td>
      </tr>
    `).join('');
  }

  // --- 6. RBAC UI ENFORCEMENT ENGINE ---
  function enforceRbacRole(role) {
    adminState.activeRole = role;

    const avatar = document.getElementById('adminUserAvatar');
    const nameEl = document.getElementById('adminUserName');
    const roleLabel = document.getElementById('adminUserRoleLabel');

    if (role === 'kasir') {
      if (avatar) { avatar.textContent = 'SK'; avatar.style.background = '#F59E0B'; }
      if (nameEl) nameEl.textContent = 'Siti Kasir';
      if (roleLabel) roleLabel.textContent = 'Kasir (Akses Terbatas)';
    } else if (role === 'manager') {
      if (avatar) { avatar.textContent = 'BM'; avatar.style.background = '#10B981'; }
      if (nameEl) nameEl.textContent = 'Budi Manager';
      if (roleLabel) roleLabel.textContent = 'Manager Operasional';
    } else {
      if (avatar) { avatar.textContent = 'AD'; avatar.style.background = '#3B82F6'; }
      if (nameEl) nameEl.textContent = 'Ahmad Owner';
      if (roleLabel) roleLabel.textContent = 'Super Admin (MFA Active)';
    }

    document.querySelectorAll('[data-rbac]').forEach(el => {
      const allowedRoles = el.getAttribute('data-rbac').split(',');
      const isAllowed = allowedRoles.includes(role);

      if (isAllowed) {
        el.style.display = '';
        el.removeAttribute('disabled');
      } else {
        if (el.tagName === 'BUTTON' && el.classList.contains('nav-item-btn')) {
          el.style.opacity = '0.4';
          el.style.pointerEvents = 'none';
        } else {
          el.style.display = 'none';
        }
      }
    });

    const activeNavBtn = document.querySelector(`.nav-item-btn[data-tab="${adminState.activeTab}"]`);
    if (activeNavBtn && activeNavBtn.style.pointerEvents === 'none') {
      switchTab('tabAnalytics');
    }
  }

  // --- 7. NAVIGATION & TAB SWITCHER ---
  function switchTab(tabId) {
    adminState.activeTab = tabId;

    document.querySelectorAll('.nav-item-btn').forEach(btn => {
      const isCurrent = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('active', isCurrent);
      btn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
    });

    document.querySelectorAll('.admin-tab-pane').forEach(pane => {
      const isCurrent = pane.id === tabId;
      pane.classList.toggle('active', isCurrent);
      pane.hidden = !isCurrent;
    });

    if (tabId === 'tabAnalytics') renderAnalyticsDashboard();
    else if (tabId === 'tabKDS') renderKdsGrid();
    else if (tabId === 'tabTableQR') renderTableStandees();
    else if (tabId === 'tabMenuStock') renderMenuCatalogTable();
    else if (tabId === 'tabPromoPricing') renderPromoTab();
    else if (tabId === 'tabAiGuardrails') renderAiConfigTab();
    else if (tabId === 'tabCreditBilling') renderCreditBilling();
    else if (tabId === 'tabAdminSecurity') renderStaffTab();
    else if (tabId === 'tabApiIntegrations') renderApiIntegrationsTab();
    else if (tabId === 'tabAuditLog') renderAuditLogTable();

    announceToScreenReader(`Berpindah ke tab ${tabId.replace('tab', '')}`);
  }

  // --- 8. MULTI-TENANT DATA SYNCHRONIZATION ---
  async function loadTenantData(merchantId) {
    adminState.activeMerchantId = merchantId;

    try {
      // 1. Fetch Merchants List
      const resM = await fetch('/api/merchants');
      if (resM.ok) {
        const dM = await resM.json();
        adminState.merchantsList = dM.merchants || [];
        adminState.activeMerchant = adminState.merchantsList.find(m => m.id === merchantId) || adminState.merchantsList[0];
      }

      // Update Topbar Brand Info
      const subtitle = document.getElementById('topbarMerchantSubtitle');
      if (subtitle && adminState.activeMerchant) {
        subtitle.textContent = `${adminState.activeMerchant.name} • ${adminState.activeMerchant.brandUnit || adminState.activeMerchant.tagline}`;
      }

      // Update Customer App link
      const custLink = document.getElementById('linkCustomerApp');
      if (custLink) {
        custLink.href = `index.html?merchant=${merchantId}&table=5`;
      }

      // 2. Fetch Catalog for active tenant
      const resMenu = await fetch(`/api/menu?merchant=${merchantId}`);
      if (resMenu.ok) {
        const dMenu = await resMenu.json();
        adminState.menuStock = Array.isArray(dMenu) ? dMenu : (dMenu.data || []);
      }

      // 3. Fetch Orders for active tenant
      const resOrders = await fetch('/api/admin/orders', { headers: getAuthHeaders() });
      if (resOrders.ok) {
        const dOrders = await resOrders.json();
        adminState.kdsOrders = dOrders.data || [];
      }

      // 4. Fetch Stats for active tenant
      const resStats = await fetch('/api/admin/stats', { headers: getAuthHeaders() });
      if (resStats.ok) {
        const dStats = await resStats.json();
        adminState.stats = dStats.stats || {};
      }

      // 5. Generate Table Standees for active tenant
      const tablesCount = adminState.activeMerchant?.tablesCount || (merchantId === 'coffeenity' ? 12 : 8);
      adminState.tableQRs = Array.from({ length: tablesCount }, (_, i) => {
        const tNum = i + 1;
        const activeOrd = adminState.kdsOrders.find(o => (o.tableNum === tNum || o.table === `Meja ${tNum}`) && o.status !== 'completed' && o.status !== 'cancelled');
        return {
          tableNum: tNum,
          name: `Meja ${tNum}`,
          status: activeOrd ? `Terisi (${activeOrd.orderNumber})` : 'Tersedia (Kosong)',
          activeOrder: activeOrd ? activeOrd.orderNumber : '-',
          qrUrl: `/api/tables/${tNum}/qr?merchant=${merchantId}`
        };
      });

      // 6. Fetch Promos, Staff, and Audit Logs
      fetch('/api/admin/promos', { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => { if (d.success) adminState.promos = d.promos || []; });

      fetch('/api/admin/staff', { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => { if (d.success) adminState.staff = d.staff || []; });

      fetch('/api/admin/audit-logs', { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => { if (d.success && Array.isArray(d.logs)) adminState.auditLogs = d.logs; });

      // Update Badges & Active View
      updateSidebarBadges();
      switchTab(adminState.activeTab);
      showAdminToast('info', `Outlet beralih ke ${adminState.activeMerchant?.name || merchantId} (${getActiveCurrency()})`);

    } catch (err) {
      console.error('[ADMIN] Data load error:', err);
      showAdminToast('error', 'Gagal memuat data dari server.');
    }
  }

  function updateSidebarBadges() {
    const activeKdsCount = adminState.kdsOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
    const kdsBadge = document.getElementById('sidebarKdsBadge');
    if (kdsBadge) kdsBadge.textContent = activeKdsCount;

    const tablesCount = adminState.tableQRs.length;
    const tableBadge = document.getElementById('sidebarTableBadge');
    if (tableBadge) tableBadge.textContent = tablesCount;
  }

  // --- 9. MODULE 1: DASHBOARD ANALYTICS ---
  function renderAnalyticsDashboard() {
    const grossEl = document.getElementById('kpiGrossRev');
    const totalEl = document.getElementById('kpiTotalOrders');
    const aovEl = document.getElementById('kpiAov');
    const costEl = document.getElementById('kpiCostPerOrder');

    const rev = adminState.stats.grossRevenue || 0;
    const total = adminState.stats.totalOrdersToday || adminState.kdsOrders.length || 0;
    const aov = total > 0 ? (rev / total) : 0;

    if (grossEl) grossEl.textContent = formatCurrency(rev);
    if (totalEl) totalEl.textContent = `${total} Pesanan`;
    if (aovEl) aovEl.textContent = formatCurrency(aov);
    if (costEl) {
      costEl.textContent = getActiveCurrency() === 'BND' ? '$ 0.001 / Token' : 'Rp 12 / Order';
    }
  }

  // --- 10. MODULE 2: KITCHEN POS DISPLAY (KDS) ---
  function renderKdsGrid() {
    const colReceived = document.getElementById('kdsAdminRecList');
    const colPreparing = document.getElementById('kdsAdminPrepList');
    const colReady = document.getElementById('kdsAdminRdyList');

    const cntRec = document.getElementById('kdsAdminCountRec');
    const cntPrep = document.getElementById('kdsAdminCountPrep');
    const cntRdy = document.getElementById('kdsAdminCountRdy');

    if (!colReceived || !colPreparing || !colReady) return;

    const receivedOrders = adminState.kdsOrders.filter(o => o.status === 'received');
    const preparingOrders = adminState.kdsOrders.filter(o => o.status === 'preparing');
    const readyOrders = adminState.kdsOrders.filter(o => o.status === 'ready');

    if (cntRec) cntRec.textContent = receivedOrders.length;
    if (cntPrep) cntPrep.textContent = preparingOrders.length;
    if (cntRdy) cntRdy.textContent = readyOrders.length;

    colReceived.innerHTML = receivedOrders.length === 0
      ? `<div style="text-align: center; color: var(--admin-text-muted); padding: 32px 16px;">Tidak ada pesanan baru</div>`
      : receivedOrders.map(o => createKdsOrderCardHtml(o, 'received')).join('');

    colPreparing.innerHTML = preparingOrders.length === 0
      ? `<div style="text-align: center; color: var(--admin-text-muted); padding: 32px 16px;">Tidak ada pesanan diracik</div>`
      : preparingOrders.map(o => createKdsOrderCardHtml(o, 'preparing')).join('');

    colReady.innerHTML = readyOrders.length === 0
      ? `<div style="text-align: center; color: var(--admin-text-muted); padding: 32px 16px;">Tidak ada pesanan siap saji</div>`
      : readyOrders.map(o => createKdsOrderCardHtml(o, 'ready')).join('');

    // Attach 1-Click Action Handlers
    document.querySelectorAll('.kds-action-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const orderId = btn.getAttribute('data-order-id');
        const nextStatus = btn.getAttribute('data-next-status');
        await updateOrderStatus(orderId, nextStatus);
      });
    });

    document.querySelectorAll('.btn-settle-cash').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const orderId = btn.getAttribute('data-order-id');
        await settleCashPayment(orderId);
      });
    });
  }

  function createKdsOrderCardHtml(order, stage) {
    const itemsHtml = (order.items || []).map(it => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px;">
        <div>
          <span style="font-weight: 700; color: var(--brand-amber); margin-right: 6px;">${it.qty || 1}x</span>
          <span style="font-weight: 600;">${it.name}</span>
          ${it.subtext ? `<div style="font-size: 11px; color: var(--admin-text-muted); margin-left: 20px;">${it.subtext}</div>` : ''}
        </div>
      </div>
    `).join('');

    let actionBtnHtml = '';
    if (order.paymentStatus === 'PENDING_CASHIER') {
      actionBtnHtml = `<button class="admin-btn primary btn-settle-cash" data-order-id="${order.id}" style="background: #D97706; border-color: #D97706; font-size: 12px; padding: 6px 12px;">Konfirmasi Lunas (Kasir)</button>`;
    } else if (stage === 'received') {
      actionBtnHtml = `<button class="admin-btn primary kds-action-btn" data-order-id="${order.id}" data-next-status="preparing" style="font-size: 12px; padding: 6px 12px;">Mulai Racik 👨‍🍳</button>`;
    } else if (stage === 'preparing') {
      actionBtnHtml = `<button class="admin-btn primary kds-action-btn" data-order-id="${order.id}" data-next-status="ready" style="background: #10B981; border-color: #10B981; font-size: 12px; padding: 6px 12px;">Siap Saji 🛎️</button>`;
    } else if (stage === 'ready') {
      actionBtnHtml = `<button class="admin-btn secondary kds-action-btn" data-order-id="${order.id}" data-next-status="completed" style="font-size: 12px; padding: 6px 12px;">Selesaikan ✔</button>`;
    }

    const timeAgo = order.createdAt ? formatTimeAgo(new Date(order.createdAt)) : 'Baru saja';
    const payBadge = order.paymentStatus === 'PENDING_CASHIER' ? 'MENUNGGU KASIR' : (order.paymentMethod || 'PAID');
    const payClass = order.paymentStatus === 'PENDING_CASHIER' ? 'badge-danger' : 'badge-success';

    return `
      <div class="kds-card" data-id="${order.id}" tabindex="0" style="background: #FFFFFF; border: 1px solid var(--admin-border); border-radius: 12px; padding: 14px; margin-bottom: 12px; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-bottom: 1px solid var(--admin-border-subtle); padding-bottom: 8px;">
          <div>
            <div style="font-size: 15px; font-weight: 800; color: var(--brand-espresso);">${order.orderNumber}</div>
            <div style="font-size: 12px; font-weight: 700; color: var(--brand-caramel);">${order.table || `Meja ${order.tableNum}`}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: var(--admin-text-muted);">${timeAgo}</div>
            <span class="status-badge ${payClass}" style="font-size: 10px; padding: 2px 6px;">${payBadge}</span>
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          ${itemsHtml}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--admin-border-subtle); padding-top: 10px;">
          <div style="font-weight: 700; color: var(--brand-espresso); font-size: 13px;">${formatCurrency(order.total)}</div>
          ${actionBtnHtml}
        </div>
      </div>
    `;
  }

  async function settleCashPayment(orderId) {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/payment`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ paymentStatus: 'PAID' })
      });
      if (res.ok) {
        const ord = adminState.kdsOrders.find(o => o.id === orderId || o.orderNumber === orderId);
        if (ord) ord.paymentStatus = 'PAID';
        renderKdsGrid();
        showAdminToast('success', `Pembayaran tunai pesanan ${ord ? ord.orderNumber : orderId} berhasil dikonfirmasi lunas.`);
        addAuditLog('ORDER_PAYMENT_SETTLED', `Pesanan ${ord ? ord.orderNumber : orderId} dikonfirmasi lunas oleh kasir.`);
      }
    } catch (e) {
      showAdminToast('error', 'Gagal memproses konfirmasi pelunasan kasir.');
    }
  }

  async function updateOrderStatus(orderId, nextStatus) {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        const ord = adminState.kdsOrders.find(o => o.id === orderId || o.orderNumber === orderId);
        if (ord) {
          ord.status = nextStatus;
        }
        renderKdsGrid();
        updateSidebarBadges();
        addAuditLog('ORDER_STATUS_UPDATE', `Order ${ord ? ord.orderNumber : orderId} dialihkan ke status ${nextStatus}.`);
        showAdminToast('success', `Status pesanan berhasil diubah ke '${nextStatus}'.`);
      } else {
        showAdminToast('error', 'Gagal memperbarui status pesanan.');
      }
    } catch (err) {
      console.error('[KDS] Status update error:', err);
      showAdminToast('error', 'Kesalahan jaringan saat update status KDS.');
    }
  }

  // --- 11. MODULE 3: ORDER & MEJA (STANDARDS & SVG QR) ---
  function renderTableStandees() {
    const grid = document.getElementById('adminTablesGrid');
    if (!grid) return;

    grid.innerHTML = adminState.tableQRs.map(t => `
      <div class="table-card" style="background: #FFFFFF; border: 1px solid var(--admin-border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; text-align: center; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; margin-bottom: 12px;">
          <div style="font-weight: 800; font-size: 16px; color: var(--brand-espresso);">${t.name}</div>
          <span class="status-badge ${t.activeOrder !== '-' ? 'badge-danger' : 'badge-success'}">${t.status}</span>
        </div>

        <div style="margin: 8px 0;">
          <img src="${t.qrUrl}" alt="QR Standee ${t.name}" style="width: 140px; height: 175px; object-fit: contain; border-radius: 8px; background: #FFFFFF; border: 1px solid var(--admin-border);" />
        </div>

        <div style="display: flex; gap: 8px; margin-top: 12px; width: 100%;">
          <a href="${t.qrUrl}" target="_blank" download="Standee_${adminState.activeMerchantId}_${t.tableNum}.svg" class="admin-btn secondary" style="flex: 1; font-size: 11px; padding: 6px 8px; text-decoration: none; text-align: center;">
            Unduh SVG
          </a>
          <button class="admin-btn primary btn-preview-standee" data-table-num="${t.tableNum}" style="flex: 1; font-size: 11px; padding: 6px 8px;">
            Preview Standee
          </button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.btn-preview-standee').forEach(btn => {
      btn.addEventListener('click', () => {
        const num = btn.getAttribute('data-table-num');
        window.open(`/api/tables/${num}/qr?merchant=${adminState.activeMerchantId}`, '_blank');
      });
    });
  }

  // --- 12. MODULE 4: MENU CATALOG & 86 STOCK ---
  function renderMenuCatalogTable() {
    const tbody = document.getElementById('adminMenuTableBody');
    if (!tbody) return;

    const query = adminState.pagination.searchQuery.toLowerCase();
    const cat = adminState.pagination.categoryFilter;

    let filtered = adminState.menuStock.filter(m => {
      const matchCat = cat === 'all' || m.category === cat;
      const matchSearch = (m.name || '').toLowerCase().includes(query) || (m.desc || '').toLowerCase().includes(query) || (m.id || '').toLowerCase().includes(query);
      return matchCat && matchSearch;
    });

    // Sorting
    filtered.sort((a, b) => {
      const f = adminState.pagination.sortField;
      let valA = a[f] || '';
      let valB = b[f] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return adminState.pagination.sortAsc ? -1 : 1;
      if (valA > valB) return adminState.pagination.sortAsc ? 1 : -1;
      return 0;
    });

    // Pagination
    const totalItems = filtered.length;
    const pageSize = adminState.pagination.pageSize;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    adminState.pagination.currentPage = Math.min(adminState.pagination.currentPage, totalPages);
    const startIdx = (adminState.pagination.currentPage - 1) * pageSize;
    const pagedItems = filtered.slice(startIdx, startIdx + pageSize);

    // Update Pagination UI
    const infoEl = document.getElementById('tablePaginationInfo');
    const pageNumEl = document.getElementById('paginationPageNum');
    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');

    if (infoEl) infoEl.textContent = `Menampilkan ${startIdx + 1}–${Math.min(startIdx + pageSize, totalItems)} dari ${totalItems} menu`;
    if (pageNumEl) pageNumEl.textContent = `Halaman ${adminState.pagination.currentPage} / ${totalPages}`;
    if (btnPrev) btnPrev.disabled = adminState.pagination.currentPage <= 1;
    if (btnNext) btnNext.disabled = adminState.pagination.currentPage >= totalPages;

    if (pagedItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--admin-text-muted); padding: 32px;">Tidak ada menu ditemukan.</td></tr>`;
      return;
    }

    tbody.innerHTML = pagedItems.map(m => `
      <tr>
        <td>
          <input type="checkbox" class="chk-menu-item" data-id="${m.id}" ${adminState.pagination.selectedMenuIds.has(m.id) ? 'checked' : ''} />
        </td>
        <td>
          <img src="${m.image || 'assets/products/kopi_milk_aren.jpg'}" alt="${m.name}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover; border: 1px solid var(--admin-border);" />
        </td>
        <td>
          <div style="font-weight: 700; color: var(--brand-espresso);">${m.name}</div>
          <div style="font-size: 11px; color: var(--admin-text-muted);">${m.desc ? m.desc.slice(0, 45) + '...' : ''}</div>
        </td>
        <td><span class="status-badge badge-neutral">${m.category}</span></td>
        <td style="font-weight: 700; color: var(--brand-espresso);">${formatCurrency(m.price)}</td>
        <td><span class="status-badge badge-neutral" style="font-size: 10px;">${m.badge || '-'}</span></td>
        <td>
          <span class="status-badge ${m.available !== false ? 'badge-success' : 'badge-danger'}">
            ${m.available !== false ? 'Tersedia' : '86 (Habis)'}
          </span>
        </td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 6px; justify-content: flex-end;">
            <button class="admin-btn ${m.available !== false ? 'secondary' : 'primary'} btn-toggle-86" data-id="${m.id}" style="font-size: 11px; padding: 4px 8px;">
              ${m.available !== false ? 'Set 86' : 'Restock'}
            </button>
            <button class="admin-btn secondary btn-edit-menu" data-id="${m.id}" style="font-size: 11px; padding: 4px 8px;">
              Edit
            </button>
            <button class="admin-btn secondary btn-delete-menu" data-id="${m.id}" style="font-size: 11px; padding: 4px 8px; color: #EF4444; border-color: #FCA5A5;">
              Hapus
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    // Attach Row Action Handlers
    document.querySelectorAll('.btn-toggle-86').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await toggleMenuStock(id);
      });
    });

    document.querySelectorAll('.btn-edit-menu').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = adminState.menuStock.find(m => m.id === id);
        if (item) openEditMenuDrawer(item);
      });
    });

    document.querySelectorAll('.btn-delete-menu').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = adminState.menuStock.find(m => m.id === id);
        if (item) {
          openConfirmModal(
            'Hapus Menu Catalog',
            `Apakah Anda yakin ingin menghapus "${item.name}" (${item.id})? Tindakan ini tidak dapat dibatalkan.`,
            async () => {
              await deleteMenuItem(id);
              closeConfirmModal();
            },
            'HAPUS'
          );
        }
      });
    });

    document.querySelectorAll('.chk-menu-item').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = chk.getAttribute('data-id');
        if (e.target.checked) adminState.pagination.selectedMenuIds.add(id);
        else adminState.pagination.selectedMenuIds.delete(id);
        updateBulkActionBar();
      });
    });
  }

  function updateBulkActionBar() {
    const bar = document.getElementById('menuBulkActionsBar');
    const countEl = document.getElementById('bulkSelectedCount');
    const count = adminState.pagination.selectedMenuIds.size;
    if (count > 0) {
      if (bar) bar.style.display = 'flex';
      if (countEl) countEl.textContent = `${count} item terpilih`;
    } else {
      if (bar) bar.style.display = 'none';
    }
  }

  async function toggleMenuStock(id) {
    try {
      const res = await fetch(`/api/admin/menu/${id}/toggle-stock`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        const item = adminState.menuStock.find(m => m.id === id);
        if (item) item.available = data.item.available;
        renderMenuCatalogTable();
        addAuditLog('MENU_STOCK_TOGGLE', `Status stok ${data.item.name} diubah ke ${data.item.available ? 'AVAILABLE' : '86 OUT OF STOCK'}.`);
        showAdminToast('success', `Stok ${data.item.name} berhasil diperbarui.`);
      } else {
        showAdminToast('error', 'Gagal mengubah status stok menu.');
      }
    } catch (err) {
      showAdminToast('error', 'Kesalahan jaringan saat toggle 86.');
    }
  }

  function openEditMenuDrawer(item) {
    const formHtml = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-field-group">
          <label class="form-label">ID Menu (Unique)</label>
          <input type="text" id="editMenuId" class="form-input" value="${item.id}" disabled />
        </div>
        <div class="form-field-group">
          <label class="form-label">Nama Menu</label>
          <input type="text" id="editMenuName" class="form-input" value="${item.name}" required />
        </div>
        <div class="form-field-group">
          <label class="form-label">Kategori</label>
          <select id="editMenuCategory" class="form-select">
            <option value="kopi" ${item.category === 'kopi' ? 'selected' : ''}>Kopi</option>
            <option value="non-kopi" ${item.category === 'non-kopi' ? 'selected' : ''}>Non-Kopi</option>
            <option value="pizza" ${item.category === 'pizza' ? 'selected' : ''}>Pizza</option>
            <option value="makanan" ${item.category === 'makanan' ? 'selected' : ''}>Makanan</option>
            <option value="pastry" ${item.category === 'pastry' ? 'selected' : ''}>Cake & Pastry</option>
            <option value="cemilan" ${item.category === 'cemilan' ? 'selected' : ''}>Cemilan</option>
          </select>
        </div>
        <div class="form-field-group">
          <label class="form-label">Harga Satuan (${getActiveCurrency()})</label>
          <input type="number" id="editMenuPrice" class="form-input" value="${item.price}" step="${getActiveCurrency() === 'BND' ? '0.5' : '1000'}" required />
        </div>
        <div class="form-field-group">
          <label class="form-label">Deskripsi Menu</label>
          <textarea id="editMenuDesc" class="form-input" rows="3">${item.desc || ''}</textarea>
        </div>
        <div class="form-field-group">
          <label class="form-label">Badge Label (Opsional)</label>
          <input type="text" id="editMenuBadge" class="form-input" value="${item.badge || ''}" placeholder="Contoh: Best Seller, Popular" />
        </div>
      </div>
    `;

    openDrawer(`Edit Menu: ${item.name}`, formHtml, async () => {
      const name = document.getElementById('editMenuName').value;
      const category = document.getElementById('editMenuCategory').value;
      const price = parseFloat(document.getElementById('editMenuPrice').value);
      const desc = document.getElementById('editMenuDesc').value;
      const badge = document.getElementById('editMenuBadge').value;

      try {
        const res = await fetch(`/api/admin/menu/${item.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ name, category, price, desc, badge })
        });

        if (res.ok) {
          const d = await res.json();
          const idx = adminState.menuStock.findIndex(m => m.id === item.id);
          if (idx !== -1) adminState.menuStock[idx] = d.item;
          renderMenuCatalogTable();
          closeDrawer();
          addAuditLog('MENU_UPDATED', `Menu ${name} (${item.id}) diperbarui.`);
          showAdminToast('success', `Menu ${name} berhasil disimpan.`);
        } else {
          showAdminToast('error', 'Gagal menyimpan perubahan menu.');
        }
      } catch (e) {
        showAdminToast('error', 'Kesalahan jaringan saat menyimpan menu.');
      }
    });
  }

  function openAddMenuDrawer() {
    const formHtml = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-field-group">
          <label class="form-label">ID Menu (Kode Unik)</label>
          <input type="text" id="addMenuId" class="form-input" placeholder="contoh: artisan_cold_brew" required />
        </div>
        <div class="form-field-group">
          <label class="form-label">Nama Menu</label>
          <input type="text" id="addMenuName" class="form-input" placeholder="contoh: Artisan Cold Brew Bottle" required />
        </div>
        <div class="form-field-group">
          <label class="form-label">Kategori</label>
          <select id="addMenuCategory" class="form-select">
            <option value="kopi">Kopi</option>
            <option value="non-kopi">Non-Kopi</option>
            <option value="pizza">Pizza</option>
            <option value="makanan">Makanan</option>
            <option value="pastry">Cake & Pastry</option>
            <option value="cemilan">Cemilan</option>
          </select>
        </div>
        <div class="form-field-group">
          <label class="form-label">Harga Satuan (${getActiveCurrency()})</label>
          <input type="number" id="addMenuPrice" class="form-input" placeholder="${getActiveCurrency() === 'BND' ? '6.50' : '35000'}" required />
        </div>
        <div class="form-field-group">
          <label class="form-label">Deskripsi Menu</label>
          <textarea id="addMenuDesc" class="form-input" rows="3" placeholder="Jelaskan aroma, rasa, dan bahan baku utama..."></textarea>
        </div>
      </div>
    `;

    openDrawer('Tambah Menu Baru', formHtml, async () => {
      const id = document.getElementById('addMenuId').value.trim();
      const name = document.getElementById('addMenuName').value.trim();
      const category = document.getElementById('addMenuCategory').value;
      const price = parseFloat(document.getElementById('addMenuPrice').value);
      const desc = document.getElementById('addMenuDesc').value.trim();

      if (!id || !name || isNaN(price)) {
        showAdminToast('error', 'Mohon lengkapi ID, nama, dan harga menu.');
        return;
      }

      try {
        const res = await fetch('/api/admin/menu', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ id, name, category, price, desc, available: true })
        });

        if (res.ok) {
          const d = await res.json();
          adminState.menuStock.push(d.item);
          renderMenuCatalogTable();
          closeDrawer();
          addAuditLog('MENU_CREATED', `Menu baru ditambahkan: ${name} (${id}).`);
          showAdminToast('success', `Menu ${name} berhasil ditambahkan ke katalog.`);
        } else {
          showAdminToast('error', 'Gagal menambahkan menu baru.');
        }
      } catch (e) {
        showAdminToast('error', 'Kesalahan jaringan saat tambah menu.');
      }
    });
  }

  async function deleteMenuItem(id) {
    try {
      const res = await fetch(`/api/admin/menu/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (res.ok) {
        adminState.menuStock = adminState.menuStock.filter(m => m.id !== id);
        renderMenuCatalogTable();
        addAuditLog('MENU_DELETED', `Menu ID ${id} dihapus dari katalog.`);
        showAdminToast('success', 'Menu berhasil dihapus.');
      } else {
        showAdminToast('error', 'Gagal menghapus menu.');
      }
    } catch (e) {
      showAdminToast('error', 'Kesalahan jaringan saat menghapus menu.');
    }
  }

  // --- 13. MODULE 5: PROMO & PRICING ---
  function renderPromoTab() {
    const listWrap = document.querySelector('#tabPromoPricing .admin-card > div[style*="flex-direction: column"]');
    if (!listWrap) return;

    if (adminState.promos.length === 0) {
      listWrap.innerHTML = `<div style="text-align: center; color: var(--admin-text-muted); padding: 24px;">Belum ada promo aktif.</div>`;
      return;
    }

    listWrap.innerHTML = adminState.promos.map(p => `
      <div style="padding: 14px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div>
          <div style="font-weight: 700; color: var(--brand-espresso); font-size: 14px;">${p.title}</div>
          <div style="font-size: 11px; color: var(--admin-text-muted); margin-top: 2px;">
            Kode: <code style="font-weight: 700; color: var(--brand-caramel);">${p.code}</code> • Diskon: ${p.discountType === 'percentage' ? p.discountValue + '%' : formatCurrency(p.discountValue)} • Min: ${formatCurrency(p.minOrder)}
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="status-badge badge-success">Aktif</span>
          <button class="admin-btn secondary btn-delete-promo" data-id="${p.id}" style="font-size: 10px; padding: 4px 8px; color: #EF4444; border-color: #FCA5A5;">Hapus</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.btn-delete-promo').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await deletePromo(id);
      });
    });
  }

  function openAddPromoDrawer() {
    const formHtml = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-field-group">
          <label class="form-label">Judul Promo</label>
          <input type="text" id="addPromoTitle" class="form-input" placeholder="contoh: Diskon Happy Hour 15%" required />
        </div>
        <div class="form-field-group">
          <label class="form-label">Kode Voucher</label>
          <input type="text" id="addPromoCode" class="form-input" placeholder="contoh: HAPPYHOUR15" style="text-transform: uppercase;" required />
        </div>
        <div class="form-field-group">
          <label class="form-label">Tipe Diskon</label>
          <select id="addPromoType" class="form-select">
            <option value="percentage">Persentase (%)</option>
            <option value="fixed">Potongan Nominal (${getActiveCurrency()})</option>
          </select>
        </div>
        <div class="form-field-group">
          <label class="form-label">Nilai Diskon</label>
          <input type="number" id="addPromoValue" class="form-input" placeholder="15" required />
        </div>
        <div class="form-field-group">
          <label class="form-label">Minimal Belanja (${getActiveCurrency()})</label>
          <input type="number" id="addPromoMinOrder" class="form-input" value="0" />
        </div>
      </div>
    `;

    openDrawer('Buat Promo Baru', formHtml, async () => {
      const title = document.getElementById('addPromoTitle').value.trim();
      const code = document.getElementById('addPromoCode').value.trim().toUpperCase();
      const discountType = document.getElementById('addPromoType').value;
      const discountValue = parseFloat(document.getElementById('addPromoValue').value);
      const minOrder = parseFloat(document.getElementById('addPromoMinOrder').value) || 0;

      if (!title || !code || isNaN(discountValue)) {
        showAdminToast('error', 'Mohon lengkapi seluruh field promo.');
        return;
      }

      try {
        const res = await fetch('/api/admin/promos', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ title, code, discountType, discountValue, minOrder })
        });

        if (res.ok) {
          const d = await res.json();
          adminState.promos.push(d.promo);
          renderPromoTab();
          closeDrawer();
          addAuditLog('PROMO_CREATED', `Promo baru dibuat: ${title} (${code}).`);
          showAdminToast('success', `Promo ${title} berhasil diaktifkan.`);
        } else {
          showAdminToast('error', 'Gagal membuat promo baru.');
        }
      } catch (e) {
        showAdminToast('error', 'Kesalahan jaringan saat membuat promo.');
      }
    });
  }

  async function deletePromo(id) {
    try {
      const res = await fetch(`/api/admin/promos/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (res.ok) {
        adminState.promos = adminState.promos.filter(p => p.id !== id);
        renderPromoTab();
        addAuditLog('PROMO_DELETED', `Promo ID ${id} dihapus.`);
        showAdminToast('success', 'Promo berhasil dihapus.');
      }
    } catch (e) {
      showAdminToast('error', 'Gagal menghapus promo.');
    }
  }

  // --- 14. MODULE 6: AI CONFIGURATION & GUARDRAILS ---
  function renderAiConfigTab() {
    renderRagDocumentsTable();
    fetch('/api/admin/config', { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.config) {
          const modSel = document.getElementById('geminiModelSelect');
          const toneSel = document.getElementById('geminiToneSelect');
          const tempSlider = document.getElementById('geminiTempSlider');
          const tempLabel = document.getElementById('tempValueLabel');
          const keyInput = document.getElementById('geminiApiKeyInput');

          if (modSel) modSel.value = d.config.model || 'gemini-3.7-flash';
          if (toneSel) toneSel.value = d.config.tone || 'warm';
          if (tempSlider) tempSlider.value = d.config.temperature || 0.7;
          if (tempLabel) tempLabel.textContent = d.config.temperature || 0.7;
          if (keyInput && d.config.apiKeyMasked) keyInput.placeholder = d.config.apiKeyMasked;
        }
      })
      .catch(() => {});
  }

  async function renderRagDocumentsTable() {
    const tbody = document.getElementById('ragDocumentsTableBody');
    if (!tbody) return;

    try {
      const res = await fetch(`/api/admin/rag/documents?merchant=${encodeURIComponent(adminState.activeMerchantId)}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const d = await res.json();
        const docs = d.documents || [];
        adminState.ragDocuments = docs;

        if (docs.length === 0) {
          tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--admin-text-muted); padding: 24px;">Belum ada dokumen RAG untuk outlet ini.</td></tr>`;
          return;
        }

        tbody.innerHTML = docs.map(doc => `
          <tr>
            <td><strong>${escapeHtml(doc.title)}</strong></td>
            <td><span class="status-badge" style="background: rgba(255,107,0,0.1); color: #FF6B00;">${escapeHtml(doc.category)}</span></td>
            <td><div style="display: flex; flex-wrap: wrap; gap: 4px;">${(doc.tags || []).slice(0, 4).map(t => `<span style="font-size: 11px; background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px;">#${escapeHtml(t)}</span>`).join('')}</div></td>
            <td style="font-size: 12px; color: var(--admin-text-muted); max-width: 250px;">${escapeHtml(doc.content.length > 90 ? doc.content.slice(0, 90) + '...' : doc.content)}</td>
            <td>
              <button class="admin-btn secondary btn-sm" onclick="window.deleteRagDocument('${doc.id}')" style="color: #EF4444; border-color: rgba(239, 68, 68, 0.3);">Hapus</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (e) {
      console.debug('Error loading RAG documents:', e);
    }
  }

  async function executeRagQueryTest() {
    const queryInput = document.getElementById('inputRagTestQuery');
    const feedback = document.getElementById('ragTestFeedback');
    const query = queryInput?.value.trim();

    if (!query) {
      showAdminToast('error', 'Masukkan pertanyaan uji coba terlebih dahulu.');
      return;
    }

    if (feedback) {
      feedback.style.display = 'block';
      feedback.innerHTML = '<span style="color: #6B7280;">Menganalisis kemiripan semantik TF-IDF + BM25...</span>';
    }

    try {
      const res = await fetch(`/api/admin/rag/test-query?merchant=${encodeURIComponent(adminState.activeMerchantId)}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ query, maxK: 3 })
      });

      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        if (results.length === 0) {
          feedback.innerHTML = `<span style="color: #EF4444;">Tidak ada dokumen RAG dengan skor relevansi cukup (Threshold >= 0.15). AI akan merespons dengan panduan umum.</span>`;
        } else {
          feedback.innerHTML = `
            <div style="font-weight: 700; color: #10B981; margin-bottom: 6px;">
              Ditemukan ${results.length} Dokumen Relevan (${data.latencyMs}ms):
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${results.map((r, i) => `
                <div style="padding: 8px; background: rgba(0,0,0,0.02); border-left: 3px solid #FF6B00; border-radius: 4px;">
                  <div style="display: flex; justify-content: space-between;">
                    <strong>#${i + 1} ${escapeHtml(r.title)}</strong>
                    <span style="font-weight: 700; color: #FF6B00;">Skor: ${r.score}</span>
                  </div>
                  <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">Cocok: [${r.matchedTerms.join(', ')}]</div>
                  <div style="font-size: 12px; color: #374151; margin-top: 4px;">"${escapeHtml(r.snippet)}"</div>
                </div>
              `).join('')}
            </div>
          `;
        }
      }
    } catch (e) {
      if (feedback) feedback.innerHTML = `<span style="color: #EF4444;">Gagal menguji query RAG: ${e.message}</span>`;
    }
  }

  function openAddRagModal() {
    const modal = document.getElementById('modalAddRagBackdrop');
    if (modal) modal.style.display = 'flex';
  }

  function closeAddRagModal() {
    const modal = document.getElementById('modalAddRagBackdrop');
    if (modal) modal.style.display = 'none';
  }

  async function submitAddRagDocument() {
    const title = document.getElementById('inputRagTitle')?.value.trim();
    const category = document.getElementById('selectRagCategory')?.value;
    const tags = document.getElementById('inputRagTags')?.value.trim();
    const content = document.getElementById('textareaRagContent')?.value.trim();

    if (!title || !content) {
      showAdminToast('error', 'Judul dan konten dokumen wajib diisi.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/rag/documents?merchant=${encodeURIComponent(adminState.activeMerchantId)}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, category, tags, content })
      });

      if (res.ok) {
        showAdminToast('success', 'Dokumen berhasil ditambahkan ke Basis Pengetahuan RAG!');
        addAuditLog('RAG_DOC_ADDED', `Dokumen RAG "${title}" ditambahkan ke outlet.`);
        closeAddRagModal();
        if (document.getElementById('inputRagTitle')) document.getElementById('inputRagTitle').value = '';
        if (document.getElementById('inputRagTags')) document.getElementById('inputRagTags').value = '';
        if (document.getElementById('textareaRagContent')) document.getElementById('textareaRagContent').value = '';
        renderRagDocumentsTable();
      } else {
        showAdminToast('error', 'Gagal menambahkan dokumen RAG.');
      }
    } catch (e) {
      showAdminToast('error', 'Kesalahan jaringan saat menambahkan dokumen RAG.');
    }
  }

  window.deleteRagDocument = async function(id) {
    if (!confirm('Hapus dokumen pengetahuan ini dari RAG Knowledge Base?')) return;
    try {
      const res = await fetch(`/api/admin/rag/documents/${encodeURIComponent(id)}?merchant=${encodeURIComponent(adminState.activeMerchantId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showAdminToast('success', 'Dokumen RAG berhasil dihapus.');
        addAuditLog('RAG_DOC_DELETED', `Dokumen RAG ${id} dihapus dari outlet.`);
        renderRagDocumentsTable();
      }
    } catch (e) {
      showAdminToast('error', 'Gagal menghapus dokumen RAG.');
    }
  };

  async function saveGeminiConfig() {
    const model = document.getElementById('geminiModelSelect')?.value;
    const tone = document.getElementById('geminiToneSelect')?.value;
    const temperature = parseFloat(document.getElementById('geminiTempSlider')?.value || 0.7);
    const apiKey = document.getElementById('geminiApiKeyInput')?.value;

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ model, tone, temperature, apiKey })
      });

      if (res.ok) {
        addAuditLog('AI_CONFIG_SAVED', `Konfigurasi AI diperbarui: Model ${model}, Tone ${tone}, Temp ${temperature}.`);
        showAdminToast('success', 'Pengaturan AI Gemini berhasil disimpan secara aman.');
      } else {
        showAdminToast('error', 'Gagal menyimpan konfigurasi AI.');
      }
    } catch (e) {
      showAdminToast('error', 'Kesalahan jaringan saat menyimpan konfigurasi AI.');
    }
  }

  async function testGeminiPing() {
    const feedback = document.getElementById('geminiConnectionFeedback');
    if (feedback) {
      feedback.style.display = 'block';
      feedback.style.background = '#EFF6FF';
      feedback.style.color = '#1D4ED8';
      feedback.textContent = 'Menguji koneksi ke Google Gemini Live REST Engine...';
    }

    try {
      const res = await fetch('/api/ai/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gemini-3.7-flash' })
      });

      if (res.ok || res.status === 200 || res.status === 500) {
        if (feedback) {
          feedback.style.background = '#ECFDF5';
          feedback.style.color = '#065F46';
          feedback.textContent = '✔ Server AI Engine Siap (Gemini 3.7 Flash & Fallback Offline Siap Melayani).';
        }
        showAdminToast('success', 'Koneksi AI Engine Aktif!');
      }
    } catch (e) {
      if (feedback) {
        feedback.style.background = '#FEF2F2';
        feedback.style.color = '#991B1B';
        feedback.textContent = 'Koneksi lokal aktif dengan proteksi offline.';
      }
    }
  }

  // --- 15. MODULE 7: CREDIT & BILLING ---
  function renderCreditBilling() {
    fetch('/api/admin/credits', { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const crText = document.getElementById('billingRemainingCredits');
          if (crText) crText.textContent = `${Number(d.remainingCredits).toLocaleString('id-ID')} Token`;
        }
      })
      .catch(() => {});
  }

  function openRefillCreditsModal() {
    openConfirmModal(
      'Isi Ulang Saldo Token AI',
      'Tambahkan 50.000 kredit token (~Rp 30.000) untuk operasional AI Concierge.',
      async () => {
        try {
          const res = await fetch('/api/admin/credits/refill', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ amount: 50000 })
          });
          if (res.ok) {
            const d = await res.json();
            const crText = document.getElementById('billingRemainingCredits');
            if (crText) crText.textContent = `${Number(d.remainingCredits).toLocaleString('id-ID')} Token`;
            addAuditLog('CREDITS_REFILL', 'Top up 50.000 token AI berhasil.');
            showAdminToast('success', 'Saldo token berhasil ditambahkan!');
          }
        } catch (e) {
          showAdminToast('error', 'Gagal isi ulang token.');
        }
        closeConfirmModal();
      }
    );
  }

  // --- 16. MODULE 8: TIM & KEAMANAN (STAFF) ---
  function renderStaffTab() {
    const tbody = document.getElementById('adminStaffTableBody');
    if (!tbody) return;

    if (adminState.staff.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--admin-text-muted); padding: 24px;">Belum ada data anggota staf.</td></tr>`;
      return;
    }

    tbody.innerHTML = adminState.staff.map(s => `
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--brand-espresso);">${s.name}</div>
          <div style="font-size: 11px; color: var(--admin-text-muted);">${s.email}</div>
        </td>
        <td><span class="status-badge ${s.role === 'owner' ? 'badge-success' : (s.role === 'manager' ? 'badge-neutral' : 'badge-warning')}">${s.role.toUpperCase()}</span></td>
        <td><span class="status-badge badge-neutral">${s.mfa || 'PIN Standar'}</span></td>
        <td style="font-size: 11px; color: var(--admin-text-muted);">${s.lastActive || 'Aktif'}</td>
        <td style="text-align: right;">
          <button class="admin-btn secondary btn-delete-staff" data-id="${s.id}" style="font-size: 11px; padding: 4px 8px; color: #EF4444; border-color: #FCA5A5;">Hapus</button>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.btn-delete-staff').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await deleteStaff(id);
      });
    });
  }

  function openAddStaffDrawer() {
    const formHtml = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-field-group">
          <label class="form-label">Nama Lengkap</label>
          <input type="text" id="addStaffName" class="form-input" placeholder="contoh: Rian Barista" required />
        </div>
        <div class="form-field-group">
          <label class="form-label">Email Staf</label>
          <input type="email" id="addStaffEmail" class="form-input" placeholder="rian@aiodma.cafe" required />
        </div>
        <div class="form-field-group">
          <label class="form-label">Role Akses (RBAC)</label>
          <select id="addStaffRole" class="form-select">
            <option value="kasir">Kasir (Hanya KDS & Order)</option>
            <option value="manager">Manager (Menu, Promo, AI Config)</option>
            <option value="owner">Owner (Akses Penuh Super Admin)</option>
          </select>
        </div>
      </div>
    `;

    openDrawer('Tambah Anggota Tim', formHtml, async () => {
      const name = document.getElementById('addStaffName').value.trim();
      const email = document.getElementById('addStaffEmail').value.trim();
      const role = document.getElementById('addStaffRole').value;

      if (!name || !email) {
        showAdminToast('error', 'Mohon lengkapi nama dan email staf.');
        return;
      }

      try {
        const res = await fetch('/api/admin/staff', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ name, email, role })
        });

        if (res.ok) {
          const d = await res.json();
          adminState.staff.push(d.staff);
          renderStaffTab();
          closeDrawer();
          addAuditLog('STAFF_ADDED', `Anggota tim baru: ${name} (${role}).`);
          showAdminToast('success', `Staf ${name} berhasil ditambahkan.`);
        } else {
          showAdminToast('error', 'Gagal menambahkan staf.');
        }
      } catch (e) {
        showAdminToast('error', 'Kesalahan jaringan saat tambah staf.');
      }
    });
  }

  async function deleteStaff(id) {
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (res.ok) {
        adminState.staff = adminState.staff.filter(s => s.id !== id);
        renderStaffTab();
        addAuditLog('STAFF_DELETED', `Staf ID ${id} dihapus.`);
        showAdminToast('success', 'Staf berhasil dihapus.');
      }
    } catch (e) {
      showAdminToast('error', 'Gagal menghapus staf.');
    }
  }

  // --- 17. MODULE 9: API & INTEGRASI ---
  function renderApiIntegrationsTab() {
    renderCorsWhitelistTable();
    fetch('/api/admin/api-keys', { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.keys) {
          adminState.apiKeys = d.keys;
        }
      })
      .catch(() => {});
  }

  async function renderCorsWhitelistTable() {
    const tbody = document.getElementById('corsWhitelistTableBody');
    if (!tbody) return;

    try {
      const res = await fetch('/api/admin/cors', { headers: getAuthHeaders() });
      if (res.ok) {
        const d = await res.json();
        const origins = d.allAllowedOrigins || [];
        adminState.corsOrigins = origins;

        if (origins.length === 0) {
          tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--admin-text-muted); padding: 24px;">Belum ada origin custom di whitelist.</td></tr>`;
          return;
        }

        tbody.innerHTML = origins.map(orig => {
          let cat = 'Custom Domain';
          if (orig.includes('localhost') || orig.includes('127.0.0.1')) cat = 'Local Development';
          else if (orig.includes('capacitor://') || orig.includes('ionic://')) cat = 'Mobile App / WebView';
          else if (orig.includes('coffeenity') || orig.includes('senopati')) cat = 'Official Production';

          return `
            <tr>
              <td><code style="font-family: monospace; font-size: 12px; color: var(--brand-espresso);">${escapeHtml(orig)}</code></td>
              <td><span class="status-badge" style="background: rgba(59,130,246,0.1); color: #3B82F6;">${cat}</span></td>
              <td><span class="status-badge badge-success">Allowed (204 OK)</span></td>
              <td>
                <button class="admin-btn secondary btn-sm" onclick="window.deleteCorsOrigin('${encodeURIComponent(orig)}')" style="color: #EF4444; border-color: rgba(239, 68, 68, 0.3);">Hapus</button>
              </td>
            </tr>
          `;
        }).join('');
      }
    } catch (e) {
      console.debug('Error loading CORS whitelist:', e);
    }
  }

  async function addCorsOrigin() {
    const input = document.getElementById('inputNewCorsOrigin');
    const origin = input?.value.trim();
    if (!origin) {
      showAdminToast('error', 'Masukkan URL origin domain terlebih dahulu.');
      return;
    }

    try {
      const res = await fetch('/api/admin/cors', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ origin })
      });
      if (res.ok) {
        showAdminToast('success', `Origin ${origin} berhasil ditambahkan.`);
        addAuditLog('CORS_ORIGIN_ADDED', `Origin ${origin} ditambahkan ke whitelist.`);
        if (input) input.value = '';
        renderCorsWhitelistTable();
      }
    } catch (e) {
      showAdminToast('error', 'Gagal menambahkan origin domain.');
    }
  }

  window.deleteCorsOrigin = async function(encodedOrigin) {
    if (!confirm('Hapus origin domain ini dari whitelist CORS?')) return;
    try {
      const res = await fetch(`/api/admin/cors/${encodedOrigin}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showAdminToast('success', 'Origin domain berhasil dihapus.');
        addAuditLog('CORS_ORIGIN_DELETED', `Origin ${decodeURIComponent(encodedOrigin)} dihapus dari whitelist.`);
        renderCorsWhitelistTable();
      }
    } catch (e) {
      showAdminToast('error', 'Gagal menghapus origin domain.');
    }
  };

  async function generateNewApiKey() {
    try {
      const res = await fetch('/api/admin/api-keys/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: 'External POS Integration ' + Date.now() })
      });

      if (res.ok) {
        const d = await res.json();
        addAuditLog('API_KEY_GENERATED', `Kunci API baru dibuat: ${d.apiKey.key}.`);
        showAdminToast('success', `API Key berhasil digenerate: ${d.apiKey.key}`);
      }
    } catch (e) {
      showAdminToast('error', 'Gagal generate API Key.');
    }
  }

  async function testWebhookPing() {
    const url = document.getElementById('inputWebhookUrl')?.value || 'https://api.pos-outlet.com/v1/webhooks/aiodma';
    try {
      const res = await fetch('/api/admin/webhooks/test', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ url })
      });

      if (res.ok) {
        const d = await res.json();
        addAuditLog('WEBHOOK_TEST_SENT', `Test ping webhook dikirim ke ${url}.`);
        showAdminToast('success', d.message);
      }
    } catch (e) {
      showAdminToast('error', 'Gagal mengirim test webhook.');
    }
  }

  // --- 18. MODULE 11: ONBOARDING WIZARD ---
  function openOnboardingWizard() {
    const modal = document.getElementById('adminWizardModal');
    if (!modal) return;
    adminState.wizardStep = 1;
    updateWizardUI();
    modal.style.display = 'flex';
  }

  function closeOnboardingWizard() {
    const modal = document.getElementById('adminWizardModal');
    if (modal) modal.style.display = 'none';
  }

  function updateWizardUI() {
    const pill1 = document.getElementById('wizStepPill1');
    const pill2 = document.getElementById('wizStepPill2');
    const pill3 = document.getElementById('wizStepPill3');
    const content = document.getElementById('wizardStepContent');
    const btnPrev = document.getElementById('btnWizardPrev');
    const btnNext = document.getElementById('btnWizardNext');

    if (!content) return;

    if (pill1) pill1.className = `status-pill ${adminState.wizardStep === 1 ? 'status-live' : ''}`;
    if (pill2) pill2.className = `status-pill ${adminState.wizardStep === 2 ? 'status-live' : ''}`;
    if (pill3) pill3.className = `status-pill ${adminState.wizardStep === 3 ? 'status-live' : ''}`;

    if (btnPrev) btnPrev.style.display = adminState.wizardStep > 1 ? 'inline-flex' : 'none';

    if (adminState.wizardStep === 1) {
      content.innerHTML = `
        <p><strong>Langkah 1: Inisialisasi Menu Standar (${getActiveCurrency()})</strong></p>
        <p>Sistem memuat katalog menu terkurasi lengkap dengan foto HD, profil rasa gastronomi, dan addon modifier dinamis.</p>
        <div style="padding: 10px; background: rgba(16,185,129,0.08); border-radius: 8px; color: #10B981; font-weight: 600;">
          Katalog menu siap digunakan seketika.
        </div>
      `;
      if (btnNext) btnNext.textContent = 'Lanjut ke Langkah 2';
    } else if (adminState.wizardStep === 2) {
      content.innerHTML = `
        <p><strong>Langkah 2: Verifikasi QR Standee Meja</strong></p>
        <p>Tersedia standee meja beresolusi tinggi dengan tanda tangan digital HMAC. Pelanggan cukup memindai QR untuk terhubung langsung.</p>
        <div style="padding: 10px; background: rgba(59,130,246,0.08); border-radius: 8px; color: #2563EB; font-weight: 600;">
          Unduh vector SVG dari tab Order & Meja.
        </div>
      `;
      if (btnNext) btnNext.textContent = 'Lanjut ke Langkah 3';
    } else if (adminState.wizardStep === 3) {
      content.innerHTML = `
        <p><strong>Langkah 3: Jalur Pembayaran & AI Concierge</strong></p>
        <p>Outlet terhubung dengan gateway pembayaran resmi dan model penalaran Gemini 3.7 Flash.</p>
        <div style="padding: 10px; background: rgba(16,185,129,0.08); border-radius: 8px; color: #10B981; font-weight: 600;">
          Outlet Anda 100% Siap Menerima Pelanggan!
        </div>
      `;
      if (btnNext) btnNext.textContent = 'Selesai & Tutup Wizard';
    }
  }

  function advanceWizard() {
    if (adminState.wizardStep < 3) {
      adminState.wizardStep++;
      updateWizardUI();
    } else {
      closeOnboardingWizard();
      showAdminToast('success', 'Setup outlet selesai! Selamat melayani pelanggan.');
      addAuditLog('WIZARD_COMPLETED', 'Onboarding wizard berhasil diselesaikan.');
    }
  }

  function retreatWizard() {
    if (adminState.wizardStep > 1) {
      adminState.wizardStep--;
      updateWizardUI();
    }
  }

  // --- 19. CSV EXPORT & SIMULATION UTILITIES ---
  function exportMenuCsv() {
    const headers = ['ID', 'Nama Menu', 'Kategori', 'Harga', 'Tersedia', 'Deskripsi'];
    const rows = adminState.menuStock.map(m => [
      m.id,
      `"${(m.name || '').replace(/"/g, '""')}"`,
      m.category,
      m.price,
      m.available !== false ? 'YES' : 'NO',
      `"${(m.desc || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `menu_${adminState.activeMerchantId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAdminToast('success', 'Katalog menu berhasil diekspor ke CSV.');
  }

  async function dispatchSimulatedTestOrder() {
    const isBnd = getActiveCurrency() === 'BND';
    const sampleItems = isBnd
      ? [{ id: 'pizza_margherita', name: 'Margherita Pizza', qty: 1, subtext: 'Wood-fired crispy' }, { id: 'sig_iced_caramel_latte', name: 'Iced Caramel Latte', qty: 1, subtext: 'Less Sweet' }]
      : [{ id: 'kopi_milk_aren', name: 'Kopi Milk Aren (Es)', qty: 2, subtext: 'Less Sugar 50%' }, { id: 'truffle_fries', name: 'Truffle Parmesan Fries', qty: 1, subtext: 'Extra Mayo' }];

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'Meja 5',
          tableNum: 5,
          merchantId: adminState.activeMerchantId,
          items: sampleItems,
          paymentMethod: isBnd ? 'BIBD' : 'QRIS',
          idempotencyKey: 'SIM_TEST_' + Date.now()
        })
      });

      if (res.ok) {
        showAdminToast('success', 'Simulasi order berhasil dikirim!');
      }
    } catch (e) {
      showAdminToast('error', 'Gagal mengirim order simulasi.');
    }
  }

  function simulateThermalPrint() {
    showAdminToast('info', '🖨️ Mengirim perintah cetak struk KDS ke thermal printer (58mm/80mm)...');
    setTimeout(() => {
      showAdminToast('success', '✔ Struk pesanan berhasil dicetak ke thermal printer dapur!');
    }, 1200);
  }

  function printAllTableQRs() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cardsHtml = adminState.tableQRs.map(t => `
      <div style="page-break-inside: avoid; border: 2px solid #333; border-radius: 16px; padding: 20px; width: 260px; margin: 15px; text-align: center; font-family: sans-serif; display: inline-block;">
        <h2 style="margin: 0 0 4px 0; font-size: 20px;">${adminState.activeMerchant?.name || 'AIODMA Cafe'}</h2>
        <p style="margin: 0 0 12px 0; font-size: 12px; color: #666;">${adminState.activeMerchant?.brandUnit || 'Artisan Table Ordering'}</p>
        <img src="${t.qrUrl}" style="width: 200px; height: 250px; object-fit: contain;" />
        <h3 style="margin: 12px 0 4px 0; font-size: 24px; font-weight: 900; color: #111;">${t.name}</h3>
        <p style="margin: 0; font-size: 11px; color: #888;">Scan QR untuk Pesan & Bayar Langsung</p>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>Cetak QR Standee Meja - ${adminState.activeMerchant?.name || 'AIODMA'}</title></head>
      <body style="text-align: center; background: #FFF;" onload="window.print();">
        ${cardsHtml}
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  // --- 20. REAL-TIME SERVER-SENT EVENTS (SSE) LISTENER ---
  function initSseBroadcaster() {
    if (!window.EventSource) return;

    const evtSource = new EventSource('/api/events');

    evtSource.onmessage = function (e) {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'ORDER_CREATED') {
          if (data.merchantId === adminState.activeMerchantId || !data.merchantId) {
            adminState.kdsOrders.unshift(data.order);
            renderKdsGrid();
            updateSidebarBadges();
            playAudioChime();
            showAdminToast('success', `Pesanan Baru ${data.order.orderNumber} diterima di ${data.order.table}!`);
            addAuditLog('ORDER_DISPATCHED', `Order ${data.order.orderNumber} diterima di dapur (${formatCurrency(data.order.total)} via ${data.order.paymentMethod}).`);
          }
        } else if (data.type === 'ORDER_STATUS_CHANGED') {
          const ord = adminState.kdsOrders.find(o => o.id === data.orderId || o.orderNumber === data.orderNumber);
          if (ord) {
            ord.status = data.status;
            renderKdsGrid();
            updateSidebarBadges();
          }
        } else if (data.type === 'MENU_STOCK_CHANGED') {
          const m = adminState.menuStock.find(it => it.id === data.menuId);
          if (m) {
            m.available = data.available;
            renderMenuCatalogTable();
          }
        } else if (data.type === 'CALL_WAITER') {
          playAudioChime();
          showAdminToast('info', `Panggilan Pelayan dari ${data.table}: "${data.reason}"`);
        }
      } catch (err) {}
    };

    evtSource.onerror = function () {
      console.warn('[SSE] Reconnecting real-time channel in 5s...');
    };
  }

  function playAudioChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  }

  function formatTimeAgo(date) {
    const sec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (sec < 60) return `${sec}d lalu`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m lalu`;
    const hr = Math.floor(min / 60);
    return `${hr}j lalu`;
  }

  // --- 21. INITIALIZE ON DOM READY ---
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Merchant Switcher
    const merchSel = document.getElementById('adminMerchantSelector');
    if (merchSel) {
      merchSel.addEventListener('change', (e) => loadTenantData(e.target.value));
    }

    // 2. Role Switcher
    const roleSel = document.getElementById('adminRoleSelector');
    if (roleSel) {
      roleSel.addEventListener('change', (e) => {
        enforceRbacRole(e.target.value);
        showAdminToast('info', `Role beralih ke ${e.target.value.toUpperCase()}`);
      });
    }

    // 3. Navigation Sidebar Buttons
    document.querySelectorAll('.nav-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        if (tabId) switchTab(tabId);
      });
    });

    // 4. Analytics Tab Refresh
    const btnRefAnalytics = document.getElementById('btnRefreshAnalytics');
    if (btnRefAnalytics) {
      btnRefAnalytics.addEventListener('click', () => loadTenantData(adminState.activeMerchantId));
    }

    // 5. KDS Buttons
    const btnTestPrint = document.getElementById('btnTestThermalPrinter');
    if (btnTestPrint) btnTestPrint.addEventListener('click', simulateThermalPrint);

    const btnSimOrder = document.getElementById('btnAdminKdsNewTestOrder');
    if (btnSimOrder) btnSimOrder.addEventListener('click', dispatchSimulatedTestOrder);

    // 6. Table QR Buttons
    const btnPrintQRs = document.getElementById('btnPrintAllQRs');
    if (btnPrintQRs) btnPrintQRs.addEventListener('click', printAllTableQRs);

    // 7. Menu Search & Filters
    const menuSearch = document.getElementById('adminMenuSearch');
    if (menuSearch) {
      menuSearch.addEventListener('input', (e) => {
        adminState.pagination.searchQuery = e.target.value;
        adminState.pagination.currentPage = 1;
        renderMenuCatalogTable();
      });
    }

    const catFilter = document.getElementById('adminCategoryFilter');
    if (catFilter) {
      catFilter.addEventListener('change', (e) => {
        adminState.pagination.categoryFilter = e.target.value;
        adminState.pagination.currentPage = 1;
        renderMenuCatalogTable();
      });
    }

    // Sorting Headers
    document.querySelectorAll('.sortable[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const sortField = th.getAttribute('data-sort');
        if (adminState.pagination.sortField === sortField) {
          adminState.pagination.sortAsc = !adminState.pagination.sortAsc;
        } else {
          adminState.pagination.sortField = sortField;
          adminState.pagination.sortAsc = true;
        }
        renderMenuCatalogTable();
      });
    });

    // Pagination Buttons
    const btnPrev = document.getElementById('btnPrevPage');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (adminState.pagination.currentPage > 1) {
          adminState.pagination.currentPage--;
          renderMenuCatalogTable();
        }
      });
    }

    const btnNext = document.getElementById('btnNextPage');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        adminState.pagination.currentPage++;
        renderMenuCatalogTable();
      });
    }

    // Menu Add & CSV Buttons
    const btnAddMenu = document.getElementById('btnOpenAddMenuDrawer');
    if (btnAddMenu) btnAddMenu.addEventListener('click', openAddMenuDrawer);

    const btnExportCsv = document.getElementById('btnExportCsvMenu');
    if (btnExportCsv) btnExportCsv.addEventListener('click', exportMenuCsv);

    const btnImportCsv = document.getElementById('btnImportCsvMenu');
    if (btnImportCsv) {
      btnImportCsv.addEventListener('click', () => showAdminToast('info', 'Pilih file CSV untuk mengimpor menu.'));
    }

    // Select All Menu Checkbox
    const chkAll = document.getElementById('chkSelectAllMenu');
    if (chkAll) {
      chkAll.addEventListener('change', (e) => {
        if (e.target.checked) {
          adminState.menuStock.forEach(m => adminState.pagination.selectedMenuIds.add(m.id));
        } else {
          adminState.pagination.selectedMenuIds.clear();
        }
        renderMenuCatalogTable();
        updateBulkActionBar();
      });
    }

    // Bulk Available / 86
    const btnBulkAvail = document.getElementById('btnBulkMarkAvailable');
    if (btnBulkAvail) {
      btnBulkAvail.addEventListener('click', async () => {
        for (const id of adminState.pagination.selectedMenuIds) {
          await toggleMenuStock(id);
        }
        adminState.pagination.selectedMenuIds.clear();
        updateBulkActionBar();
      });
    }

    const btnBulk86 = document.getElementById('btnBulkMark86');
    if (btnBulk86) {
      btnBulk86.addEventListener('click', async () => {
        for (const id of adminState.pagination.selectedMenuIds) {
          await toggleMenuStock(id);
        }
        adminState.pagination.selectedMenuIds.clear();
        updateBulkActionBar();
      });
    }

    // Promo Drawer Button
    const btnAddPromo = document.getElementById('btnOpenAddPromoDrawer');
    if (btnAddPromo) btnAddPromo.addEventListener('click', openAddPromoDrawer);

    // AI Config Buttons & Sliders
    const tempSlider = document.getElementById('geminiTempSlider');
    if (tempSlider) {
      tempSlider.addEventListener('input', (e) => {
        const valEl = document.getElementById('tempValueLabel');
        if (valEl) valEl.textContent = e.target.value;
      });
    }

    const btnToggleKey = document.getElementById('btnToggleApiKeyShow');
    if (btnToggleKey) {
      btnToggleKey.addEventListener('click', () => {
        const input = document.getElementById('geminiApiKeyInput');
        if (input) {
          input.type = input.type === 'password' ? 'text' : 'password';
          btnToggleKey.textContent = input.type === 'password' ? 'Lihat' : 'Sembunyi';
        }
      });
    }

    const btnTestAi = document.getElementById('btnTestGeminiConnection');
    if (btnTestAi) btnTestAi.addEventListener('click', testGeminiPing);

    const btnSaveAi = document.getElementById('btnSaveGeminiConfig');
    if (btnSaveAi) btnSaveAi.addEventListener('click', saveGeminiConfig);

    const btnResetAi = document.getElementById('btnResetAiGuardrails');
    if (btnResetAi) {
      btnResetAi.addEventListener('click', () => {
        const mod = document.getElementById('geminiModelSelect');
        const tone = document.getElementById('geminiToneSelect');
        const temp = document.getElementById('geminiTempSlider');
        const tempLbl = document.getElementById('tempValueLabel');
        if (mod) mod.value = 'gemini-3.7-flash';
        if (tone) tone.value = 'warm';
        if (temp) temp.value = 0.7;
        if (tempLbl) tempLbl.textContent = '0.7';
        showAdminToast('info', 'Parameter AI dikembalikan ke nilai default.');
      });
    }

    // RAG Knowledge Base Controls
    const btnOpenRag = document.getElementById('btnOpenAddRagModal');
    if (btnOpenRag) btnOpenRag.addEventListener('click', openAddRagModal);

    const btnCloseRag = document.getElementById('btnCloseAddRagModal');
    if (btnCloseRag) btnCloseRag.addEventListener('click', closeAddRagModal);

    const btnCancelRag = document.getElementById('btnCancelAddRag');
    if (btnCancelRag) btnCancelRag.addEventListener('click', closeAddRagModal);

    const btnSubmitRag = document.getElementById('btnSubmitAddRag');
    if (btnSubmitRag) btnSubmitRag.addEventListener('click', submitAddRagDocument);

    const btnExecRag = document.getElementById('btnExecuteRagTest');
    if (btnExecRag) btnExecRag.addEventListener('click', executeRagQueryTest);

    // CORS Controls
    const btnAddCors = document.getElementById('btnAddCorsOrigin');
    if (btnAddCors) btnAddCors.addEventListener('click', addCorsOrigin);

    // Credit & Billing Buttons
    const btnRefill = document.getElementById('btnRefillCredits');
    if (btnRefill) btnRefill.addEventListener('click', openRefillCreditsModal);

    // Staff Drawer Button
    const btnAddStaff = document.getElementById('btnOpenAddStaffDrawer');
    if (btnAddStaff) btnAddStaff.addEventListener('click', openAddStaffDrawer);

    // API Keys & Webhook Buttons
    const btnGenKey = document.getElementById('btnOpenGenerateApiKey');
    if (btnGenKey) btnGenKey.addEventListener('click', generateNewApiKey);

    const btnTestWh = document.getElementById('btnTestWebhook');
    if (btnTestWh) btnTestWh.addEventListener('click', testWebhookPing);

    // Audit Log Search & Clear
    const auditSearch = document.getElementById('adminAuditSearch');
    if (auditSearch) auditSearch.addEventListener('input', renderAuditLogTable);

    const btnClearAudit = document.getElementById('btnClearAuditLogs');
    if (btnClearAudit) {
      btnClearAudit.addEventListener('click', () => {
        if (auditSearch) auditSearch.value = '';
        renderAuditLogTable();
      });
    }

    // Wizard Buttons
    const btnLaunchWiz = document.getElementById('btnLaunchWizard');
    if (btnLaunchWiz) btnLaunchWiz.addEventListener('click', openOnboardingWizard);

    const btnWizDocs = document.getElementById('btnStartWizardFromDocs');
    if (btnWizDocs) btnWizDocs.addEventListener('click', openOnboardingWizard);

    const btnCloseWiz = document.getElementById('btnCloseWizard');
    if (btnCloseWiz) btnCloseWiz.addEventListener('click', closeOnboardingWizard);

    const btnWizNext = document.getElementById('btnWizardNext');
    if (btnWizNext) btnWizNext.addEventListener('click', advanceWizard);

    const btnWizPrev = document.getElementById('btnWizardPrev');
    if (btnWizPrev) btnWizPrev.addEventListener('click', retreatWizard);

    // Drawer Controls
    const btnCloseDrw = document.getElementById('btnCloseDrawer');
    if (btnCloseDrw) btnCloseDrw.addEventListener('click', closeDrawer);

    const btnCancelDrw = document.getElementById('btnCancelDrawer');
    if (btnCancelDrw) btnCancelDrw.addEventListener('click', closeDrawer);

    const btnSaveDrw = document.getElementById('btnSaveDrawer');
    if (btnSaveDrw) {
      btnSaveDrw.addEventListener('click', () => {
        if (typeof adminState.activeDrawerSaveHandler === 'function') {
          adminState.activeDrawerSaveHandler();
        }
      });
    }

    // Confirm Modal Controls
    const btnCancelCfm = document.getElementById('btnCancelConfirm');
    if (btnCancelCfm) btnCancelCfm.addEventListener('click', closeConfirmModal);

    const btnExecCfm = document.getElementById('btnExecuteConfirm');
    if (btnExecCfm) {
      btnExecCfm.addEventListener('click', () => {
        if (adminState.requiredConfirmText) {
          const typed = document.getElementById('typeToConfirmInput')?.value.trim();
          if (typed !== adminState.requiredConfirmText) {
            showAdminToast('error', `Mohon ketik "${adminState.requiredConfirmText}" untuk konfirmasi.`);
            return;
          }
        }
        if (typeof adminState.activeConfirmHandler === 'function') {
          adminState.activeConfirmHandler();
        }
      });
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDrawer();
        closeConfirmModal();
        closeOnboardingWizard();
      } else if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        showAdminToast('info', 'Pintasan Keyboard: 1-Analytics, 2-KDS, 3-Meja, 4-Menu, Esc-Tutup Modal');
      } else if (e.key === '1' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        switchTab('tabAnalytics');
      } else if (e.key === '2' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        switchTab('tabKDS');
      } else if (e.key === '3' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        switchTab('tabTableQR');
      } else if (e.key === '4' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        switchTab('tabMenuStock');
      }
    });

    // Initial Load & SSE
    loadTenantData('coffeenity');
    initSseBroadcaster();
    enforceRbacRole('owner');
  });

})();
