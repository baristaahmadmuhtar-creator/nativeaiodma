'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, expect } = require('@playwright/test');
const { startLocalDatabase } = require('../../scripts/local-database.cjs');
const { createDatabase } = require('../../src/infrastructure/database');
const { createApp } = require('../../src/server/app');
const OTPAuth = require('otpauth');

async function main() {
  let local, db, server, browser;
  const output = path.resolve('output/playwright/onboarding-' + Date.now()); fs.mkdirSync(output, { recursive: true });
  try {
    const liveUrl = process.env.ONBOARDING_LIVE_URL;
    if (liveUrl) assert.equal(new URL(liveUrl).origin, 'https://nativeaiodma-v18.vercel.app', 'Only the authorized production target is allowed');
    let base;
    if (liveUrl) base = new URL(liveUrl).origin;
    else {
      local = await startLocalDatabase('integration'); db = createDatabase(local.connectionString);
      await db.pool.query('DELETE FROM rate_limits');
      const config = { NODE_ENV: 'production', PUBLIC_BASE_URL: 'http://localhost', SESSION_SECRET: crypto.randomBytes(32).toString('hex') };
      server = await new Promise(resolve => { const instance = createApp({ db, config }).listen(0, '127.0.0.1', () => resolve(instance)); });
      base = config.PUBLIC_BASE_URL = `http://127.0.0.1:${server.address().port}`;
    }
    const executablePath = [await require('puppeteer').executablePath(), 'C:/Program Files/Google/Chrome/Application/chrome.exe', chromium.executablePath()].find(file => fs.existsSync(file));
    assert.ok(executablePath, 'An installed Chromium browser is required');
    browser = await chromium.launch({ executablePath, headless: true });
    for (const width of liveUrl ? [390] : [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', dialog => dialog.accept());
      const email = `browser_${crypto.randomUUID()}@example.test`, password = crypto.randomBytes(20).toString('hex');
      await page.goto(base + '/admin.html'); await page.getByRole('link', { name: 'Daftarkan cafe' }).click();
      await expect(page.locator('#register-form')).toBeVisible();
      await page.screenshot({ path: path.join(output, `${width}-register.png`), fullPage: true });
      const form = page.locator('#register-form');
      for (const [name, value] of Object.entries({ email, password, confirmPassword: password + 'wrong', name: 'AIODMA Smoke Test', tables: '2' })) await form.locator(`[name=${name}]`).fill(value);
      await form.getByRole('button', { name: 'Buat akun dan cafe' }).click();
      await expect(form.locator('.form-error')).toContainText('Konfirmasi kata sandi tidak sama');
      await form.locator('[name=confirmPassword]').fill(password);
      await form.getByRole('button', { name: 'Buat akun dan cafe' }).click();
      await expect(page.locator('#mfa-gate')).toBeVisible();
      await page.locator('#mfa-content [name=password]').fill(password);
      await page.getByRole('button', { name: 'Buat pendaftaran', exact: true }).click();
      const authLink = page.locator('#mfa-content a[href^="otpauth:"]'); await expect(authLink).toBeVisible();
      const authenticator = OTPAuth.URI.parse(await authLink.getAttribute('href'));
      await page.locator('#mfa-content [name=otp]').fill(authenticator.generate());
      await page.getByRole('button', { name: 'Verifikasi & aktifkan', exact: true }).click();
      await expect(page.locator('.code-grid code')).toHaveCount(10);
      const recoveryCodes = await page.locator('.code-grid code').allTextContents();
      await page.getByRole('button', { name: 'Kode sudah disimpan', exact: true }).click();
      await expect(page.locator('#page-title')).toHaveText('Persiapan cafe');
      await expect(page.getByRole('button', { name: 'Terbitkan cafe', exact: true })).toBeDisabled();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.getByRole('link', { name: 'Kelola menu', exact: true }).click();
      await page.getByRole('button', { name: '+ Tambah menu', exact: true }).click();
      const dialog = page.locator('#editor');
      for (const [name, value] of Object.entries({ id: 'coffee', name: 'Coffee', price: '3.50', category: 'Coffee', image: 'assets/products/hot_latte.jpg' })) await dialog.locator(`[name=${name}]`).fill(value);
      await dialog.getByRole('button', { name: 'Simpan', exact: true }).click(); await expect(dialog).not.toBeVisible();
      await page.locator('#navigation a[href="#onboarding"]').click();
      await page.getByRole('button', { name: 'Terbitkan cafe', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Tarik publikasi', exact: true })).toBeVisible();
      await page.screenshot({ path: path.join(output, `${width}-published.png`), fullPage: true });
      await page.getByRole('button', { name: 'Ganti tema', exact: true }).click();
      await page.screenshot({ path: path.join(output, `${width}-dark.png`), fullPage: true });
      await page.locator('#navigation a[href="#tables"]').click();
      const qrResponse = page.waitForResponse(r => r.url().endsWith('/admin/tables/1/qr'));
      await page.locator('tr').filter({ hasText: 'Meja 1' }).getByRole('button', { name: 'QR', exact: true }).click();
      const qr = (await (await qrResponse).json()).data;
      await expect(dialog.locator('.qr-image')).toBeVisible();
      const guestContext = await browser.newContext({ viewport: { width, height: 900 } }); const customer = await guestContext.newPage();
      await customer.goto(qr.url); await expect(customer.locator('#labelMenuTable')).toHaveText('Table 1');
      await customer.locator('[data-lang="id-ID"]').click(); await customer.locator('#qpLihatSemuaMenu').click();
      await expect(customer.locator('.product-card')).toHaveCount(1);
      const sharedCustomer = await context.newPage();
      await sharedCustomer.goto(qr.url); await expect(sharedCustomer.locator('#labelMenuTable')).toHaveText('Table 1');
      await sharedCustomer.locator('[data-lang="en-US"]').click(); await sharedCustomer.locator('#qpLihatSemuaMenu').click();
      await sharedCustomer.locator('.btn-add-product').click(); await sharedCustomer.locator('#btnAddCustomizedToCart').click();
      await expect(sharedCustomer.locator('#catalogCartBadge')).toHaveText('1');
      assert.equal(await page.evaluate(async()=> (await (await fetch('/api/v1/session')).json()).data?.role),'owner');
      assert.equal(await sharedCustomer.evaluate(async()=> (await (await fetch('/api/v1/session',{headers:{'X-AIODMA-Surface':'customer'}})).json()).data?.role),'guest');
      await guestContext.close(); await page.locator('#close-editor').click();
      if (process.env.ONBOARDING_ORDER_SMOKE === '1') {
        await sharedCustomer.locator('#btnCatalogCartPill').click(); await sharedCustomer.locator('#btnProceedToPayment').click();
        await expect(sharedCustomer.locator('#btnProcessPayment')).toBeEnabled();
        const orderResponse=sharedCustomer.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/orders'&&response.request().method()==='POST');
        await sharedCustomer.locator('#btnProcessPayment').click();
        const response=await orderResponse; assert.equal(response.status(),201);
        const order=(await response.json()).data; assert.equal(order.paymentStatus,'UNPAID'); assert.equal(order.totalMinor,350);
        await expect(sharedCustomer.locator('#screenOrderSuccess')).toHaveClass(/active/);
        await sharedCustomer.locator('#btnSaveReceipt').click(); await expect(sharedCustomer.locator('.receipt-success-text')).toHaveText('UNPAID');
        await sharedCustomer.screenshot({path:path.join(output,`${width}-unpaid-receipt.png`)});
        await page.locator('#navigation a[href="#orders"]').click();
        await page.getByRole('button',{name:'Detail',exact:true}).click();
        await dialog.locator('[name=reference]').fill('SMOKE TEST - synthetic cash ledger; no real funds');
        await dialog.getByRole('button',{name:'Catat pembayaran',exact:true}).click(); await expect(dialog).not.toBeVisible();
        for (const status of ['accepted','preparing','ready','served','completed']) {
          await page.getByRole('button',{name:'Detail',exact:true}).click(); await dialog.locator('[name=status]').selectOption(status);
          await dialog.getByRole('button',{name:'Ubah status',exact:true}).click(); await expect(dialog).not.toBeVisible();
        }
        const persisted=await sharedCustomer.evaluate(async id=>(await (await fetch('/api/v1/orders/'+id,{headers:{'X-AIODMA-Surface':'customer'}})).json()).data,order.id);
        assert.equal(persisted.paymentStatus,'PAID'); assert.equal(persisted.status,'completed'); assert.equal(persisted.totalMinor,350);
        await page.locator('#navigation a[href="#reports"]').click(); await expect(page.locator('#page-content')).toContainText('3,50');
        console.log(`PASS ${liveUrl?'production':'local'} disposable outlet: unpaid receipt, synthetic manual settlement, accepted/preparing/ready/served/completed, guest persisted status and report`);
      }
      await page.locator('#navigation a[href="#onboarding"]').click();
      await page.getByRole('button', { name: 'Tarik publikasi', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Terbitkan cafe', exact: true })).toBeVisible();
      assert.equal(await sharedCustomer.evaluate(async()=> (await fetch('/api/v1/session',{headers:{'X-AIODMA-Surface':'customer'}})).status),401);
      await sharedCustomer.close();
      await page.locator('#logout').click(); await expect(page.locator('#login-form')).toBeVisible();
      await page.locator('#login-form [name=email]').fill(email); await page.locator('#login-form [name=password]').fill(password);
      await page.locator('#login-form [name=merchantId]').fill('');
      await page.locator('#login-form [name=verification]').selectOption('recoveryCode');
      await page.locator('#login-form [name=verificationCode]').fill(recoveryCodes[0]);
      await page.getByRole('button', { name: 'Masuk', exact: true }).click();
      await expect(page.locator('#app')).toBeVisible(); await page.locator('#logout').click();
      await page.getByRole('link', { name: 'Pulihkan akun' }).click(); await expect(page.locator('#recover-form')).toBeVisible();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []); await context.close();
      console.log(`PASS ${liveUrl ? 'production' : 'local'} ${width}: signup, MFA, draft, menu, publish/unpublish, QR customer, login without outlet, recovery code, dark mode`);
    }
    console.log('Evidence: ' + output);
  } finally { await browser?.close(); server?.closeAllConnections(); if (server) await new Promise(resolve => server.close(resolve)); await db?.close(); await local?.stop(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
