'use strict';
// Deterministic browser contract tests, not evidence of live AI or PostgreSQL.
// CUSTOMER_V18_URL enables a separate real-server smoke with an authorized QR URL.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname,'../..');
const origin = 'http://localhost:8081';
const output = fs.mkdtempSync(path.join(os.tmpdir(),'aiodma-customer-v18-'));
const item = {id:'coffee',name:'Coffee <img src=x onerror=alert(1)>',desc:'Fresh coffee',category:'Coffee',price:3.5,available:true,image:'assets/products/kopi_milk_aren.jpg',
  modifierGroups:[{id:'milk',min:1,max:1,options:[{id:'oat',name:'Oat',price:.5},{id:'dairy',name:'Dairy',price:0}]}]};
const second = {id:'tea',name:'Tea',desc:'Green tea',category:'Tea',price:2,available:true,modifierGroups:[]};
const clone = value => structuredClone(value);
async function fixture(context) {
  const model = {authenticated:false,profile:{consent:false,preferences:[]},cart:{version:1,lines:[]},orders:[],keys:new Map(),requests:[],loseOrder:false,loseCart:false,conflict:false,quoteCount:0,aiMode:'cart'};
  const respond = (route,data,status=200) => route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:true,data})});
  const fail = (route,status,code) => route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:false,error:{code,message:code},requestId:'test-request'})});
  await context.route('**/*',async route => {
    const request=route.request(), url=new URL(request.url()), method=request.method();
    if(url.origin!==origin)return route.abort();
    const p=url.pathname;
    if(p.startsWith('/api/v1')) {
      const endpoint=p.slice(7), body=request.postDataJSON(), key=request.headers()['idempotency-key'];
      model.requests.push({endpoint,method,body,key});
      if(endpoint==='/menu')return respond(route,{merchant:{id:'fixture',name:'Fixture Cafe',currency:'BND',paymentMethods:['CASH','MANUAL_TRANSFER']},items:[item,second]});
      if(endpoint==='/session') {
        if(method==='POST'){assert.equal(body.token,'fixture-valid-qr-token');model.authenticated=true;}
        if(!model.authenticated)return fail(route,401,'SESSION_REQUIRED');
        return respond(route,{csrfToken:'fixture-csrf-session-1',tenantId:'fixture',tableId:5,role:'guest'});
      }
      if(!model.authenticated)return fail(route,401,'SESSION_REQUIRED');
      if(method!=='GET')assert.equal(request.headers()['x-csrf-token'],'fixture-csrf-session-1');
      if(endpoint==='/profile'){
        if(method==='PUT'){assert.equal(body.consent,true);model.profile=clone(body);}
        if(method==='DELETE')model.profile={consent:false,preferences:[]};
        return respond(route,model.profile);
      }
      if(endpoint==='/events')return route.fulfill({status:200,contentType:'text/event-stream',body:': connected\n\n'});
      if(endpoint==='/cart'&&method==='GET')return respond(route,model.cart);
      if(endpoint==='/cart') {
        assert.ok(key);if(model.keys.has(key))return respond(route,model.keys.get(key));
        if(model.conflict){model.conflict=false;model.cart.version++;return fail(route,409,'CART_STALE');}
        assert.equal(body.expectedVersion,model.cart.version);model.cart={version:model.cart.version+1,lines:body.lines};model.keys.set(key,clone(model.cart));
        if(model.loseCart){model.loseCart=false;return route.abort('failed');}return respond(route,model.cart);
      }
      if(endpoint==='/quotes') {
        model.quoteCount++;assert.equal(body.expectedVersion,model.cart.version);
        const items=model.cart.lines.map(line=>{const menu=line.menuId==='coffee'?item:second;const modifiers=menu.modifierGroups.flatMap(g=>g.options).filter(o=>line.optionIds.includes(o.id)).map(o=>({...o,priceMinor:o.price*100}));const unitPriceMinor=menu.price*100+modifiers.reduce((sum,o)=>sum+o.priceMinor,0);return {...line,name:menu.name,modifiers,unitPriceMinor,lineTotalMinor:unitPriceMinor*line.qty};});
        const subtotalMinor=items.reduce((sum,l)=>sum+l.lineTotalMinor,0);model.quote={id:crypto.randomUUID(),currency:'BND',items,subtotalMinor,taxMinor:40,serviceMinor:20,discountMinor:10,totalMinor:subtotalMinor+50,cartVersion:model.cart.version,expiresAt:new Date(Date.now()+300000).toISOString()};return respond(route,model.quote);
      }
      if(endpoint==='/orders'&&method==='POST') {
        assert.ok(key);assert.equal(body.confirmed,true);assert.equal(body.paymentMethod,'CASH');assert.equal(body.quoteId,model.quote.id);
        if(model.keys.has(key))return respond(route,model.keys.get(key));
        const order={...model.quote,id:crypto.randomUUID(),orderNumber:'FIXTURE1',table:'Meja 5',tableNum:5,status:'received',paymentStatus:'UNPAID',paymentMethod:body.paymentMethod,version:1,createdAt:new Date().toISOString()};model.orders.unshift(order);model.keys.set(key,order);model.cart={version:model.cart.version+1,lines:[]};
        if(model.loseOrder){model.loseOrder=false;return route.abort('failed');}return respond(route,order,201);
      }
      if(endpoint==='/orders')return respond(route,model.orders);
      if(endpoint.startsWith('/orders/'))return respond(route,model.orders.find(o=>o.id===endpoint.split('/').at(-1)));
      if(endpoint.startsWith('/submissions/')){const order=model.keys.get(endpoint.split('/').at(-1));return respond(route,{found:!!order,order:order||null});}
      if(endpoint==='/waiter-calls'){assert.ok(key);return respond(route,{id:'call',status:'pending'});}
      if(endpoint==='/ai/chat')return respond(route,{text:'<img src=x onerror=alert(1)>',mode:'degraded',recommendations:[{id:'tea'}],proposals:[{id:'proposal-id',name:model.aiMode==='checkout'?'present_checkout':'add_cart_items',args:{items:[{menuId:'tea',qty:1,optionIds:[]}],expectedVersion:model.cart.version}}]});
      if(endpoint==='/ai/proposals/proposal-id/confirm'){assert.ok(key);assert.ok(body.messageId);assert.equal(body.expectedVersion,model.cart.version);if(model.aiMode==='checkout')return respond(route,{action:'present_checkout'});model.cart={version:model.cart.version+1,lines:[...model.cart.lines,{menuId:'tea',qty:1,optionIds:[]}]};return respond(route,{action:'cart_updated',cart:model.cart});}
      return fail(route,404,'NOT_FOUND');
    }
    if(p==='/sw.js')return route.fulfill({status:404,body:''});
    let file=path.resolve(root,'.'+(p==='/'?'/index.html':p));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
    if(p==='/'||p==='/index.html')return route.fulfill({contentType:'text/html',body:fs.readFileSync(file,'utf8').replace('src="js/app.js"','src="js/customer-v18.js"').replace('</head>','<link rel="stylesheet" href="css/customer-v18.css"></head>')});
    const contentType=p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.jpg')?'image/jpeg':p.endsWith('.png')?'image/png':'application/octet-stream';return route.fulfill({contentType,body:fs.readFileSync(file)});
  });
  return model;
}
async function ready(page){await page.waitForFunction(()=>document.querySelector('#labelMenuTable').textContent==='Table 5'&&!document.querySelector('#customerV18Status').textContent.includes('SESSION_REQUIRED'));}
async function capture(page,name){
  await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})));});
  await page.screenshot({path:path.join(output,name)});
}
async function addCoffee(page){await page.locator('[data-menu-id="coffee"] .btn-add-product').click();assert.equal(await page.locator('#btnAddCustomizedToCart').isDisabled(),true);await page.locator('#modDynamicGroups input[value="oat"]').check();await page.locator('#btnAddCustomizedToCart').click();await page.waitForFunction(()=>document.querySelector('#catalogCartBadge').textContent==='1');}
async function contract(browser,width,height){
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});const model=await fixture(context),page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.goto(origin+'/?merchant=fixture&table=5&token=fixture-valid-qr-token');await ready(page);await page.locator('[data-lang="en-US"]').click();await page.locator('#qpLihatSemuaMenu').click();
    await capture(page,`${width}-light-menu.png`);
    assert.equal(await page.locator('#menuGridContainer .product-card').count(),2);await page.locator('#catalogSearchInput').fill('tea');assert.equal(await page.locator('#menuGridContainer .product-card').count(),1);await page.locator('#btnClearSearch').click();
    await addCoffee(page);assert.deepEqual(model.cart.lines,[{menuId:'coffee',qty:1,optionIds:['oat']}]);
    await page.locator('#btnCatalogCartPill').click();await page.locator('#cartSheetItemsList .stepper-btn').last().click();await page.waitForFunction(()=>document.querySelector('#catalogCartBadge').textContent==='2');
    await page.locator('#btnProceedToPayment').click();await page.waitForFunction(()=>!document.querySelector('#btnProcessPayment').disabled);assert.equal(model.orders.length,0);assert.match(await page.locator('#paySheetTotal').textContent(),/8\.50/);assert.match(await page.locator('#paymentItemsPreviewList').textContent(),/Oat/);
    await capture(page,`${width}-quote.png`);model.loseOrder=true;await page.locator('#btnProcessPayment').click();await page.waitForFunction(()=>!document.querySelector('#customerV18Status button').hidden);
    assert.equal(model.orders.length,1);await page.reload();await ready(page);await page.locator('#customerV18Status button').click();await page.waitForFunction(()=>document.querySelector('#screenOrderSuccess').classList.contains('active'));assert.equal(model.orders.length,1);assert.equal(model.requests.filter(r=>r.endpoint==='/orders'&&r.method==='POST').length,1);
    await page.locator('#btnSaveReceipt').click();assert.match(await page.locator('.receipt-success-text').textContent(),/UNPAID/);await page.screenshot({path:path.join(output,`${width}-receipt.png`)});
    await page.locator('#btnReceiptBackToHome').click();await page.locator('#chatInputText').fill('add tea');await page.locator('#btnChatSend').click();await page.waitForSelector('.v18-proposal');assert.equal(await page.locator('#chatMessageThread img[src="x"]').count(),0);assert.equal(model.cart.lines.length,0);
    await page.locator('.v18-proposal button').click();await page.waitForFunction(()=>document.querySelector('#catalogCartBadge').textContent==='1');assert.equal(model.cart.lines[0].menuId,'tea');
    model.aiMode='checkout';await page.locator('#chatInputText').fill('checkout');await page.locator('#btnChatSend').click();await page.waitForFunction(()=>document.querySelectorAll('.v18-proposal').length===2);await page.locator('.v18-proposal button').click();await page.waitForFunction(()=>!document.querySelector('#btnProcessPayment').disabled);assert.equal(model.orders.length,1);
    await page.keyboard.press('Escape');await page.locator('#btnHeaderThemeToggle').click();await page.locator('#btnFloatingCart').click();await capture(page,`${width}-dark-cart.png`);
    model.conflict=true;await page.locator('#cartSheetItemsList .stepper-btn').last().click();await page.waitForFunction(()=>document.querySelector('#customerV18Status').textContent.includes('CART_STALE'));assert.equal(model.cart.lines[0].qty,1);
    model.loseCart=true;await page.locator('#cartSheetItemsList .stepper-btn').last().click();await page.waitForFunction(()=>!document.querySelector('#customerV18Status button').hidden);assert.equal(model.cart.lines[0].qty,2);const pendingKey=model.requests.filter(r=>r.endpoint==='/cart'&&r.method==='PUT').at(-1).key;
    await page.locator('#customerV18Status button').click();await page.waitForFunction(()=>document.querySelector('#catalogCartBadge').textContent==='2');assert.equal(model.cart.lines[0].qty,2);assert.equal(model.requests.filter(r=>r.endpoint==='/cart'&&r.method==='PUT').at(-1).key,pendingKey);
    await page.keyboard.press('Escape');await page.locator('#btnHeaderOptions').click();await page.locator('#menuItemCallWaiter').click();await page.waitForFunction(()=>document.querySelector('#customerV18Status').textContent.includes('Waiter request sent'));
    await context.setOffline(true);await page.locator('#btnFloatingCart').click();assert.equal(await page.locator('#btnProceedToPayment').isDisabled(),true);await context.setOffline(false);
    await page.keyboard.press('Escape');await page.locator('#btnHeaderOptions').click();await page.locator('#menuItemCustomerMemory').click();
    await page.locator('#v18MemoryPreferences').fill('Less sugar\nNo dairy');
    assert.equal(await page.locator('.v18-memory-form [type="submit"]').isDisabled(),true);
    await page.locator('#v18MemoryConsent').check();await page.locator('.v18-memory-form [type="submit"]').click();
    await page.waitForFunction(()=>document.querySelector('#customerV18Status').textContent.includes('Preferences saved'));
    assert.deepEqual(model.profile,{consent:true,preferences:['Less sugar','No dairy']});
    await capture(page,`${width}-memory.png`);await page.locator('#btnResetMemoryProfile').click();
    await page.waitForFunction(()=>document.querySelector('#customerV18Status').textContent.includes('conversation deleted'));
    assert.deepEqual(model.profile,{consent:false,preferences:[]});assert.equal(await page.locator('#chatMessageThread').textContent(),'');
    await page.keyboard.press('Escape');assert.equal(await page.locator('#customerMemoryBackdropModal').getAttribute('aria-hidden'),'true');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
    console.log(`PASS contract ${width}x${height}: modifiers, quote-before-confirm, lost order recovery, receipt unpaid, AI confirmation/XSS, cart retry/conflict, waiter, offline`);
  } finally {await context.close();}
}
async function live(browser,url){
  // Only use with a disposable merchant/session: this intentionally creates an unpaid order.
  const parsed=new URL(url);assert.ok(['localhost','127.0.0.1'].includes(parsed.hostname),'Live smoke is local-only');
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();
  try {await page.goto(url);await page.waitForSelector('#customerV18Status',{state:'attached'});await page.waitForFunction(()=>/^Table \d+$/.test(document.querySelector('#labelMenuTable').textContent));await page.locator('[data-lang="en-US"]').click();await page.locator('#qpLihatSemuaMenu').click();await page.locator('.btn-add-product:not(:disabled)').first().click();
    const groups=page.locator('#modDynamicGroups fieldset');for(let i=0;i<await groups.count();i++){const field=groups.nth(i),bounds=(await field.locator('legend').textContent()).match(/\((\d+)-(\d+)\)/);for(let j=0;j<Number(bounds[1]);j++)await field.locator('input:not(:disabled)').nth(j).check();}
    await page.locator('#btnAddCustomizedToCart').click();await page.waitForFunction(()=>Number(document.querySelector('#catalogCartBadge').textContent)>0);await page.locator('#btnCatalogCartPill').click();await page.locator('#btnProceedToPayment').click();await page.waitForFunction(()=>!document.querySelector('#btnProcessPayment').disabled);await capture(page,'live-quote.png');
    await page.locator('#btnProcessPayment').click();await page.waitForFunction(()=>document.querySelector('#screenOrderSuccess').classList.contains('active'));await page.locator('#btnSaveReceipt').click();assert.match(await page.locator('.receipt-success-text').textContent(),/UNPAID/);console.log('PASS real local API: QR, menu, modifier, cart, quote, unpaid order, receipt');
  }finally{await context.close();}
}
async function main(url=process.env.CUSTOMER_V18_URL) {
  const candidates=[process.env.CUSTOMER_V18_BROWSER,await require('puppeteer').executablePath(),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean);
  const executablePath=candidates.find(file=>fs.existsSync(file));
  assert.ok(executablePath,'Configure CUSTOMER_V18_BROWSER with an installed Chromium executable');
  const browser=await chromium.launch({headless:true,executablePath});
  try {if(url)await live(browser,url);else for(const size of [[390,844],[1440,1000]])await contract(browser,...size);console.log('Screenshots: '+output);}
  finally{await browser.close();}
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={main};
