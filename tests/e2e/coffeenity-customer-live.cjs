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
  async function capture(page,name){
    await page.evaluate(async()=>{
      const visible=[...document.images].filter(img=>{const r=img.getBoundingClientRect();return !img.hidden&&img.src&&r.width&&r.height&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;});
      await Promise.race([Promise.all(visible.map(img=>img.decode().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,5000))]);
      await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})));
    });
    await page.screenshot({path:path.join(output,name)});
  }
  try{
    for(const width of [320,390,1440]){
      const context=await browser.newContext({viewport:{width,height:844},hasTouch:true}),page=await context.newPage(),errors=[],mutations=[];
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
        const headerTargets=await page.locator('#mainHeaderBar .header-btn-circle').evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height,y:r.y};}));
        assert.ok(headerTargets.every(r=>r.width>=48&&r.height>=48&&Math.abs(r.y-headerTargets[0].y)<1));
        assert.equal(await page.locator('.catalog-scroll-area').evaluate(el=>getComputedStyle(el).scrollbarWidth),'none');
        const viewport=await page.locator('.app-host-container').boundingBox();assert.ok(Math.abs(viewport.width-width)<1&&Math.abs(viewport.height-844)<1);
        phase='menu';await capture(page,`${width}-menu.png`);
        await page.locator('.btn-add-product:not(:disabled)').first().click();await expect(page.locator('#modifierModalBackdrop.open')).toBeVisible();
        const target=await page.locator('#modifierModalBackdrop .v18-sheet-close').evaluate(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height};});assert.ok(target.width>=44&&target.height>=44);
        assert.equal(await page.locator('#modifierModalBackdrop .v18-sheet-grab').textContent(),'');
        await capture(page,`${width}-native-modifier.png`);
        await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})));});
        const box=await page.locator('#modifierModalBackdrop .v18-sheet-grab').boundingBox(),cdp=await context.newCDPSession(page),x=box.x+box.width/2,y=box.y+box.height/2;
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+120}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
        await expect(page.locator('#modifierModalBackdrop.open')).toHaveCount(0);
        await page.locator('#btnCatalogCartPill').click();await expect(page.locator('#cartBackdrop.open')).toBeVisible();
        assert.equal(await page.locator('#cartSheetTotal').evaluate(el=>el.closest('.cart-calc-box').hidden),true);
        await capture(page,`${width}-native-cart.png`);
        await page.keyboard.press('Escape');await expect(page.locator('#cartBackdrop.open')).toHaveCount(0);
        await page.locator('#btnHeaderOptions').click();await page.locator('#menuItemCustomerMemory').click();await expect(page.locator('#v18MemoryPreferences')).toBeVisible();
        await page.locator('.v18-memory-body').evaluate(el=>{el.scrollTop=el.scrollHeight;});
        const reachable=await page.locator('#btnCloseMemoryModal').evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.y>=0&&r.bottom<=innerHeight&&(hit===el||el.contains(hit));});assert.ok(reachable);
        await capture(page,`${width}-native-memory.png`);await page.keyboard.press('Escape');await expect(page.locator('#customerMemoryBackdropModal')).toHaveAttribute('aria-hidden','true');
        await page.locator('#btnHeaderThemeToggle').click();await capture(page,`${width}-dark-menu.png`);
        assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'),'#000000');
        await page.locator('.btn-add-product:not(:disabled)').first().click();await expect(page.locator('#modifierModalBackdrop.open')).toBeVisible();
        await capture(page,`${width}-dark-modifier.png`);await page.keyboard.press('Escape');await expect(page.locator('#modifierModalBackdrop.open')).toHaveCount(0);
        await page.locator('#btnHeaderOptions').click();await page.locator('#menuItemCustomerMemory').click();await expect(page.locator('#v18MemoryPreferences')).toBeVisible();
        await capture(page,`${width}-dark-memory.png`);await page.keyboard.press('Escape');await expect(page.locator('#customerMemoryBackdropModal')).toHaveAttribute('aria-hidden','true');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        assert.deepEqual(errors,[]);assert.deepEqual(mutations.filter(p=>p!=='/api/v1/session'),[]);
        console.log(`PASS Coffeenity ${width}: QR/session, ${products} catalog products, native touch dismissal/cart/memory/back/theme, no overflow/exceptions; no ordering/financial mutations`);
      }finally{await context.close();}
    }
    console.log('Evidence: '+output);
  }finally{await browser.close();}
}
main().catch(e=>{const error=String(e.message).split('\n')[0].replace(/https?:\/\/\S+/g,'[URL]').slice(0,180);console.error('Original cafe smoke failed; QR credentials withheld. '+JSON.stringify({phase,error,diagnostics}));process.exitCode=1;});
