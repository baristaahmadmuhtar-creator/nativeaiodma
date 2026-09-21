'use strict';

// Real HTTP + PostgreSQL + Chrome. No route interception or mocked API/provider.
// Run exclusively against the stopped integration cluster: node tests/e2e/admin-v18.cjs
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, request, expect } = require('@playwright/test');
const { startLocalDatabase } = require('../../scripts/local-database.cjs');
const { seed } = require('../../scripts/seed-v18.cjs');
const { createDatabase } = require('../../src/infrastructure/database');
const { createApp } = require('../../src/server/app');
const { tableToken } = require('../../src/modules/identity');

async function main() {
  const suffix = crypto.randomBytes(6).toString('hex');
  const tenant = `admin_browser_${suffix}`;
  const email = `${tenant}@example.test`, password = crypto.randomBytes(24).toString('hex');
  const output = path.resolve(__dirname, '../../output/admin-v18', suffix);
  fs.mkdirSync(output, { recursive: true });
  let local, db, server, browser, guest;
  let phase = 'start';
  const errors = [], writes = [];
  try {
    local = await startLocalDatabase('integration');
    await seed({ connectionString: local.migrationUrl, email, password, published: true,
      merchants: [{ id: tenant, name: 'Admin Browser Cafe', currency: 'BND', taxRate: 0, tablesCount: 2,
        menu: [{ id: 'coffee', name: 'Kopi Susu', category: 'Coffee', price: 3.5, available: true,
          image: 'assets/products/kopi_milk_aren.jpg' }] }] });
    db = createDatabase(local.connectionString);
    const config = { SESSION_SECRET: crypto.randomBytes(32).toString('hex'), NODE_ENV: 'test', PUBLIC_BASE_URL: 'http://localhost' };
    server = await new Promise((resolve, reject) => {
      const instance = createApp({ db, config }).listen(0, '127.0.0.1', () => resolve(instance));
      instance.once('error', reject);
    });
    const base = config.PUBLIC_BASE_URL = `http://127.0.0.1:${server.address().port}`;
    const executablePath = [process.env.ADMIN_V18_BROWSER, await require('puppeteer').executablePath(),
      'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean).find(file => fs.existsSync(file));
    assert.ok(executablePath, 'Installed Chromium executable required');
    browser = await chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
    const page = await context.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', () => errors.push(`browser exception during ${phase}`));
    page.on('dialog', dialog => dialog.accept());
    page.on('request', req => {
      if (req.url().includes('/api/v1/') && req.method() !== 'GET') {
        const headers = req.headers();
        writes.push({ path: new URL(req.url()).pathname, csrf: !!headers['x-csrf-token'], key: headers['idempotency-key'] });
      }
    });
    const dialog = page.locator('#editor');
    async function envelope(response, status = 200) {
      assert.equal(response.status(), status, `Unexpected response status during ${phase}`);
      const body = await response.json(); assert.equal(body.success, true, `API failure during ${phase}`); return body.data;
    }
    async function visit(tab, endpoint) {
      phase = `tab ${tab}`;
      const response = endpoint ? page.waitForResponse(r => new URL(r.url()).pathname === `/api/v1${endpoint}` && r.request().method() === 'GET') : null;
      await page.locator(`#navigation a[href="#${tab}"]`).click();
      const data = response ? await envelope(await response) : null;
      if (endpoint) await expect(page.locator('#updated-at')).toContainText('Diperbarui');
      await expect(page.locator('#page-content .notice.error')).toHaveCount(0);
      return data;
    }
    async function submit(name, endpoint, method, status = 200) {
      const response = page.waitForResponse(r => new URL(r.url()).pathname === `/api/v1${endpoint}` && r.request().method() === method);
      await dialog.getByRole('button', { name, exact: true }).click();
      const result = await envelope(await response, status);
      await expect(dialog).not.toBeVisible(); await expect(page.locator('#updated-at')).toContainText('Diperbarui');
      return result;
    }
    async function capture(name) {
      await page.evaluate(async () => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        await document.fonts.ready;
        await Promise.all([...document.images].filter(image => !image.complete).map(image => new Promise(resolve => {
          image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true });
        })));
        await Promise.all(document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime)).map(animation => animation.finished.catch(() => {})));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Viewport overflow: ${name}`);
      const options = { animations: 'disabled',
        style: '#toast,#updated-at,#session-time{visibility:hidden!important}*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' };
      const image = await page.screenshot({ ...options, path: path.join(output, name) });
      assert.ok(image.length > 2048, `Screenshot was unexpectedly empty: ${name}`);
    }

    phase = 'owner login';
    await page.goto(`${base}/admin.html#orders`);
    await page.locator('#login-form [name=email]').fill(email);
    await page.locator('#login-form [name=password]').fill(password);
    await page.locator('#login-form [name=merchantId]').fill(tenant);
    const loginResponse = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/login');
    await page.locator('#login-form button[type=submit]').click();
    assert.equal((await envelope(await loginResponse)).role, 'owner');
    await expect(page.locator('#app')).toBeVisible(); await expect(page.locator('#outlet-name')).toHaveText('Admin Browser Cafe');
    await expect(page.locator('#updated-at')).toContainText('Diperbarui');
    await expect(page.locator('#page-content')).toContainText('Tidak ada pesanan');
    console.log('PASS owner login and real empty orders');

    const endpoints = { kds: '/orders', menu: '/admin/menu', tables: '/admin/tables', waiter: '/admin/waiter-calls',
      promos: '/admin/resources/promo', knowledge: '/admin/resources/knowledge', ai: '/admin/ai-status',
      reports: '/admin/stats', staff: '/admin/staff', settings: '/admin/settings', audit: '/admin/audit' };
    for (const [tab, endpoint] of Object.entries(endpoints)) await visit(tab, endpoint);
    await visit('integrations'); await expect(page.locator('#page-content')).toContainText('Tidak tersedia');
    console.log('PASS every admin tab: real responses; unavailable integrations accurately labelled');

    await visit('menu', '/admin/menu'); phase = 'menu create';
    await page.getByRole('button', { name: '+ Tambah menu', exact: true }).click();
    await dialog.locator('[name=id]').fill('browser_latte'); await dialog.locator('[name=name]').fill('Browser Latte');
    await dialog.locator('[name=price]').fill('4.50'); await dialog.locator('[name=category]').fill('Coffee');
    await dialog.locator('[name=image]').fill('assets/products/hot_latte.jpg');
    await dialog.getByRole('button', { name: '+ Grup modifier', exact: true }).click();
    await dialog.locator('[name=groupId]').fill('extras'); await dialog.locator('[name=min]').fill('0'); await dialog.locator('[name=max]').fill('1');
    await dialog.getByRole('button', { name: '+ Opsi', exact: true }).click();
    await dialog.locator('[name=optionId]').fill('extra_oat'); await dialog.locator('[name=optionName]').fill('Oat'); await dialog.locator('[name=optionPrice]').fill('0.75');
    await submit('Simpan', '/admin/menu', 'POST', 201);
    phase = 'menu edit';
    await page.locator('tr').filter({ hasText: 'Browser Latte' }).getByRole('button', { name: 'Edit', exact: true }).click();
    await dialog.locator('[name=name]').fill('Browser Latte Updated'); await dialog.locator('[name=price]').fill('4.75');
    await submit('Simpan', '/admin/menu/browser_latte', 'PUT');
    const publicMenu = await envelope(await context.request.get(`${base}/api/v1/menu?merchant=${tenant}`));
    const updated = publicMenu.items.find(item => item.id === 'browser_latte');
    assert.equal(updated.name, 'Browser Latte Updated'); assert.equal(updated.price, 4.75); assert.equal(updated.modifierGroups[0].options[0].price, .75);
    await capture('desktop-menu.png');
    console.log('PASS menu create/edit/modifier -> public customer API');

    await visit('tables', '/admin/tables'); phase = 'QR dialog';
    const qrResponse = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/admin/tables/1/qr');
    await page.locator('tr').filter({ hasText: 'Meja 1' }).getByRole('button', { name: 'QR', exact: true }).click();
    const qr = await envelope(await qrResponse); assert.equal(new URL(qr.url).searchParams.get('merchant'), tenant);
    await expect(dialog.locator('.qr-image')).toBeVisible();
    await page.waitForFunction(() => document.querySelector('.qr-image')?.naturalWidth > 0);
    await page.locator('#close-editor').click();

    await visit('knowledge', '/admin/resources/knowledge'); phase = 'knowledge creation';
    await page.getByRole('button', { name: '+ Dokumen', exact: true }).click(); await dialog.locator('[name=id]').fill('hours');
    await dialog.locator('[name=title]').fill('Opening hours'); await dialog.locator('[name=text]').fill('Open daily from 09:00 to 18:00.'); await dialog.locator('[name=status]').selectOption('published');
    await submit('Simpan', '/admin/resources/knowledge', 'POST', 201);
    await visit('promos', '/admin/resources/promo'); phase = 'promo creation';
    await page.getByRole('button', { name: '+ Promo', exact: true }).click(); await dialog.locator('[name=id]').fill('TENOFF');
    await dialog.locator('[name=value]').fill('10'); await dialog.locator('[name=active]').check();
    await submit('Simpan', '/admin/resources/promo', 'POST', 201);
    const resources = await db.transaction(tenant, client => client.query("SELECT kind,content FROM tenant_resources WHERE tenant_id=$1 AND kind IN ('knowledge','promo')", [tenant]));
    assert.equal(resources.rowCount, 2); assert.equal(resources.rows.find(row => row.kind === 'knowledge').content.status, 'published');
    console.log('PASS real QR rendering and persisted knowledge/promo');

    phase = 'guest unpaid order fixture';
    guest = await request.newContext({ baseURL: base });
    const guestSession = await envelope(await guest.post('/api/v1/session', { data: { merchantId: tenant, tableId: 1, token: tableToken(config, tenant, 1, 1) } }));
    const guestHeaders = () => ({ 'X-CSRF-Token': guestSession.csrfToken, 'Idempotency-Key': crypto.randomUUID() });
    const cart = await envelope(await guest.get('/api/v1/cart'));
    const changed = await envelope(await guest.put('/api/v1/cart', { headers: guestHeaders(), data: { expectedVersion: cart.version, lines: [{ menuId: 'browser_latte', qty: 2, optionIds: ['extra_oat'] }] } }));
    const quote = await envelope(await guest.post('/api/v1/quotes', { headers: guestHeaders(), data: { expectedVersion: changed.version } }), 201);
    const order = await envelope(await guest.post('/api/v1/orders', { headers: guestHeaders(), data: { quoteId: quote.id, confirmed: true, paymentMethod: 'CASH' } }), 201);
    assert.equal(order.paymentStatus, 'UNPAID'); assert.equal(order.totalMinor, 1100);
    await envelope(await guest.post('/api/v1/waiter-calls', { headers: guestHeaders(), data: { reason: 'Need help with the menu' } }), 201);
    await visit('orders', '/orders'); phase = 'manual payment';
    await page.getByRole('button', { name: 'Detail', exact: true }).click();
    await dialog.locator('form').filter({ has: page.getByRole('button', { name: 'Catat pembayaran', exact: true }) }).locator('[name=reference]').fill('Browser cash received');
    await submit('Catat pembayaran', `/admin/orders/${order.id}/payment`, 'PATCH');
    for (const status of ['accepted', 'preparing', 'ready']) {
      phase = `transition ${status}`; await page.getByRole('button', { name: 'Detail', exact: true }).click();
      await dialog.locator('[name=status]').selectOption(status); await submit('Ubah status', `/admin/orders/${order.id}/status`, 'PATCH');
    }
    const persisted = await db.transaction(tenant, client => client.query('SELECT status,payment_status FROM orders WHERE tenant_id=$1 AND id=$2', [tenant, order.id]));
    assert.deepEqual(persisted.rows[0], { status: 'ready', payment_status: 'paid' });
    const settlement = await db.transaction(tenant, client => client.query("SELECT amount_minor FROM payment_events WHERE tenant_id=$1 AND order_id=$2 AND kind='settlement'", [tenant, order.id]));
    assert.equal(settlement.rowCount, 1); assert.equal(Number(settlement.rows[0].amount_minor), 1100);
    await capture('desktop-orders.png'); await visit('kds', '/orders'); await capture('desktop-kds.png');
    console.log('PASS unpaid order -> manual payment -> accepted/preparing/ready; PostgreSQL settlement corroborated');

    await visit('waiter', '/admin/waiter-calls'); phase = 'waiter update';
    await page.getByRole('button', { name: 'Tindak lanjut', exact: true }).click();
    const waiterResponse = page.waitForResponse(r => new URL(r.url()).pathname.startsWith('/api/v1/admin/waiter-calls/') && r.request().method() === 'PATCH');
    await dialog.getByRole('button', { name: 'Perbarui panggilan', exact: true }).click(); await envelope(await waiterResponse); await expect(dialog).not.toBeVisible();
    const stats = await visit('reports', '/admin/stats'); assert.equal(stats.settledMinor, 1100); assert.equal(stats.netMinor, 1100);
    for (const [width, height] of [[390, 844], [320, 812]]) {
      await page.setViewportSize({ width, height }); await visit('orders', '/orders'); await capture(`${width}-orders.png`);
      await visit('menu', '/admin/menu'); await capture(`${width}-menu.png`);
      await page.locator('tr').filter({ hasText: 'Browser Latte Updated' }).getByRole('button', { name: 'Edit', exact: true }).click(); await capture(`${width}-menu-editor.png`);
      await dialog.evaluate(node => { node.scrollTop = node.scrollHeight; });
      assert.equal(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth), true, 'Modifier editor horizontal overflow');
      await capture(`${width}-modifiers.png`);
      await page.locator('#close-editor').click();
    }
    phase = 'dark theme'; await page.locator('#theme-toggle').click(); await capture('320-dark-menu.png');
    assert.deepEqual(errors, []);
    for (const write of writes) {
      assert.match(write.key || '', /^[a-f0-9-]{36}$/i, `Missing idempotency key at ${write.path}`);
      if (!write.path.endsWith('/auth/login')) assert.equal(write.csrf, true, `Missing CSRF at ${write.path}`);
    }
    console.log('PASS desktop/mobile screenshots, dark theme, no overflow/browser exceptions, CSRF/idempotency headers');
    console.log(`Evidence: ${path.relative(process.cwd(), output)}`);
  } catch (error) {
    // Do not print request bodies, browser call logs, account secrets or QR URLs.
    const safeMessage = String(error.message || error.name || 'Error').replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]');
    throw new Error(`Admin browser integration failed during ${phase}: ${error.name || 'Error'} ${safeMessage}`);
  } finally {
    const cleanupErrors = [];
    for (const cleanup of [() => browser?.close(), () => guest?.dispose(), async () => {
      server?.closeAllConnections(); if (server) await new Promise(resolve => server.close(resolve));
    }, () => db?.close(), () => local?.stop()]) {
      try { await cleanup(); } catch { cleanupErrors.push('resource cleanup failed'); }
    }
    if (cleanupErrors.length) throw new Error(cleanupErrors.join('; '));
  }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { main };
