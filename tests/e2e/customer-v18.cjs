'use strict';
// Deterministic browser contract tests, not evidence of live AI or PostgreSQL.
// CUSTOMER_V18_URL enables a separate real-server smoke with an authorized QR URL.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname,'../..');
const origin = 'https://localhost:8081';
const output = fs.mkdtempSync(path.join(os.tmpdir(),'aiodma-customer-v18-'));
const item = {id:'coffee',name:'Coffee <img src=x onerror=alert(1)>',desc:'Fresh coffee',category:'Coffee',price:3.5,available:true,image:'assets/products/kopi_milk_aren.jpg',
  modifierGroups:[{id:'milk',min:1,max:1,options:[{id:'oat',name:'Oat',price:.5},{id:'dairy',name:'Dairy',price:0}]}]};
const second = {id:'tea',name:'Tea',desc:'Green tea',category:'Tea',price:2,available:true,modifierGroups:[]};
const clone = value => structuredClone(value);
async function fixture(context) {
  const model = {items:[item,second],authenticated:false,profile:{consent:false,preferences:[]},cart:{version:1,lines:[]},orders:[],keys:new Map(),requests:[],loseOrder:false,loseCart:false,conflict:false,quoteCount:0,aiMode:'cart'};
  const respond = (route,data,status=200) => route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:true,data})});
  const fail = (route,status,code) => route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:false,error:{code,message:code},requestId:'test-request'})});
  await context.route('**/*',async route => {
    const request=route.request(), url=new URL(request.url()), method=request.method();
    if(url.origin!==origin)return route.abort();
    const p=url.pathname;
    if(p.startsWith('/api/v1')) {
      const endpoint=p.slice(7), body=request.postDataJSON(), key=request.headers()['idempotency-key'];
      model.requests.push({endpoint,method,body,key});
      if(endpoint==='/menu')return respond(route,{merchant:{id:'fixture',name:'Fixture Cafe',currency:'BND',orderingPaused:!!model.orderingPaused,paymentMethods:model.paymentMethods||['CASH','MANUAL_TRANSFER']},items:model.items});
      if(endpoint==='/session') {
        if(method==='POST'){assert.equal(body.token,'fixture-valid-qr-token');model.authenticated=true;}
        if(!model.authenticated)return fail(route,401,'SESSION_REQUIRED');
        if(model.sessionGate){model.onDelayedSession?.();let timeout;try{await Promise.race([model.sessionGate,new Promise(resolve=>{timeout=setTimeout(resolve,5000);})]);}finally{clearTimeout(timeout);}}
        if(model.sessionDelay){model.delayedSessions=(model.delayedSessions||0)+1;await new Promise(resolve=>setTimeout(resolve,model.sessionDelay));}
        return respond(route,{csrfToken:model.csrfToken||'fixture-csrf-session-1',tenantId:'fixture',tableId:5,role:'guest'});
      }
      if(!model.authenticated)return fail(route,401,'SESSION_REQUIRED');
      if(method!=='GET')assert.equal(request.headers()['x-csrf-token'],model.csrfToken||'fixture-csrf-session-1');
      if(endpoint==='/profile'){
        if(model.profileDelay)await new Promise(resolve=>setTimeout(resolve,model.profileDelay));
        if(method==='PUT'){assert.equal(body.consent,true);model.profile=clone(body);}
        if(method==='DELETE')model.profile={consent:false,preferences:[]};
        return respond(route,model.profile);
      }
      if(endpoint==='/events'){const burst=model.menuBurst||0;model.menuBurst=0;return route.fulfill({status:200,contentType:'text/event-stream',body:': connected\n\n'+'data: {"type":"MENU_UPDATED"}\n\n'.repeat(burst)});}
      if(endpoint==='/cart'&&method==='GET'){if(model.cartDelay)await new Promise(resolve=>setTimeout(resolve,model.cartDelay));return respond(route,model.cart);}
      if(endpoint==='/cart') {
        assert.ok(key);if(model.keys.has(key))return respond(route,model.keys.get(key));
        if(model.conflict){model.conflict=false;model.cart.version++;return fail(route,409,'CART_STALE');}
        assert.equal(body.expectedVersion,model.cart.version);model.cart={version:model.cart.version+1,lines:body.lines};model.keys.set(key,clone(model.cart));
        if(model.loseCart){model.loseCart=false;return route.abort('failed');}return respond(route,model.cart);
      }
      if(endpoint==='/quotes') {
        model.quoteCount++;assert.equal(body.expectedVersion,model.cart.version);
        if(model.quoteDelay)await new Promise(resolve=>setTimeout(resolve,model.quoteDelay));
        const items=model.cart.lines.map(line=>{const menu=line.menuId==='coffee'?item:second;const modifiers=menu.modifierGroups.flatMap(g=>g.options).filter(o=>line.optionIds.includes(o.id)).map(o=>({...o,priceMinor:o.price*100}));const unitPriceMinor=menu.price*100+modifiers.reduce((sum,o)=>sum+o.priceMinor,0);return {...line,name:menu.name,modifiers,unitPriceMinor,lineTotalMinor:unitPriceMinor*line.qty};});
        const subtotalMinor=items.reduce((sum,l)=>sum+l.lineTotalMinor,0);model.quote={id:crypto.randomUUID(),currency:'BND',items,subtotalMinor,taxMinor:40,serviceMinor:20,discountMinor:10,totalMinor:subtotalMinor+50,cartVersion:model.cart.version,expiresAt:new Date(Date.now()+(model.quoteLifetime||300000)).toISOString()};return respond(route,model.quote);
      }
      if(endpoint==='/orders'&&method==='POST') {
        assert.ok(key);assert.equal(body.confirmed,true);assert.equal(body.paymentMethod,'CASH');assert.equal(body.quoteId,model.quote.id);
        if(model.keys.has(key))return respond(route,model.keys.get(key));
        const order={...model.quote,id:crypto.randomUUID(),merchantId:'fixture',orderNumber:'FIXTURE1',table:'Meja 5',tableNum:5,status:'received',paymentStatus:'UNPAID',paymentMethod:body.paymentMethod,version:1,createdAt:new Date().toISOString()};model.orders.unshift(order);model.keys.set(key,order);model.cart={version:model.cart.version+1,lines:[]};
        if(model.loseOrder){model.loseOrder=false;return route.abort('failed');}
        if(model.malformedOrder){model.malformedOrder=false;return respond(route,{...order,items:null},201);}return respond(route,order,201);
      }
      if(endpoint==='/orders')return respond(route,model.orders);
      if(endpoint.startsWith('/orders/')){const order=model.orders.find(o=>o.id===endpoint.split('/').at(-1));return respond(route,model.badOrderRead?{...order,items:null}:order);}
      if(endpoint.startsWith('/submissions/')){const order=model.keys.get(endpoint.split('/').at(-1));if(model.malformedLookup){model.malformedLookup=false;return respond(route,{found:true,order:{...order,items:null}});}return respond(route,{found:!!order,order:order||null});}
      if(endpoint==='/waiter-calls'){assert.ok(key);return respond(route,{id:'call',status:'pending'});}
      if(endpoint==='/ai/chat')return respond(route,{text:'<img src=x onerror=alert(1)>',mode:'degraded',recommendations:[{id:'tea'}],proposals:[{id:'proposal-id',name:model.aiMode==='checkout'?'present_checkout':'add_cart_items',args:{items:[{menuId:'tea',qty:1,optionIds:[]}],expectedVersion:model.cart.version}}]});
      if(endpoint==='/ai/proposals/proposal-id/confirm'){assert.ok(key);assert.ok(body.messageId);assert.equal(body.expectedVersion,model.cart.version);if(model.aiMode==='checkout')return respond(route,{action:'present_checkout'});model.cart={version:model.cart.version+1,lines:[...model.cart.lines,{menuId:'tea',qty:1,optionIds:[]}]};return respond(route,{action:'cart_updated',cart:model.cart});}
      return fail(route,404,'NOT_FOUND');
    }
    if(p==='/sw.js')return route.fulfill({status:404,body:''});
    const base=(p==='/'||p==='/index.html')?root:path.join(root,'public');
    let file=path.resolve(base,'.'+(p==='/'?'/index.html':p));
    if(!file.startsWith(base+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
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
async function addCoffee(page,inspect){await page.locator('[data-menu-id="coffee"] .btn-add-product').click();assert.equal(await page.locator('#btnAddCustomizedToCart').isDisabled(),true);if(inspect)await inspect();await page.locator('#modDynamicGroups input[value="oat"]').check();await page.locator('#btnAddCustomizedToCart').click();await page.waitForFunction(()=>document.querySelector('#catalogCartBadge').textContent==='1');}
async function contract(browser,width,height){
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});const model=await fixture(context),page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.goto(origin+'/?merchant=fixture&table=5&token=fixture-valid-qr-token');await ready(page);
    assert.equal(await page.locator('#cartSheetTitle').textContent(),'Keranjang Pesanan Meja 5');
    assert.equal(await page.locator('.lang-table-badge-pill').getAttribute('aria-label'),'Nomor Meja Pelanggan: Meja 5');
    await page.locator('[data-lang="en-US"]').click();
    assert.equal(await page.locator('#cartSheetTitle').textContent(),'Table 5 order cart');
    assert.equal(await page.locator('.lang-table-badge-pill').getAttribute('aria-label'),'Customer table number: Table 5');
    await page.locator('#qpLihatSemuaMenu').click();
    await page.goBack(); await page.waitForFunction(()=>document.querySelector('#screenChatCashier').classList.contains('active'));
    await page.goForward(); await page.waitForFunction(()=>document.querySelector('#screenMenuCatalog').classList.contains('active'));
    await page.locator('#btnModeTrigger').click(); await page.locator('#btnHeaderOptions').click();
    assert.equal(await page.locator('#btnModeTrigger').getAttribute('aria-expanded'),'false');
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#btnHeaderOptions').getAttribute('aria-expanded'),'false');
    assert.equal(await page.locator('#actionPopupMenu').evaluate(el=>el.inert),true);
    await page.locator('#btnHeaderOptions').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>!!document.activeElement.closest('#actionPopupMenu')),true);await page.keyboard.press('End');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'btnHeaderOptions');
    await page.locator('.cat-pill-btn').first().focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('.cat-pill-btn[aria-selected="true"]').textContent(),'Coffee');
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-selected')),'true');
    await page.keyboard.press('Home'); assert.equal(await page.locator('#menuGridContainer .product-card').count(),2);
    await page.locator('[data-menu-id="coffee"] .btn-add-product').click();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(()=>!!document.activeElement.closest('#modifierModalBackdrop')),true);
    await page.goBack(); await page.waitForSelector('#modifierModalBackdrop.open',{state:'hidden'});
    assert.equal(await page.evaluate(()=>document.activeElement.closest('[data-menu-id]')?.dataset.menuId),'coffee');
    assert.equal(await page.locator('#mainHeaderBar').evaluate(el=>el.inert),false);
    await capture(page,`${width}-light-menu.png`);
    assert.equal(await page.locator('#menuGridContainer .product-card').count(),2);await page.locator('#catalogSearchInput').fill('tea');assert.equal(await page.locator('#menuGridContainer .product-card').count(),1);await page.locator('#btnClearSearch').click();
    assert.equal(await page.locator('[data-menu-id="tea"] img').getAttribute('src'),null);assert.equal(await page.locator('[data-menu-id="tea"] img').evaluate(el=>el.hidden),true);
    await addCoffee(page);assert.deepEqual(model.cart.lines,[{menuId:'coffee',qty:1,optionIds:['oat']}]);
    model.quoteDelay=400; const beforeQuote=model.quoteCount;
    await page.locator('#btnCatalogCartPill').click();await page.locator('#btnProceedToPayment').click();
    await require('@playwright/test').expect.poll(()=>model.quoteCount).toBeGreaterThan(beforeQuote);
    await page.keyboard.press('Escape');await page.waitForSelector('#cartBackdrop.open',{state:'hidden'});
    await page.waitForFunction(()=>!document.querySelector('#btnProceedToPayment').disabled);
    assert.equal(await page.locator('#paymentBackdrop').getAttribute('aria-hidden'),'true');model.quoteDelay=0;
    await page.locator('#btnCatalogCartPill').click();await page.locator('#cartSheetItemsList .stepper-btn').last().click();await page.waitForFunction(()=>document.querySelector('#catalogCartBadge').textContent==='2');
    await page.locator('#btnProceedToPayment').click();await page.waitForFunction(()=>!document.querySelector('#btnProcessPayment').disabled);assert.equal(model.orders.length,0);assert.match(await page.locator('#paySheetTotal').textContent(),/8\.50/);assert.match(await page.locator('#paymentItemsPreviewList').textContent(),/Oat/);
    await capture(page,`${width}-quote.png`);model.loseOrder=true;await page.locator('#btnProcessPayment').click();await page.waitForFunction(()=>!document.querySelector('#customerV18Status button').hidden);
    assert.equal(model.orders.length,1);await page.reload();await ready(page);await page.locator('#customerV18Status button').click();await page.waitForFunction(()=>document.querySelector('#screenOrderSuccess').classList.contains('active'));assert.equal(model.orders.length,1);assert.equal(model.requests.filter(r=>r.endpoint==='/orders'&&r.method==='POST').length,1);
    await page.locator('#btnSaveReceipt').click();assert.match(await page.locator('.receipt-success-text').textContent(),/UNPAID/);await page.screenshot({path:path.join(output,`${width}-receipt.png`)});
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).position),'static');
    assert.equal(await page.locator('#screenThermalReceipt').evaluate(el=>getComputedStyle(el).overflow),'visible');
    assert.equal(await page.locator('#btnReceiptBackToHome').isVisible(),false);
    const pdf=await page.pdf({path:path.join(output,`${width}-receipt.pdf`),format:'A4'});assert.equal(pdf.subarray(0,4).toString(),'%PDF');
    await page.emulateMedia({media:'screen'});
    await page.locator('#btnReceiptBackToHome').click();await page.locator('#chatInputText').fill('add tea');await page.locator('#btnChatSend').click();await page.waitForSelector('.v18-proposal');assert.equal(await page.locator('#chatMessageThread img[src="x"]').count(),0);assert.equal(model.cart.lines.length,0);
    await page.locator('.v18-proposal button').click();await page.waitForFunction(()=>document.querySelector('#catalogCartBadge').textContent==='1');assert.equal(model.cart.lines[0].menuId,'tea');
    model.aiMode='checkout';await page.locator('#chatInputText').fill('checkout');await page.locator('#btnChatSend').click();await page.waitForFunction(()=>document.querySelectorAll('.v18-proposal').length===2);await page.locator('.v18-proposal button').click();await page.waitForFunction(()=>!document.querySelector('#btnProcessPayment').disabled);assert.equal(model.orders.length,1);
    await page.keyboard.press('Escape');await page.locator('#btnHeaderThemeToggle').click();await page.locator('#btnFloatingCart').click();await capture(page,`${width}-dark-cart.png`);
    assert.equal(await page.locator('#cartSheetItemsList .stepper-qty-val').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
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
    assert.equal(await page.locator('#customerMemoryBackdropModal .mobile-qr-card-modal').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(28, 28, 30)');
    assert.equal(await page.locator('#btnResetMemoryProfile').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(28, 28, 30)');
    await capture(page,`${width}-memory.png`);
    await page.goBack(); await page.waitForSelector('#customerMemoryBackdropModal[aria-hidden="false"]',{state:'hidden'});
    await page.goForward(); await page.waitForSelector('#customerMemoryBackdropModal[aria-hidden="false"]');
    await page.locator('#btnResetMemoryProfile').click();
    assert.equal(await page.locator('#v18MemoryPreferences').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(28, 28, 30)');
    await page.waitForFunction(()=>document.querySelector('#customerV18Status').textContent.includes('conversation deleted'));
    assert.deepEqual(model.profile,{consent:false,preferences:[]});assert.equal(await page.locator('#chatMessageThread').textContent(),'');
    await page.keyboard.press('Escape');assert.equal(await page.locator('#customerMemoryBackdropModal').getAttribute('aria-hidden'),'true');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
    console.log(`PASS contract ${width}x${height}: modifiers, quote-before-confirm, lost order recovery, receipt unpaid, AI confirmation/XSS, cart retry/conflict, waiter, offline`);
  } catch(error) { await capture(page,`${width}-failure.png`);console.log('Failure',JSON.stringify({errors,cart:model.cart,requests:model.requests.slice(-6),ui:await page.evaluate(()=>({active:document.activeElement.id,status:document.querySelector('#customerV18Status').textContent,open:[...document.querySelectorAll('.bottom-sheet-backdrop.open')].map(el=>({id:el.id,visibility:getComputedStyle(el).visibility}))}))}));console.log('Screenshots: '+output);throw error; } finally {await context.close();}
}
async function scrolling(browser) {
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),model=await fixture(context),page=await context.newPage();
  model.items=Array.from({length:36},(_,index)=>({...second,id:`item_${index}`,name:`Menu ${index}`,category:`Category ${index%9}`,image:item.image,modifierGroups:[{id:'extras',name:'Extras',min:0,max:1,options:Array.from({length:24},(_,i)=>({id:`extra_${i}`,name:`Extra ${i}`,price:0}))}]}));
  try {
    await page.goto(origin+'/?merchant=fixture&table=5&token=fixture-valid-qr-token');await ready(page);
    await page.locator('[data-lang="en-US"]').click();await page.locator('#qpLihatSemuaMenu').click();
    await page.locator('#catalogScrollArea').evaluate(el=>{el.scrollTop=600;});
    const position=await page.locator('#catalogScrollArea').evaluate(el=>el.scrollTop);assert.ok(position>0);
    const visibleButton=page.locator('[data-menu-id="item_8"] .btn-add-product');await visibleButton.click();
    const beforeSheet=await page.locator('#catalogScrollArea').evaluate(el=>el.scrollTop);
    await page.locator('#modOptionsBody').hover(); await page.mouse.wheel(0,650);
    await require('@playwright/test').expect.poll(()=>page.locator('#modOptionsBody').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
    await capture(page,'390-long-modifiers.png');await page.keyboard.press('Escape');await page.waitForSelector('#modifierModalBackdrop.open',{state:'hidden'});
    assert.equal(await page.locator('#catalogScrollArea').evaluate(el=>el.scrollTop),beforeSheet);
    await page.locator('#btnHeaderBack').click();await page.goBack();await page.waitForFunction(()=>document.querySelector('#screenMenuCatalog').classList.contains('active'));
    assert.equal(await page.locator('#catalogScrollArea').evaluate(el=>el.scrollTop),beforeSheet);
    console.log('PASS long catalog/modifier scrolling, modal return and browser-back scroll preservation');
  }finally{await context.close();}
}
async function reachable(page,selector) {
  await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})));});
  const result=await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {within:r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,hit:hit===el||el.contains(hit),x:r.x,y:r.y,width:r.width,height:r.height};});
  assert.ok(result.within&&result.hit,`${selector} is visible and not occluded: ${JSON.stringify(result)}`);
  assert.ok(result.height>=44&&result.width>=44,`${selector} touch target`);
}
async function refinement(browser,width,height) {
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block',reducedMotion:width===320?'reduce':'no-preference'}),model=await fixture(context),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(()=>{localStorage.setItem('aiodma:v18:language',JSON.stringify({bad:true}));localStorage.setItem('aiodma:v18:theme',JSON.stringify(['invalid']));});
  model.items=[{...clone(item),stock:2,name:'Coffee '+ 'LongName'.repeat(12),desc:'Long description '.repeat(30)},second];
  try {
    await page.goto(origin+'/?merchant=fixture&table=5&token=fixture-valid-qr-token');await ready(page);
    assert.equal(await page.locator('html').getAttribute('lang'),'id');assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
    await page.evaluate(async()=>{const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('fixture-csrf-session-1'));const ns='aiodma:v18:fixture:'+Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,'0')).join('');localStorage.setItem(ns+':pending',JSON.stringify({kind:'order',path:'/admin/ai-policy',method:'PUT',body:{enabled:false},key:crypto.randomUUID()}));});
    await page.reload();await ready(page);assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.endsWith(':pending'))),false);
    assert.equal(model.requests.some(r=>r.endpoint==='/admin/ai-policy'),false);
    if(width===320) {
      await page.evaluate(async()=>{const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('fixture-csrf-session-1'));const key='aiodma:v18:fixture:'+Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,'0')).join('')+':pending';localStorage.setItem(key,JSON.stringify({kind:'cart',path:'/cart',method:'PUT',body:{expectedVersion:1,lines:[null]},key:crypto.randomUUID()}));});
      await page.reload();await ready(page);assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.endsWith(':pending'))),false);
    }
    await page.locator('[data-lang="en-US"]').click();await page.locator('#qpLihatSemuaMenu').click();
    for(const id of ['btnHeaderBack','btnModeTrigger','btnHeaderLangToggle','btnHeaderThemeToggle','btnHeaderOptions'])await reachable(page,'#'+id);
    await page.locator('[data-menu-id="coffee"] .btn-add-product').click();await page.locator('#modDynamicGroups input[value="oat"]').check();
    assert.equal(await page.locator('#btnModMinus').isDisabled(),true);await page.locator('#btnModPlus').click();assert.equal(await page.locator('#btnModPlus').isDisabled(),true);
    await reachable(page,'#btnAddCustomizedToCart');await reachable(page,'#modifierModalBackdrop .v18-sheet-close');
    await capture(page,`${width}-refined-long-modifier.png`);
    await page.locator('#btnAddCustomizedToCart').click();await page.waitForSelector('#modifierModalBackdrop.open',{state:'hidden'});
    await page.locator('#btnCatalogCartPill').click();assert.equal(await page.locator('#cartSheetItemsList .stepper-btn').last().isDisabled(),true);
    // Long summaries may scroll, but cannot squeeze the CTA or any row to zero.
    await page.locator('#btnProceedToPayment').scrollIntoViewIfNeeded();await reachable(page,'#btnProceedToPayment');
    await page.locator('#btnProceedToPayment').click();await page.waitForFunction(()=>!document.querySelector('#btnProcessPayment').disabled);
    await page.goBack();await page.waitForSelector('#cartBackdrop.open');assert.equal(await page.locator('#paymentBackdrop').getAttribute('aria-hidden'),'true');
    await page.goForward();await page.waitForSelector('#paymentBackdrop.open');
    model.quoteLifetime=450;
    await page.keyboard.press('Escape');await page.waitForSelector('#cartBackdrop.open');await page.locator('#btnProceedToPayment').click();
    await page.waitForFunction(()=>!document.querySelector('#btnRefreshQuote').hidden);assert.equal(await page.locator('#btnProcessPayment').isDisabled(),true);
    model.quoteLifetime=300000;await page.locator('#btnRefreshQuote').click();await page.waitForFunction(()=>!document.querySelector('#btnProcessPayment').disabled);
    await page.locator('[data-pm="CASH"]').focus();await page.keyboard.press('Home');assert.equal(await page.locator('[data-pm="MANUAL_TRANSFER"]').getAttribute('aria-checked'),'true');
    await page.keyboard.press('End');assert.equal(await page.locator('[data-pm="CASH"]').getAttribute('aria-checked'),'true');
    // Returning through history to an invalid quote offers a fresh canonical review.
    await context.setOffline(true);await page.waitForFunction(()=>!document.querySelector('#btnRefreshQuote').hidden);await context.setOffline(false);
    await page.waitForFunction(()=>!document.querySelector('#btnRefreshQuote').disabled);await page.locator('#btnRefreshQuote').click();await page.waitForFunction(()=>!document.querySelector('#btnProcessPayment').disabled);
    await page.locator('#btnProcessPayment').scrollIntoViewIfNeeded();await reachable(page,'#btnProcessPayment');
    await page.keyboard.press('Escape');await page.waitForSelector('#cartBackdrop.open');await page.keyboard.press('Escape');await page.waitForSelector('#cartBackdrop.open',{state:'hidden'});
    await page.locator('#btnHeaderBack').click();
    model.profileDelay=500;await page.locator('#btnHeaderOptions').click();await page.locator('#menuItemCustomerMemory').click();await page.waitForSelector('#customerMemoryBackdropModal[aria-hidden="false"]');
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#btnChatSend').getAttribute('aria-busy')||document.querySelector('#btnChatSend').getAttribute('aria-busy')==='false');
    assert.equal(await page.locator('#v18MemoryPreferences').count(),0);assert.equal(await page.locator('#customerMemoryBackdropModal').getAttribute('aria-hidden'),'true');model.profileDelay=0;
    model.sessionDelay=400;await page.locator('#chatInputText').fill('original draft');await page.locator('#btnChatSend').click();await page.locator('#chatInputText').fill('next draft');
    await page.waitForSelector('.v18-proposal');assert.equal(model.requests.filter(r=>r.endpoint==='/ai/chat').at(-1).body.message,'original draft');assert.equal(await page.locator('#chatInputText').inputValue(),'next draft');model.sessionDelay=0;
    await page.setViewportSize({width,height:Math.min(height,360)});await page.waitForFunction(h=>parseFloat(document.documentElement.style.getPropertyValue('--app-height'))===h,Math.min(height,360));await reachable(page,'#chatInputText');await reachable(page,'#btnFloatingCart');
    await capture(page,`${width}-refined-keyboard-height.png`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
    console.log(`PASS refinement ${width}x${height}: corrupt preferences/replay, long text, stock bounds, hit targets, payment back/forward/review, late memory, chat draft, reduced viewport`);
  } catch(e) {await capture(page,`${width}-refinement-failure.png`);console.log('Refinement evidence: '+output);throw e;} finally {await context.close();}
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
async function storageBoundaries(browser) {
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),model=await fixture(context),page=await context.newPage(),errors=[];
  model.paymentMethods=['CASH'];model.menuBurst=80;page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto(origin+'/?merchant=fixture&table=5&token=fixture-valid-qr-token');await ready(page);await page.locator('[data-lang="en-US"]').click();await page.locator('#qpLihatSemuaMenu').click();
    await require('@playwright/test').expect.poll(()=>model.requests.filter(r=>r.endpoint==='/menu').length).toBeGreaterThan(1);
    await page.waitForFunction(()=>document.querySelector('#btnAddCustomizedToCart').getAttribute('aria-busy')==='false');assert.ok(model.requests.filter(r=>r.endpoint==='/menu').length<10,'80 catalog events are coalesced, not 80 serialized menu reads');
    await page.locator('[data-menu-id="tea"] .btn-add-product').click();
    await page.evaluate(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new Error('blocked');};});
    await page.locator('#btnAddCustomizedToCart').click();await page.waitForFunction(()=>document.querySelector('#customerV18Status').textContent.includes('Browser storage is unavailable'));
    assert.equal(model.requests.filter(r=>r.endpoint==='/cart'&&r.method==='PUT').length,0);
    await page.evaluate(()=>{Storage.prototype.setItem=window.originalSet;});await page.locator('#btnAddCustomizedToCart').click();await page.waitForSelector('#modifierModalBackdrop.open',{state:'hidden'});
    await page.locator('#btnCatalogCartPill').click();await page.locator('#btnClearCart').click();await page.waitForFunction(()=>document.querySelector('#catalogCartBadge').textContent==='0');assert.equal(model.cart.lines.length,0);
    await page.keyboard.press('Escape');await page.locator('[data-menu-id="tea"] .btn-add-product').click();await page.locator('#btnAddCustomizedToCart').click();await page.waitForSelector('#modifierModalBackdrop.open',{state:'hidden'});
    await page.locator('#btnCatalogCartPill').click();await page.locator('#btnProceedToPayment').click();await page.waitForFunction(()=>!document.querySelector('#btnProcessPayment').disabled);
    assert.equal(await page.locator('.payment-method-card:visible').count(),1);assert.equal(await page.locator('[data-pm="CASH"]').getAttribute('aria-checked'),'true');
    await page.evaluate(()=>{Storage.prototype.removeItem=()=>{throw new Error('cleanup blocked');};});
    await page.locator('#btnProcessPayment').click();await page.waitForFunction(()=>document.querySelector('#screenOrderSuccess').classList.contains('active'));assert.equal(model.orders.length,1);
    await page.reload();await ready(page);await page.locator('#customerV18Status button').click();await page.waitForFunction(()=>document.querySelector('#screenOrderSuccess').classList.contains('active'));
    assert.equal(model.orders.length,1);assert.equal(model.requests.filter(r=>r.endpoint==='/orders'&&r.method==='POST').length,1);assert.deepEqual(errors,[]);
    console.log('PASS storage/replay boundaries: catalog burst coalesced, no mutation without durable storage, clear cart, configured payment only, committed order survives cleanup failure and reconciles once');
  }finally{await context.close();}
}
async function nativeLayers(browser,width,height) {
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,serviceWorkers:'block',reducedMotion:width===320?'reduce':'no-preference'}),model=await fixture(context),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  model.items=[{...clone(item),image:'/assets/products/kopi_milk_aren.jpg',name:'Pot of Artisan House Coffee with Oat Milk'},second];
  async function drag(selector,dy,slow=false) {
    await reachable(page,selector);const box=await page.locator(selector).boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height/2+dy,{steps:8});
    if(slow)await new Promise(resolve=>setTimeout(resolve,220));await page.mouse.up();
  }
  async function ring(selector) {
    await page.keyboard.press('Tab');await page.locator(selector).focus();
    const style=await page.locator(selector).evaluate(el=>{const s=getComputedStyle(el);return {width:s.outlineWidth,style:s.outlineStyle};});
    assert.deepEqual(style,{width:'2px',style:'solid'},selector+' has a visible keyboard focus indicator');
  }
  try {
    await page.goto(origin+'/?merchant=fixture&table=5&token=fixture-valid-qr-token');await ready(page);await page.locator('[data-lang="en-US"]').click();
    await ring('#btnHeaderThemeToggle');await page.locator('#qpLihatSemuaMenu').click();await ring('#catalogSearchInput');
    const searchWidth=await page.locator('#catalogSearchInput').evaluate(el=>el.getBoundingClientRect().width);assert.ok(searchWidth>=120,'Search retains usable width: '+searchWidth);
    await capture(page,`${width}-native-menu.png`);
    await page.locator('#catalogSearchInput').fill('Coffee');await reachable(page,'#btnClearSearch');await page.locator('#btnClearSearch').click();
    await page.locator('#btnModeTrigger').click();assert.equal(await page.locator('#optModeMenu').getAttribute('aria-checked'),'true');assert.equal(await page.locator('#optModeChat .mode-option-check').evaluate(el=>getComputedStyle(el).opacity),'0');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'optModeChat');await ring('#optModeMenu');await page.keyboard.press('Escape');
    await page.locator('#btnHeaderOptions').click();await page.locator('#catalogSearchInput').focus();assert.equal(await page.locator('#actionPopupMenu').getAttribute('aria-hidden'),'true');
    await addCoffee(page);await page.waitForFunction(()=>document.querySelector('#customerV18Status').dataset.tone==='success'&&!document.querySelector('#customerV18Status').hidden);
    await capture(page,`${width}-native-feedback.png`);
    assert.equal(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--notice-height')),'0px');
    await page.waitForFunction(()=>document.querySelector('#customerV18Status').hidden);
    await page.locator('#btnCatalogCartPill').click();assert.equal(await page.locator('#cartSheetTotal').evaluate(el=>el.closest('.cart-calc-box').hidden),true);
    const handle='#cartBackdrop .v18-sheet-grab';assert.equal(await page.locator(handle).textContent(),'');await ring(handle);
    await drag(handle,12,true);assert.equal(await page.locator('#cartBackdrop').getAttribute('aria-hidden'),'false');
    await drag(handle,-20,true);assert.equal(await page.locator('#cartBackdrop').getAttribute('aria-hidden'),'false');
    assert.equal(await page.locator('#cartBackdrop .bottom-sheet-card').evaluate(el=>el.style.transform),'');
    await capture(page,`${width}-native-cart.png`);
    await drag(handle,120);await page.waitForSelector('#cartBackdrop.open',{state:'hidden'});assert.equal(await page.evaluate(()=>document.activeElement.id),'btnCatalogCartPill');
    await page.goForward();await page.waitForSelector('#cartBackdrop.open');await reachable(page,handle);
    await page.locator('#btnProceedToPayment').click();await page.waitForFunction(()=>!document.querySelector('#btnProcessPayment').disabled);
    await drag('#paymentBackdrop .v18-sheet-grab',120);await page.waitForSelector('#cartBackdrop.open');assert.match(await page.locator('#cartSheetTotal').textContent(),/BND\s4\.50/);
    await page.keyboard.press('Escape');await page.waitForSelector('#cartBackdrop.open',{state:'hidden'});
    await page.locator('#btnHeaderOptions').click();await page.locator('#menuItemCustomerMemory').click();await page.waitForSelector('#v18MemoryPreferences');
    await ring('#v18MemoryPreferences');await page.locator('.v18-memory-body').evaluate(el=>{el.scrollTop=el.scrollHeight;});await reachable(page,'#btnCloseMemoryModal');await reachable(page,'#btnResetMemoryProfile');
    await capture(page,`${width}-native-memory.png`);await drag('#btnCloseMemoryModal',120);await page.waitForSelector('#customerMemoryBackdropModal[aria-hidden="false"]',{state:'hidden'});
    // A real touch stream exercises pointer capture, not a synthetic CSS translation.
    await page.locator('#btnCatalogCartPill').click();await reachable(page,handle);const box=await page.locator(handle).boundingBox(),cdp=await context.newCDPSession(page);
    const x=box.x+box.width/2,y=box.y+box.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+60}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal(await page.locator('#cartBackdrop').getAttribute('aria-hidden'),'false');
    assert.equal(await page.locator('#cartBackdrop .bottom-sheet-card').evaluate(el=>el.style.transform),'');
    await reachable(page,handle);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+120}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForSelector('#cartBackdrop.open',{state:'hidden'});await cdp.detach();
    await page.locator('#btnHeaderBack').click();await page.locator('#chatInputText').fill('hello');model.sessionDelay=600;await page.locator('#btnChatSend').click();await page.locator('#chatInputText').fill('next');
    await reachable(page,'#btnChatSend');assert.equal(await page.locator('#btnChatSend').evaluate(el=>getComputedStyle(el).borderRadius),'50%');
    await page.waitForSelector('.v18-proposal');await page.locator('#btnHeaderThemeToggle').click();
    assert.equal(await page.locator('.v18-proposal').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
    await reachable(page,'.v18-proposal button');
    assert.equal(await page.locator('.chat-bubble-ai .product-card-img-wrap').evaluate(el=>getComputedStyle(el).display),'none');await capture(page,`${width}-native-dark-chat.png`);
    await page.emulateMedia({contrast:'more'});await page.locator('#btnFloatingCart').click();
    assert.equal(await page.locator('#cartBackdrop .bottom-sheet-card').evaluate(el=>getComputedStyle(el).backdropFilter),'none');await page.keyboard.press('Escape');await page.waitForSelector('#cartBackdrop.open',{state:'hidden'});
    await page.emulateMedia({forcedColors:'active'});await page.locator('#btnFloatingCart').click();
    assert.equal(await page.locator('#cartBackdrop .v18-sheet-grab > span').evaluate(el=>getComputedStyle(el).opacity),'1');await page.keyboard.press('Escape');await page.waitForSelector('#cartBackdrop.open',{state:'hidden'});await page.emulateMedia({forcedColors:'none',contrast:'no-preference'});
    await context.setOffline(true);await page.waitForFunction(()=>document.querySelector('#customerV18Status').dataset.tone==='error');await new Promise(resolve=>setTimeout(resolve,2900));assert.equal(await page.locator('#customerV18Status').evaluate(el=>el.hidden),false);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
    console.log(`PASS native layers ${width}x${height}: focus rings, mode checks, search width, transient feedback, drag/snap/cancel/touch/history, pinned memory controls, canonical cart totals, circular busy send, persistent offline`);
  }catch(e){await capture(page,`${width}-native-failure.png`);console.log('Native layer evidence: '+output);throw e;}finally{await context.close();}
}
async function comfort(browser,width,height) {
  const context=await browser.newContext({viewport:{width,height},colorScheme:'dark',serviceWorkers:'block'});
  const model=await fixture(context),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Controllable transport only for malformed/stale-event UI tests; live tests use real SSE.
  await context.addInitScript(()=>{window.__streams=[];window.EventSource=class {
    constructor(){window.__streams.push(this);} close(){} emit(data){this.onmessage?.({data:JSON.stringify(data)});}
  };});
  const emit=async data=>page.evaluate(data=>window.__streams.at(-1).emit(data),data);
  async function opaqueContrast(selector,background) {
    const ratio=await page.locator(selector).first().evaluate((el,bg)=>{
      const parse=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
      const lum=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
      const fg=lum(parse(getComputedStyle(el).color)),b=lum(parse(getComputedStyle(document.querySelector(bg)).backgroundColor));
      return (Math.max(fg,b)+.05)/(Math.min(fg,b)+.05);
    },background);assert.ok(ratio>=4.5,`${selector}: contrast ${ratio}`);
  }
  try {
    await page.goto(origin+'/?merchant=fixture&table=5&token=fixture-valid-qr-token');await ready(page);
    assert.equal(await page.locator('html').getAttribute('data-theme'),'dark','OS dark is respected without a stored preference');
    assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'),'#000000');
    await page.locator('[data-lang="en-US"]').click();await page.locator('#qpLihatSemuaMenu').click();
    for(const theme of ['dark','light']) {
      if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('#btnHeaderThemeToggle').click();
      for(const id of ['btnHeaderBack','btnHeaderLangToggle','btnHeaderThemeToggle','btnHeaderOptions']) {
        await reachable(page,'#'+id);const box=await page.locator('#'+id).boundingBox();assert.ok(box.width>=48&&box.height>=48);
      }
      const back=await page.locator('#btnHeaderBack').boundingBox(),options=await page.locator('#btnHeaderOptions').boundingBox();assert.ok(Math.abs(back.y-options.y)<1,'normal navigation stays on one row');
      const bounds=await page.locator('.app-host-container').boundingBox();assert.ok(Math.abs(bounds.height-height)<1&&Math.abs(bounds.width-width)<1,'full available viewport');
      assert.equal(await page.locator('.catalog-scroll-area').evaluate(el=>getComputedStyle(el).scrollbarWidth),'none');
      await addCoffee(page,async()=>{await opaqueContrast('.mod-qty-text','.mod-qty-stepper');await opaqueContrast('#btnModPlus','#btnModPlus');await capture(page,`${width}-comfort-${theme}-modifier.png`);});await page.locator('#btnCatalogCartPill').click();await page.locator('#btnProceedToPayment').click();
      await page.waitForFunction(()=>!document.querySelector('#btnProcessPayment').disabled);await opaqueContrast('.payment-method-card:not([hidden]) .pm-name','.payment-method-card:not([hidden])');
      await capture(page,`${width}-comfort-${theme}-payment.png`);
      model.malformedOrder=theme==='dark';await page.locator('#btnProcessPayment').click();
      if(theme==='dark') {
        await page.waitForFunction(()=>document.querySelector('#customerV18Status').dataset.tone==='error'&&!document.querySelector('#customerV18Status button').hidden);
        assert.equal(model.orders.length,1);model.malformedLookup=true;await page.locator('#customerV18Status button').click();
        await page.waitForFunction(()=>!document.querySelector('#customerV18Status button').disabled&&document.querySelector('#btnProcessPayment').getAttribute('aria-busy')==='false');
        assert.equal(await page.locator('#screenOrderSuccess').evaluate(el=>el.classList.contains('active')),false,'malformed recovery is not an acknowledgement');
        assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.endsWith(':pending'))),true,'durable submission survives malformed responses');
        await page.locator('#customerV18Status button').click();
        assert.equal(model.requests.filter(r=>r.endpoint==='/orders'&&r.method==='POST').length,1,'recovery never duplicates the order');
      }
      await page.waitForFunction(()=>document.querySelector('#screenOrderSuccess').classList.contains('active'));
      await opaqueContrast('.success-title','#screenOrderSuccess');await opaqueContrast('.success-sub','#screenOrderSuccess');await capture(page,`${width}-comfort-${theme}-success.png`);
      await page.locator('#btnSaveReceipt').click();await opaqueContrast('.receipt-brand-name','.thermal-paper-card');await opaqueContrast('#receiptTotal','.thermal-paper-card');
      assert.equal(await page.locator('.thermal-paper-card').getAttribute('data-payment'),'UNPAID');await capture(page,`${width}-comfort-${theme}-receipt.png`);
      await opaqueContrast('#btnPrintReceipt','#btnPrintReceipt');
      await page.emulateMedia({media:'print'});assert.equal(await page.locator('#receiptTotal').evaluate(el=>getComputedStyle(el).color),'rgb(17, 17, 17)');
      assert.equal(await page.locator('.thermal-paper-card').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');await page.emulateMedia({media:'screen'});
      await page.locator('#btnReceiptBackToHome').click();await page.locator('#btnOpenOrderTrackerFromBanner').click();await page.waitForSelector('#orderTrackerBackdrop.open');
      await page.evaluate(()=>window.__streams.at(-1).onopen());await page.waitForFunction(()=>document.querySelector('#trackerConnectionLabel').textContent==='Connected to live updates');
      await opaqueContrast('.step-title','#orderTrackerBackdrop .bottom-sheet-card');await opaqueContrast('#trackerOrderTotalVal','#orderTrackerBackdrop .bottom-sheet-card');
      const order=model.orders[0];
      await emit({type:'WAITER_CALL_UPDATED',call:{status:'acknowledged'}});
      assert.equal(await page.locator('#customerV18Status').evaluate(el=>el.parentElement.classList.contains('bottom-sheet-card')),true,'sheet feedback never overlays its content');
      for(const status of ['accepted','preparing','ready','served','completed','cancelled','rejected']) {
        order.status=status;order.version++;order.paymentStatus=status==='served'?'PARTIALLY_REFUNDED':status==='completed'?'REFUNDED':'PAID';
        await emit({type:'ORDER_UPDATED',order});
        assert.equal(await page.locator('#trackerStatusBadge').getAttribute('data-status'),status);
        assert.equal(await page.locator('.tracker-steps-timeline').evaluate(el=>el.hidden),['cancelled','rejected'].includes(status));
        if(status==='served')assert.equal(await page.locator('#trackerStepCompleted .step-title').textContent(),'4. Served');
        if(status==='completed')assert.match(await page.locator('#trackerPaymentStatusLabel').textContent(),/^REFUNDED$/);
        if(status==='preparing')await capture(page,`${width}-comfort-${theme}-preparing.png`);
      }
      const before=await page.locator('#activityBannerSub').textContent();
      await emit({order:{...order,version:order.version+999,items:null}});await emit({order:{...order,version:order.version+999,tableNum:6}});
      await emit({order:{...order,version:order.version-1,status:'received'}});
      assert.equal(await page.locator('#activityBannerSub').textContent(),before,'bad and stale events do not poison state');
      await emit({type:'WAITER_CALL_UPDATED',call:{status:'not-real'}});
      assert.match(await page.locator('#customerV18Status').textContent(),/A waiter is handling your request/,'unknown waiter events do not clear feedback');
      await capture(page,`${width}-comfort-${theme}-tracker.png`);
      await page.keyboard.press('Escape');await page.waitForSelector('#orderTrackerBackdrop.open',{state:'hidden'});
      // Safe areas are simulated layout contracts, not a claim of physical iPhone validation.
      await page.evaluate(()=>{const r=document.documentElement;r.style.setProperty('--safe-top','24px');r.style.setProperty('--safe-left','24px');r.style.setProperty('--safe-right','24px');r.style.setProperty('--safe-bottom','24px');});
      await page.locator('#chatInputText').fill('Safe area check');await reachable(page,'#btnHeaderOptions');await reachable(page,'#btnChatSend');await page.locator('#chatInputText').fill('');await capture(page,`${width}-comfort-${theme}-safe-area.png`);
      await page.evaluate(()=>['top','left','right','bottom'].forEach(s=>document.documentElement.style.removeProperty('--safe-'+s)));
      await page.locator('#qpLihatSemuaMenu').click();
    }
    model.items=Array.from({length:80},(_,i)=>({...second,id:'long-'+i,name:'Long menu '+i}));await emit({type:'MENU_UPDATED'});await page.waitForFunction(()=>document.querySelectorAll('#menuGridContainer .product-card').length===80);
    await page.locator('.catalog-scroll-area').focus();await page.keyboard.press('PageDown');await page.waitForFunction(()=>document.querySelector('.catalog-scroll-area').scrollTop>0);
    await context.setOffline(true);await page.waitForFunction(()=>document.querySelector('#customerV18Status').dataset.tone==='error');
    assert.equal(await page.locator('#trackerConnectionLabel').textContent(),'Offline. Showing the last known status.');
    const error=await page.locator('#customerV18Status').textContent();await emit({type:'WAITER_CALL_UPDATED',call:{status:'resolved'}});assert.equal(await page.locator('#customerV18Status').textContent(),error);
    await page.emulateMedia({contrast:'more'});assert.equal(await page.locator('#customerV18Status').evaluate(el=>getComputedStyle(el).backdropFilter),'none');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
    console.log(`PASS comfort ${width}x${height}: OS theme, 48px controls, screen/print contrast, canonical tracker/refunds, malformed/stale events, safe areas, hidden scrollbar keyboard scroll, error priority`);
  }catch(e){await capture(page,`${width}-comfort-failure.png`);console.log('Comfort evidence: '+output);throw e;}finally{await context.close();}
}
async function swipeMotion(browser,width,height) {
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,serviceWorkers:'block',reducedMotion:width===320?'reduce':'no-preference'});
  const model=await fixture(context),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(()=>{window.__streams=[];window.EventSource=class {constructor(){window.__streams.push(this);}close(){}emit(data){this.onmessage?.({data:JSON.stringify(data)});}};});
  const emit=async data=>page.evaluate(data=>window.__streams.at(-1).emit(data),data);
  const banner='#btnOpenOrderTrackerFromBanner';
  async function settled(){await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})));});}
  async function drag(dx,dy=0,hold=false){
    await reachable(page,banner);const r=await page.locator(banner).boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:8});
    if(hold)await new Promise(resolve=>setTimeout(resolve,160));await page.mouse.up();await settled();
  }
  async function restore(){await page.locator('#btnHeaderOptions').click();await page.locator('#menuItemOpenTracker').click();await page.waitForSelector('#orderTrackerBackdrop.open');await page.keyboard.press('Escape');await page.waitForSelector('#orderTrackerBackdrop.open',{state:'hidden'});await settled();}
  try {
    await page.goto(origin+'/?merchant=fixture&table=5&token=fixture-valid-qr-token');await ready(page);await page.locator('[data-lang="en-US"]').click();await page.locator('#qpLihatSemuaMenu').click();
    await addCoffee(page);await page.locator('#btnCatalogCartPill').click();await page.locator('#btnProceedToPayment').click();await page.waitForFunction(()=>!document.querySelector('#btnProcessPayment').disabled);await page.locator('#btnProcessPayment').click();await page.waitForSelector('#screenOrderSuccess.active');await page.locator('#btnBackToChat').click();await settled();
    const mutations=()=>model.requests.filter(r=>r.method!=='GET').length;
    for(const theme of ['light','dark']) {
      if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('#btnHeaderThemeToggle').click();await settled();
      const before=mutations();
      assert.equal(await page.locator(banner).evaluate(el=>getComputedStyle(el).touchAction),'pan-y pinch-zoom');
      await drag(12,0,true);assert.equal(await page.locator('#liveOrderActivityBanner').isVisible(),true);assert.equal(await page.locator('#orderTrackerBackdrop.open').count(),0);
      await drag(0,70,true);assert.equal(await page.locator('#liveOrderActivityBanner').isVisible(),true);assert.equal(await page.locator('#orderTrackerBackdrop.open').count(),0,'vertical movement is not a tap');
      const box=await page.locator(banner).boundingBox(),cdp=await context.newCDPSession(page),x=box.x+box.width/2,y=box.y+box.height/2;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+60,y}]});await capture(page,`${width}-motion-${theme}-swipe.png`);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await settled();
      assert.equal(await page.locator(banner).evaluate(el=>el.style.translate),'');assert.equal(await page.locator('#liveOrderActivityBanner').isVisible(),true);
      await page.locator(banner).click();await page.waitForSelector('#orderTrackerBackdrop.open');await page.keyboard.press('Escape');await page.waitForSelector('#orderTrackerBackdrop.open',{state:'hidden'});await settled();
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(theme==='light'?-125:125),y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
      await page.waitForSelector('#liveOrderActivityBanner',{state:'hidden'});await settled();
      assert.equal(await page.locator('#orderTrackerBackdrop.open').count(),0,'swipe never opens tracking');assert.equal(await page.locator('#menuItemHideTrackerBanner').evaluate(el=>el.hidden),true);
      assert.equal(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--activity-height')),'0px');
      const order=model.orders[0];order.version++;order.status='preparing';await emit({type:'ORDER_UPDATED',order});
      assert.equal(await page.locator('#liveOrderActivityBanner').isVisible(),false,'SSE does not resurrect dismissed banner');assert.equal(await page.locator('#customerV18Status').evaluate(el=>el.hidden),true,'dismissed progress does not return as a toast');
      assert.equal(mutations(),before,'presentation gestures never mutate financial/backend state');
      await capture(page,`${width}-motion-${theme}-dismissed.png`);
      await page.reload();await ready(page);await page.locator('[data-lang="en-US"]').click();await settled();
      assert.equal(await page.locator('#liveOrderActivityBanner').isVisible(),false,'tab reload preserves session-scoped dismissal');
      await restore();assert.equal(await page.locator('#liveOrderActivityBanner').isVisible(),true);
      await drag(45,0,true);assert.equal(await page.locator('#liveOrderActivityBanner').isVisible(),true,'a held short drag is not a flick');
      await reachable(page,banner);const flickBox=await page.locator(banner).boundingBox(),touch=await context.newCDPSession(page),fx=flickBox.x+flickBox.width/2,fy=flickBox.y+flickBox.height/2;
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:fx,y:fy}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:fx+80,y:fy}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:fx+25,y:fy}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settled();
      assert.equal(await page.locator('#liveOrderActivityBanner').isVisible(),true,'reversed velocity cannot dismiss a short drag');
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:fx,y:fy}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:fx+60,y:fy}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();await page.waitForSelector('#liveOrderActivityBanner',{state:'hidden'});await restore();
      await page.locator(banner).focus();await page.keyboard.press('Delete');assert.equal(await page.locator('#liveOrderActivityBanner').isVisible(),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'btnHeaderOptions');await restore();
      await page.locator('#btnHeaderOptions').click();await page.locator('#menuItemHideTrackerBanner').click();assert.equal(await page.locator('#liveOrderActivityBanner').isVisible(),false);await restore();
      await page.locator(banner).click();await page.waitForSelector('#orderTrackerBackdrop.open');await page.keyboard.press('Escape');await page.waitForSelector('#orderTrackerBackdrop.open',{state:'hidden'});
      await page.locator('#btnHeaderThemeToggle').focus();await page.keyboard.down('Space');await new Promise(resolve=>setTimeout(resolve,170));
      const scale=await page.locator('#btnHeaderThemeToggle').evaluate(el=>getComputedStyle(el).scale);assert.ok(width===320?scale==='1':Number(scale)<1,'consistent keyboard press and reduced motion');await page.keyboard.up('Space');await settled();
      assert.equal(await page.locator('#btnHeaderThemeToggle').evaluate(el=>getComputedStyle(el).scale),'1');
    }
    const oldId=model.orders[0].id;await page.locator(banner).focus();await page.keyboard.press('Delete');
    await page.locator('#qpLihatSemuaMenu').click();await addCoffee(page);await page.locator('#btnCatalogCartPill').click();await page.locator('#btnProceedToPayment').click();await page.waitForFunction(()=>!document.querySelector('#btnProcessPayment').disabled);await page.locator('#btnProcessPayment').click();await page.waitForSelector('#screenOrderSuccess.active');await page.locator('#btnBackToChat').click();await settled();
    assert.notEqual(model.orders[0].id,oldId);
    assert.equal(await page.locator('#liveOrderActivityBanner').isVisible(),true,'new order is not hidden by old presentation preference');
    if(width===320) {
      await page.evaluate(()=>{const get=Storage.prototype.getItem,set=Storage.prototype.setItem;Storage.prototype.getItem=function(key){if(this===sessionStorage&&key.endsWith(':hidden-tracking'))throw new Error('Blocked presentation storage');return get.call(this,key);};Storage.prototype.setItem=function(key,value){if(this===sessionStorage&&key.endsWith(':hidden-tracking'))throw new Error('Blocked presentation storage');return set.call(this,key,value);};});
      await page.locator(banner).focus();await page.keyboard.press('Delete');
      const streams=await page.evaluate(()=>window.__streams.length);await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await page.waitForFunction(count=>window.__streams.length>count,streams);
      assert.equal(await page.locator('#liveOrderActivityBanner').isVisible(),false,'blocked storage retains in-memory dismissal through session recovery');await restore();
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
    console.log(`PASS swipe/motion ${width}x${height}: both themes, short/vertical/cancel/touch/flick/reversal, no accidental tap or mutation, SSE/reload dismissal, accessible hide/reopen, new-order visibility, keyboard/reduced motion`);
  }catch(e){await capture(page,`${width}-motion-failure.png`);console.log('Swipe evidence: '+output);throw e;}finally{await context.close();}
}
async function resilience(browser,width,height) {
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,serviceWorkers:'block'}),model=await fixture(context),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(()=>{window.__streams=[];window.EventSource=class {constructor(){window.__streams.push(this);}close(){}emit(data){this.onmessage?.({data:JSON.stringify(data)});}};});
  const emit=async data=>page.evaluate(data=>window.__streams.at(-1).emit(data),data);
  const settled=()=>page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})));});
  async function startDrag(selector,dx,dy){await reachable(page,selector);const r=await page.locator(selector).boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+dx,r.y+r.height/2+dy,{steps:8});}
  const count=()=>model.requests.length;
  try {
    await page.goto(origin+'/?merchant=fixture&table=5&token=fixture-valid-qr-token');await ready(page);await page.locator('[data-lang="en-US"]').click();await page.locator('#qpLihatSemuaMenu').click();
    await page.locator('[data-menu-id="coffee"] .btn-add-product').click();
    const handle='#modifierModalBackdrop .v18-sheet-grab',card='#modifierModalBackdrop .bottom-sheet-card';
    await startDrag(handle,140,120);await page.mouse.up();await settled();assert.equal(await page.locator('#modifierModalBackdrop.open').count(),1,'diagonal/horizontal movement never dismisses a sheet');
    for(const interrupt of ['blur','resize','motion']) {
      await startDrag(handle,0,40);assert.ok(await page.locator(card).evaluate(el=>!!el.style.transform));
      if(interrupt==='motion')await page.emulateMedia({reducedMotion:'reduce'});else await page.evaluate(name=>dispatchEvent(new Event(name)),interrupt);
      await page.mouse.up();await settled();assert.equal(await page.locator(card).evaluate(el=>el.style.transform),'',interrupt+' clears sheet translation');assert.equal(await page.locator('#modifierModalBackdrop.open').count(),1,interrupt+' is cancellation, not dismissal');await page.emulateMedia({reducedMotion:'no-preference'});
    }
    await startDrag(handle,0,40);await page.mouse.up();await page.locator(handle).click();await page.waitForSelector('#modifierModalBackdrop.open',{state:'hidden'});
    await page.locator('[data-menu-id="coffee"] .btn-add-product').click();await reachable(page,handle);
    const box=await page.locator(handle).boundingBox(),cdp=await context.newCDPSession(page),x=box.x+box.width/2,y=box.y+box.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+40}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y+40},{x:x+20,y:y+40}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await cdp.detach();await settled();
    assert.equal(await page.locator(card).evaluate(el=>el.style.transform),'');assert.equal(await page.locator('#modifierModalBackdrop.open').count(),1,'multi-touch does not dismiss');await page.keyboard.press('Escape');await page.waitForSelector('#modifierModalBackdrop.open',{state:'hidden'});
    await addCoffee(page);await page.locator('#btnCatalogCartPill').click();await page.locator('#btnProceedToPayment').click();await page.waitForFunction(()=>!document.querySelector('#btnProcessPayment').disabled);await page.locator('#btnProcessPayment').click();await page.waitForSelector('#screenOrderSuccess.active');await page.locator('#btnBackToChat').click();await settled();
    const banner='#btnOpenOrderTrackerFromBanner';
    await startDrag(banner,125,0);await page.mouse.up();await page.evaluate(()=>dispatchEvent(new Event('resize')));await page.waitForSelector('#liveOrderActivityBanner',{state:'hidden'});
    assert.equal(await page.locator(banner).evaluate(el=>el.style.translate),'','accepted dismissal remains committed when interrupted');
    for(const theme of ['light','dark']) {
      if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('#btnHeaderThemeToggle').click();await settled();
      await context.setOffline(true);await page.waitForFunction(()=>document.querySelector('#customerV18Status').dataset.tone==='error');const before=count(),known=await page.locator('#activityBannerSub').textContent();
      const order=model.orders[0];order.status=theme==='light'?'preparing':'ready';order.version++;
      await page.locator('#btnHeaderOptions').click();await page.locator('#menuItemOpenTracker').click();await page.waitForSelector('#orderTrackerBackdrop.open');
      assert.equal(count(),before,'cached offline tracking does not attempt network');assert.equal(await page.locator('#activityBannerSub').textContent(),known,'offline state is last-known, not invented live data');
      assert.equal(await page.locator('#trackerConnectionLabel').textContent(),'Offline. Showing the last known status.');assert.equal(await page.locator('#btnTrackerCallWaiter').isDisabled(),true);assert.equal(await page.locator('#customerV18Status').evaluate(el=>el.hidden),false,'persistent offline error stays visible');
      await capture(page,`${width}-resilience-${theme}-offline.png`);await reachable(page,'#btnCloseTrackerSheet');await page.keyboard.press('Escape');await page.waitForSelector('#orderTrackerBackdrop.open',{state:'hidden'});
      await page.locator('#btnHeaderOptions').click();assert.equal(await page.locator('#menuItemCallWaiter').getAttribute('aria-disabled'),'true');await page.locator('#menuItemCallWaiter').focus();await page.keyboard.press('Enter');assert.equal(count(),before);await page.keyboard.press('Escape');
      await context.setOffline(false);await page.waitForFunction(status=>document.querySelector('#trackerStatusBadge').dataset.status===status,order.status);await page.waitForFunction(()=>document.querySelector('#customerV18Status').hidden);await page.evaluate(()=>window.__streams.at(-1).onopen());await page.waitForFunction(()=>document.querySelector('#trackerConnectionLabel').textContent==='Connected to live updates');
      await page.locator('#btnHeaderOptions').click();await reachable(page,'#menuItemOpenTracker');order.version++;await emit({type:'ORDER_UPDATED',order});assert.equal(await page.locator('#customerV18Status').evaluate(el=>el.hidden),true,'progress never covers the open menu');await page.locator('#menuItemOpenTracker').click();await page.waitForSelector('#orderTrackerBackdrop.open');assert.equal(await page.locator('#trackerStatusBadge').getAttribute('data-status'),order.status);await page.waitForFunction(()=>!document.querySelector('#btnTrackerCallWaiter').disabled);await capture(page,`${width}-resilience-${theme}-reconnected.png`);await page.keyboard.press('Escape');await page.waitForSelector('#orderTrackerBackdrop.open',{state:'hidden'});
      await page.locator(banner).focus();await page.keyboard.press('Delete');
    }
    model.orderingPaused=true;await emit({type:'MENU_UPDATED'});await page.waitForFunction(()=>document.querySelector('#btnChatSend').disabled);await page.waitForFunction(()=>document.querySelector('#menuItemCallWaiter').getAttribute('aria-disabled')==='false');
    model.badOrderRead=true;await page.locator('#btnHeaderOptions').click();await page.locator('#menuItemOpenTracker').click();await page.waitForFunction(()=>document.querySelector('#customerV18Status > span').textContent==='Reconnect');assert.equal(await page.locator('#orderTrackerBackdrop.open').count(),0,'malformed live read never opens a cached fallback');model.badOrderRead=false;
    let release,started;model.sessionGate=new Promise(resolve=>{release=resolve;});const delayed=new Promise(resolve=>{started=resolve;});model.onDelayedSession=started;
    await page.evaluate(()=>window.__streams.at(-1).onopen());let deadline;try{await Promise.race([delayed,new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('Reconnect verification did not start')),3000);})]);}finally{clearTimeout(deadline);}
    model.authenticated=false;await page.locator('#btnHeaderOptions').click();await page.locator('#menuItemOpenTracker').click();await page.waitForFunction(()=>document.querySelector('#customerV18Status').textContent.includes('SESSION_REQUIRED'));
    const late=page.waitForResponse(r=>r.url().endsWith('/api/v1/session')&&r.status()===200);release();model.sessionGate=null;await late;await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await page.locator('#customerV18Status > span').textContent(),'SESSION_REQUIRED (test-request)','late verification cannot dereference or revive a denied principal');await context.setOffline(true);
    assert.equal(await page.locator('#menuItemOpenTracker').isVisible(),false);
    const prior=await page.locator('#activityBannerSub').textContent();await emit({type:'ORDER_UPDATED',order:{...model.orders[0],version:999,status:'received'}});assert.equal(await page.locator('#activityBannerSub').textContent(),prior,'late events after denial are ignored');
    await page.evaluate(()=>dispatchEvent(new PopStateEvent('popstate',{state:{aiodmaCustomer:{screen:'screenThermalReceipt',sheet:'orderTrackerBackdrop'}}})));assert.equal(await page.locator('#orderTrackerBackdrop.open').count(),0,'known revoked principal cannot regain cached access through history');assert.equal(await page.locator('#screenThermalReceipt.active').count(),0);
    model.authenticated=true;model.csrfToken='fixture-renewed-guest-session';model.orders=[];model.cartDelay=500;
    const renewed=page.waitForRequest(r=>r.url().endsWith('/api/v1/cart')&&r.method()==='GET');await context.setOffline(false);await renewed;
    await page.evaluate(()=>dispatchEvent(new PopStateEvent('popstate',{state:{aiodmaCustomer:{screen:'screenThermalReceipt',sheet:'orderTrackerBackdrop'}}})));assert.equal(await page.locator('#orderTrackerBackdrop.open').count(),0,'new principal cannot read old cache during hydration');assert.equal(await page.locator('#screenThermalReceipt.active').count(),0);await page.waitForFunction(()=>document.querySelector('#customerV18Status').hidden);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);console.log(`PASS resilience ${width}x${height}: directional/interrupted/multi-touch sheets, fresh tap, committed swipe, both-theme offline read-only tracking, reconnect, no mutations, malformed/revoked denial`);
  }catch(e){await capture(page,`${width}-resilience-failure.png`);console.log('Resilience evidence: '+output);throw e;}finally{await context.close();}
}
async function main(url=process.env.CUSTOMER_V18_URL) {
  const candidates=[process.env.CUSTOMER_V18_BROWSER,await require('puppeteer').executablePath(),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', chromium.executablePath()].filter(Boolean);
  const executablePath=candidates.find(file=>fs.existsSync(file));
  assert.ok(executablePath,'Configure CUSTOMER_V18_BROWSER with an installed Chromium executable');
  const browser=await chromium.launch({headless:true,executablePath});
  try {if(url)await live(browser,url);else {
    if(!process.env.CUSTOMER_V18_RESILIENCE_ONLY){
    if(!process.env.CUSTOMER_V18_MOTION_ONLY){
      if(!process.env.CUSTOMER_V18_COMFORT_ONLY){if(!process.env.CUSTOMER_V18_NATIVE_ONLY){for(const size of [[320,740],[390,844],[844,390],[1440,1000]])await contract(browser,...size);await scrolling(browser);for(const size of [[320,568],[390,844],[844,320],[1440,1000]])await refinement(browser,...size);await storageBoundaries(browser);}for(const size of [[320,568],[390,844],[844,320],[1440,1000]])await nativeLayers(browser,...size);}
      if(!process.env.CUSTOMER_V18_NATIVE_ONLY)for(const size of [[320,568],[390,844],[844,320],[1440,1000]])await comfort(browser,...size);
    }
    if(!process.env.CUSTOMER_V18_NATIVE_ONLY&&!process.env.CUSTOMER_V18_COMFORT_ONLY)for(const size of [[320,568],[390,844],[844,320],[1440,1000]])await swipeMotion(browser,...size);
    }
    if(!process.env.CUSTOMER_V18_NATIVE_ONLY&&!process.env.CUSTOMER_V18_COMFORT_ONLY&&!process.env.CUSTOMER_V18_MOTION_ONLY)for(const size of [[320,568],[390,844],[844,320],[1440,1000]])await resilience(browser,...size);
  }console.log('Screenshots: '+output);}
  finally{await browser.close();}
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={main};
