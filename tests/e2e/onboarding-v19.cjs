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
    async function settle(customer) {await customer.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})));});}
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
      await page.getByRole('button',{name:'Tarik publikasi',exact:true}).hover();
      assert.equal(await page.getByRole('button',{name:'Tarik publikasi',exact:true}).evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(23, 25, 28)');
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
      sharedCustomer.on('pageerror',error=>errors.push(error.message));
      await sharedCustomer.goto(qr.url); await expect(sharedCustomer.locator('#labelMenuTable')).toHaveText('Table 1');
      await sharedCustomer.locator('[data-lang="en-US"]').click(); await sharedCustomer.locator('#qpLihatSemuaMenu').click();
      await sharedCustomer.locator('.btn-add-product').click(); await sharedCustomer.locator('#btnAddCustomizedToCart').click();
      await expect(sharedCustomer.locator('#catalogCartBadge')).toHaveText('1');
      assert.equal(await page.evaluate(async()=> (await (await fetch('/api/v1/session')).json()).data?.role),'owner');
      assert.equal(await sharedCustomer.evaluate(async()=> (await (await fetch('/api/v1/session',{headers:{'X-AIODMA-Surface':'customer'}})).json()).data?.role),'guest');
      await guestContext.close(); await page.locator('#close-editor').click();
      if (process.env.ONBOARDING_ORDER_SMOKE === '1') {
        const staffContexts=[];
        async function staff(role) {
          const account={email:`${role}_${crypto.randomUUID()}@example.test`,password:crypto.randomBytes(20).toString('hex')};
          const invitation=await page.evaluate(async account=>{
            const s=(await (await fetch('/api/v1/session')).json()).data;
            const response=await fetch('/api/v1/admin/invitations',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':s.csrfToken},body:JSON.stringify(account)});
            if(!response.ok)throw new Error('Staff invitation failed');return (await response.json()).data;
          },{email:account.email,role});
          const params=new URLSearchParams(new URL(invitation.invitationUrl).hash.slice(1));
          const ctx=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});staffContexts.push(ctx);
          const operator=await ctx.newPage();operator.on('dialog',dialog=>dialog.accept());operator.on('pageerror',error=>errors.push(error.message));
          await operator.goto(base+'/admin.html#orders');
          const status=await operator.evaluate(async invitation=>(await fetch('/api/v1/auth/accept-invitation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(invitation)})).status,{tenantId:params.get('tenant'),id:params.get('invite'),token:params.get('token'),password:account.password});
          assert.equal(status,200);
          await operator.locator('#login-form [name=email]').fill(account.email);await operator.locator('#login-form [name=password]').fill(account.password);await operator.locator('#login-form [name=merchantId]').fill(params.get('tenant'));
          await operator.getByRole('button',{name:'Masuk',exact:true}).click();await expect(operator.locator('#app')).toBeVisible();
          assert.equal(await operator.evaluate(async()=> (await fetch('/api/v1/admin/ai-status')).status),403);
          return operator;
        }
        await sharedCustomer.locator('#btnCatalogCartPill').click(); await sharedCustomer.locator('#btnProceedToPayment').click();
        await expect(sharedCustomer.locator('#btnProcessPayment')).toBeEnabled();
        const orderResponse=sharedCustomer.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/orders'&&response.request().method()==='POST');
        await sharedCustomer.locator('#btnProcessPayment').click();
        const response=await orderResponse; assert.equal(response.status(),201);
        const order=(await response.json()).data; assert.equal(order.paymentStatus,'UNPAID'); assert.equal(order.totalMinor,350);
        await expect(sharedCustomer.locator('#screenOrderSuccess')).toHaveClass(/active/);
        await sharedCustomer.locator('#btnSaveReceipt').click(); await expect(sharedCustomer.locator('.receipt-success-text')).toHaveText('UNPAID');
        await sharedCustomer.screenshot({path:path.join(output,`${width}-unpaid-receipt.png`)});
        const cashier=await staff('cashier'),kitchen=await staff('kitchen'),waiter=await staff('waiter');
        await cashier.getByRole('button',{name:'Detail',exact:true}).click();
        await cashier.locator('#editor [name=reference]').fill('SMOKE TEST - synthetic cash ledger; no real funds');
        await cashier.locator('#editor').getByRole('button',{name:'Catat pembayaran',exact:true}).click(); await expect(cashier.locator('#editor')).not.toBeVisible();
        await expect(sharedCustomer.locator('.receipt-success-text')).toHaveText('PAID',{timeout:20000});
        await sharedCustomer.locator('#btnReceiptBackToHome').click();await settle(sharedCustomer);
        const banner=await sharedCustomer.locator('#btnOpenOrderTrackerFromBanner').boundingBox(),bx=banner.x+banner.width/2,by=banner.y+banner.height/2;
        await sharedCustomer.mouse.move(bx,by);await sharedCustomer.mouse.down();await sharedCustomer.mouse.move(bx+125,by,{steps:8});await sharedCustomer.mouse.up();
        await expect(sharedCustomer.locator('#liveOrderActivityBanner')).not.toBeVisible();
        await expect(sharedCustomer.locator('#orderTrackerBackdrop')).not.toHaveClass(/open/);
        await context.setOffline(true);await expect(sharedCustomer.locator('#customerV18Status')).toHaveAttribute('data-tone','error');
        await sharedCustomer.locator('#btnHeaderOptions').click();await sharedCustomer.locator('#menuItemOpenTracker').click();await expect(sharedCustomer.locator('#orderTrackerBackdrop')).toHaveClass(/open/);
        await expect(sharedCustomer.locator('#trackerConnectionLabel')).toHaveText('Offline. Showing the last known status.');await expect(sharedCustomer.locator('#trackerPaymentStatusLabel')).toHaveText('PAID');await expect(sharedCustomer.locator('#btnTrackerCallWaiter')).toBeDisabled();
        await settle(sharedCustomer);assert.equal(await sharedCustomer.locator('#btnCloseTrackerSheet').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'offline tracker close action is pinned and reachable');
        await sharedCustomer.screenshot({path:path.join(output,`${width}-offline-tracker.png`)});await sharedCustomer.locator('#btnCloseTrackerSheet').click();await expect(sharedCustomer.locator('#orderTrackerBackdrop')).not.toHaveClass(/open/);
        await sharedCustomer.locator('#btnOpenOrderTrackerFromBanner').focus();await sharedCustomer.keyboard.press('Delete');await context.setOffline(false);await sharedCustomer.waitForFunction(()=>document.querySelector('#customerV18Status').hidden);
        async function transition(operator,status) {
          await operator.locator('#refresh').click();await expect(operator.locator('#page-content')).not.toHaveAttribute('aria-busy','true');
          await operator.getByRole('button',{name:'Detail',exact:true}).click(); await operator.locator('#editor [name=status]').selectOption(status);
          await operator.locator('#editor').getByRole('button',{name:'Ubah status',exact:true}).click();await expect(operator.locator('#editor')).not.toBeVisible();
        }
        for (const [status,label] of [['accepted','Accepted'],['preparing','Preparing'],['ready','Ready']]) {
          await transition(kitchen,status);await expect(sharedCustomer.locator('.receipt-order-subtext')).toHaveText(label,{timeout:20000});
          if(status==='accepted') {
            await expect(sharedCustomer.locator('#liveOrderActivityBanner')).not.toBeVisible();
            assert.equal(await sharedCustomer.locator('#customerV18Status').evaluate(el=>el.hidden),true,'real SSE respects hidden tracking preference');
            await sharedCustomer.locator('#btnHeaderOptions').click();await sharedCustomer.locator('#menuItemOpenTracker').click();
            await expect(sharedCustomer.locator('#orderTrackerBackdrop')).toHaveClass(/open/);
            await expect(sharedCustomer.locator('#trackerStatusBadge')).toHaveText('Accepted');await sharedCustomer.keyboard.press('Escape');await expect(sharedCustomer.locator('#orderTrackerBackdrop')).not.toHaveClass(/open/);
            await sharedCustomer.goBack();await expect(sharedCustomer.locator('#screenThermalReceipt')).toHaveClass(/active/);
          }
        }
        await transition(waiter,'served');await expect(sharedCustomer.locator('.receipt-order-subtext')).toHaveText('Served',{timeout:20000});
        await page.locator('#navigation a[href="#orders"]').click();await transition(page,'completed');
        await expect(sharedCustomer.locator('.receipt-order-subtext')).toHaveText('Completed',{timeout:20000});
        assert.equal(await sharedCustomer.locator('#customerV18Status').evaluate(el=>el.hidden),true,'receipt updates in place without an obstructing progress toast');
        const persisted=await sharedCustomer.evaluate(async id=>(await (await fetch('/api/v1/orders/'+id,{headers:{'X-AIODMA-Surface':'customer'}})).json()).data,order.id);
        assert.equal(persisted.paymentStatus,'PAID'); assert.equal(persisted.status,'completed'); assert.equal(persisted.totalMinor,350);
        await sharedCustomer.locator('#btnHeaderThemeToggle').click();await expect(sharedCustomer.locator('html')).toHaveAttribute('data-theme','dark');
        assert.equal(await sharedCustomer.locator('.thermal-paper-card').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(28, 28, 30)');
        await settle(sharedCustomer);
        await sharedCustomer.screenshot({path:path.join(output,`${width}-paid-completed-dark-receipt.png`)});
        await sharedCustomer.locator('#btnReceiptBackToHome').click();await sharedCustomer.locator('#btnOpenOrderTrackerFromBanner').click();
        await expect(sharedCustomer.locator('#orderTrackerBackdrop')).toHaveClass(/open/);
        await expect(sharedCustomer.locator('#trackerStatusBadge')).toHaveText('Completed');
        await expect(sharedCustomer.locator('#trackerPaymentStatusLabel')).toHaveText('PAID');
        await expect(sharedCustomer.locator('#trackerStepCompleted .step-title')).toHaveText('4. Completed');
        await settle(sharedCustomer);
        await sharedCustomer.screenshot({path:path.join(output,`${width}-completed-dark-tracker.png`)});
        await page.locator('#navigation a[href="#reports"]').click(); await expect(page.locator('#page-content')).toContainText('3,50');
        await page.locator('#navigation a[href="#notifications"]').click();await expect(page.locator('#page-content')).toContainText(`#${order.orderNumber}`);
        await page.getByRole('button',{name:'Tandai sudah dibaca',exact:true}).click();await expect(page.getByRole('button',{name:'Tandai sudah dibaca',exact:true})).toBeDisabled();
        await page.screenshot({path:path.join(output,`${width}-notifications.png`),fullPage:true});
        await page.locator('#navigation a[href="#ai"]').click();await page.locator('#page-content [name=enabled]').uncheck();
        await page.locator('#page-content [name=dailyRequestLimit]').fill('2');await page.getByRole('button',{name:'Simpan batas AI',exact:true}).click();
        await expect(page.locator('#page-content [name=enabled]')).not.toBeChecked();
        const blocked=await sharedCustomer.evaluate(async()=>{
          const s=(await (await fetch('/api/v1/session',{headers:{'X-AIODMA-Surface':'customer'}})).json()).data;
          return (await (await fetch('/api/v1/ai/chat',{method:'POST',headers:{'Content-Type':'application/json','X-AIODMA-Surface':'customer','X-CSRF-Token':s.csrfToken},body:JSON.stringify({messageId:crypto.randomUUID(),message:'Please recommend coffee',language:'en'})})).json()).data;
        });assert.equal(blocked.reason,'AI_DISABLED');assert.deepEqual(blocked.proposals,[]);
        for(const ctx of staffContexts)await ctx.close();
        console.log(`PASS ${liveUrl?'production':'local'} disposable outlet: guest unpaid receipt -> cashier synthetic settlement -> kitchen ready -> waiter served -> owner completed; offline read-only tracking/reconnect and pinned close, swipe dismissal survives real SSE, customer payment/status rendering, dark receipt/tracker, inbox acknowledgement, AI pause and permission guards`);
      }
      await page.locator('#navigation a[href="#onboarding"]').click();
      await page.getByRole('button', { name: 'Tarik publikasi', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Terbitkan cafe', exact: true })).toBeVisible();
      assert.equal(await sharedCustomer.evaluate(async()=> (await fetch('/api/v1/session',{headers:{'X-AIODMA-Surface':'customer'}})).status),401);
      if(process.env.ONBOARDING_ORDER_SMOKE==='1') {
        await sharedCustomer.locator('#btnCloseTrackerSheet').click();await expect(sharedCustomer.locator('#orderTrackerBackdrop')).not.toHaveClass(/open/);
        await sharedCustomer.locator('#btnHeaderOptions').click();await sharedCustomer.locator('#menuItemOpenTracker').click();await expect(sharedCustomer.locator('#customerV18Status')).toHaveAttribute('data-tone','error');await expect(sharedCustomer.locator('#menuItemOpenTracker')).not.toBeVisible();await expect(sharedCustomer.locator('#liveOrderActivityBanner')).not.toBeVisible();await expect(sharedCustomer.locator('#orderTrackerBackdrop')).not.toHaveClass(/open/);
      }
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
