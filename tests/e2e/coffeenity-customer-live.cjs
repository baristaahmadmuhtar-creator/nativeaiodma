'use strict';
// Authorized original-cafe smoke: guest exchange and reads only, never a real order.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium,expect}=require('@playwright/test');
let phase='setup';
const diagnostics=[];
async function main(){
  const access=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../.local/production-access.json'),'utf8'));
  const link=access.customerLinks?.find(value=>value.merchant==='coffeenity');
  assert.ok(link,'A privately stored Coffeenity QR is required');
  assert.equal(new URL(link.url).origin,'https://nativeaiodma-v18.vercel.app');
  const executablePath=[await require('puppeteer').executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe',chromium.executablePath()].find(p=>fs.existsSync(p));
  const browser=await chromium.launch({executablePath,headless:true});
  const output=path.resolve('output/playwright/coffeenity-customer-'+Date.now());fs.mkdirSync(output,{recursive:true});
  try{
    for(const width of [320,390,1440]){
      const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage(),errors=[],mutations=[];
      page.on('pageerror',()=>errors.push('Browser exception'));
      page.on('response',async r=>{if(new URL(r.url()).pathname==='/api/v1/session'&&r.status()>=400){try{const e=await r.json();diagnostics.push({method:r.request().method(),status:r.status(),code:e.error?.code});}catch{diagnostics.push({status:r.status()});}}});
      page.on('request',r=>{const p=new URL(r.url()).pathname;if(r.method()!=='GET'&&p.startsWith('/api/v1'))mutations.push(p);if(p.startsWith('/api/v1'))diagnostics.push({request:p,method:r.method()});});
      try{
        phase='qr-navigation';await page.goto(link.url);await page.locator('[data-lang="en-US"]').click();await page.locator('#qpLihatSemuaMenu').click();
        await expect(page.locator('.btn-add-product').first()).toBeVisible();
        await page.waitForFunction(()=>document.querySelector('#btnAddCustomizedToCart').getAttribute('aria-busy')==='false');
        assert.equal(await page.evaluate(()=>new URL(location.href).searchParams.has('token')),false);
        phase='session';const session=await page.evaluate(async()=>{const r=await fetch('/api/v1/session',{headers:{'X-AIODMA-Surface':'customer'}});const e=await r.json();return {status:r.status,tenant:e.data?.tenantId,table:e.data?.tableId,role:e.data?.role};});
        diagnostics.push({session});
        assert.deepEqual(session,{status:200,tenant:'coffeenity',table:link.table,role:'guest'});
        const products=await page.locator('#menuGridContainer .product-card').count();assert.ok(products>0);
        phase='menu';await page.screenshot({path:path.join(output,`${width}-menu.png`)});
        await page.locator('.btn-add-product:not(:disabled)').first().click();await expect(page.locator('#modifierModalBackdrop.open')).toBeVisible();
        const target=await page.locator('#modifierModalBackdrop .v18-sheet-close').evaluate(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height};});assert.ok(target.width>=44&&target.height>=44);
        await page.keyboard.press('Escape');await expect(page.locator('#modifierModalBackdrop.open')).toHaveCount(0);
        await page.locator('#btnCatalogCartPill').click();await expect(page.locator('#cartBackdrop.open')).toBeVisible();
        await page.keyboard.press('Escape');await expect(page.locator('#cartBackdrop.open')).toHaveCount(0);
        await page.locator('#btnHeaderThemeToggle').click();await page.screenshot({path:path.join(output,`${width}-dark-menu.png`)});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        assert.deepEqual(errors,[]);assert.deepEqual(mutations.filter(p=>p!=='/api/v1/session'),[]);
        console.log(`PASS Coffeenity ${width}: QR/session, ${products} catalog products, modal/back/cart/theme, no overflow/exceptions; no ordering/financial mutations`);
      }finally{await context.close();}
    }
    console.log('Evidence: '+output);
  }finally{await browser.close();}
}
main().catch(e=>{const error=String(e.message).split('\n')[0].replace(/https?:\/\/\S+/g,'[URL]').slice(0,180);console.error('Original cafe smoke failed; QR credentials withheld. '+JSON.stringify({phase,error,diagnostics}));process.exitCode=1;});
