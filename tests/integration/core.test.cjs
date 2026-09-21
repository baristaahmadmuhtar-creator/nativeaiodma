'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {startLocalDatabase}=require('../../scripts/local-database.cjs');
const {seed}=require('../../scripts/seed-v18.cjs');
const {createDatabase}=require('../../src/infrastructure/database');
const {createApp}=require('../../src/server/app');
const {tableToken}=require('../../src/modules/identity');

let database,db,server,base,config,owner,guestA,guestB,foreign;
const suffix=crypto.randomBytes(4).toString('hex');
const tenantA='test_a_'+suffix,tenantB='test_b_'+suffix;
const email=`owner_${suffix}@example.test`,password=crypto.randomBytes(20).toString('hex');
const line={menuId:'latte',qty:2,optionIds:['addons_0']};

async function request(path,{method='GET',body,session,key,headers={}}={}){
  const res=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),
    ...(session?{Cookie:session.cookie,'X-CSRF-Token':session.csrf}:{}),...(key?{'Idempotency-Key':key}:{}),...headers},
    body:body?JSON.stringify(body):undefined});
  const data=await res.json().catch(()=>null);
  return {status:res.status,data,cookie:res.headers.get('set-cookie')?.split(';')[0]};
}
async function raw(path){
  const res=await fetch(base+path);
  return {status:res.status,text:await res.text(),headers:res.headers};
}
async function guest(tenant){
  const r=await request('/api/v1/session',{method:'POST',body:{merchantId:tenant,tableId:1,token:tableToken(config,tenant,1,1)}});
  assert.equal(r.status,200,JSON.stringify(r.data));return {cookie:r.cookie,csrf:r.data.data.csrfToken};
}
async function fillCart(session,lines=[line]){
  const cart=(await request('/api/v1/cart',{session})).data.data;
  const r=await request('/api/v1/cart',{method:'PUT',session,key:crypto.randomUUID(),body:{expectedVersion:cart.version,lines}});
  assert.equal(r.status,200,JSON.stringify(r.data));return r.data.data;
}
async function quote(session){
  const cart=await fillCart(session);
  const r=await request('/api/v1/quotes',{method:'POST',session,body:{expectedVersion:cart.version}});
  assert.equal(r.status,201,JSON.stringify(r.data));return r.data.data;
}

before(async()=>{
  database=await startLocalDatabase('integration');
  const fixture={name:'Test Cafe',currency:'BND',taxRate:0,tablesCount:2,menu:[{id:'latte',name:'Latte',category:'coffee',price:4.5,available:true,customizations:{addons:[{name:'Oat',price:0.75}]}}]};
  await seed({connectionString:database.migrationUrl,merchants:[{...fixture,id:tenantA},{...fixture,id:tenantB}],email,password,published:true});
  db=createDatabase(database.connectionString);
  config={SESSION_SECRET:crypto.randomBytes(32).toString('hex'),PUBLIC_BASE_URL:'http://localhost:8081',NODE_ENV:'test'};
  server=await new Promise(resolve=>{const s=createApp({db,config}).listen(0,'127.0.0.1',()=>resolve(s));});
  base='http://127.0.0.1:'+server.address().port;
  const r=await request('/api/v1/auth/login',{method:'POST',body:{email,password,merchantId:tenantA}});
  assert.equal(r.status,200,JSON.stringify(r.data));owner={cookie:r.cookie,csrf:r.data.data.csrfToken};
  guestA=await guest(tenantA);guestB=await guest(tenantA);foreign=await guest(tenantB);
}, {timeout:120000});
after(async()=>{server?.closeAllConnections();if(server)await new Promise(resolve=>server.close(resolve));await db?.close();await database?.stop();});

test('runtime is a real PostgreSQL role that cannot bypass RLS',async()=>{
  const role=(await db.pool.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
  assert.equal(role.rolsuper,false);assert.equal(role.rolbypassrls,false);
  assert.equal((await db.pool.query('SELECT * FROM catalog_items')).rowCount,0);
  assert.equal((await db.transaction(tenantA,c=>c.query('SELECT * FROM catalog_items'))).rowCount,1);
  assert.equal((await db.pool.query('SELECT * FROM catalog_items')).rowCount,0);
});
test('private repository files never served',async()=>{
  for(const path of ['/data/db.json','/server.js','/.env','/package.json','/.git/config','/src/server/config.js'])assert.equal((await request(path)).status,404,path);
});
test('v18 static boundary serves only vetted app assets with restrictive CSP',async()=>{
  const home=await raw('/');
  assert.equal(home.status,200);
  assert.match(home.text,/js\/customer-v18\.js/);
  assert.match(home.text,/css\/customer-v18\.css/);
  assert.doesNotMatch(home.text,/js\/app\.js/);
  const csp=home.headers.get('content-security-policy');
  assert.match(csp,/default-src 'self'/);
  assert.match(csp,/script-src 'self' 'sha256-/);
  assert.match(csp,/script-src-attr 'none'/);
  assert.match(csp,/object-src 'none'/);
  assert.match(csp,/frame-ancestors 'none'/);
  assert.equal((await raw('/js/customer-v18.js')).status,200);
  assert.equal((await raw('/js/admin-v18.js')).status,200);
  assert.equal((await raw('/js/app.js')).status,404);
  assert.equal((await raw('/js/admin.js')).status,404);
  const sw=await raw('/sw.js');
  assert.equal(sw.status,200);
  assert.match(sw.text,/caches\.delete/);
  assert.doesNotMatch(sw.text,/cache\.addAll|fetch\(/);
});
test('master token and forged QR rejected',async()=>{
  assert.equal((await request('/api/v1/admin/menu',{headers:{Authorization:'Bearer aiodma2026'}})).status,401);
  assert.equal((await request('/api/v1/session',{method:'POST',body:{merchantId:tenantA,tableId:1,token:'x'.repeat(30)}})).status,403);
});
test('tenant selector cannot override authenticated principal',async()=>{
  assert.equal((await request('/api/v1/cart?merchant='+tenantB,{session:guestA})).status,403);
  assert.equal((await request('/api/v1/admin/menu',{session:owner,headers:{'x-merchant-id':tenantB}})).status,403);
});
test('guest cannot use admin routes and mutations require CSRF',async()=>{
  assert.equal((await request('/api/v1/admin/menu',{session:guestA})).status,403);
  assert.equal((await request('/api/v1/cart',{method:'PUT',session:{...guestA,csrf:'bad'},body:{expectedVersion:1,lines:[]},key:crypto.randomUUID()})).status,403);
  assert.equal((await request('/api/v1/auth/login',{method:'POST',body:{email,password,merchantId:tenantA},headers:{Origin:'https://evil.example'}})).status,403);
});
test('unknown catalog item and invalid quantity cannot enter cart',async()=>{
  for(const invalid of [{menuId:'fake',qty:1,optionIds:[]},{menuId:'latte',qty:-1,optionIds:[]},{menuId:'latte',qty:1,optionIds:['foreign_modifier']}]){
    const cart=(await request('/api/v1/cart',{session:guestA})).data.data;
    const r=await request('/api/v1/cart',{method:'PUT',session:guestA,key:crypto.randomUUID(),body:{expectedVersion:cart.version,lines:[invalid]}});
    assert.equal(r.status,422,JSON.stringify(r.data));
  }
});
test('canonical quote equals exact BND minor-unit fixture; same-table carts private',async()=>{
  const q=await quote(guestA);assert.equal(q.totalMinor,1050);assert.equal(q.currency,'BND');
  assert.equal((await request('/api/v1/cart',{session:guestB})).data.data.lines.length,0);
});
test('stale cart and reused key with changed payload produce conflict',async()=>{
  const session=await guest(tenantA),key=crypto.randomUUID();
  const body={expectedVersion:1,lines:[line]};
  const first=await request('/api/v1/cart',{method:'PUT',session,key,body});assert.equal(first.status,200);
  const retry=await request('/api/v1/cart',{method:'PUT',session,key,body});assert.deepEqual(retry.data.data,first.data.data);
  assert.equal((await request('/api/v1/cart',{method:'PUT',session,key,body:{...body,lines:[]}})).status,409);
  assert.equal((await request('/api/v1/cart',{method:'PUT',session,key:crypto.randomUUID(),body})).status,409);
});
test('client cannot declare payment paid or select unconfigured gateway',async()=>{
  const q=await quote(guestA);
  const common={quoteId:q.id,confirmed:true,paymentMethod:'CASH'};
  assert.equal((await request('/api/v1/orders',{method:'POST',session:guestA,key:crypto.randomUUID(),body:{...common,paymentStatus:'PAID'}})).status,422);
  assert.equal((await request('/api/v1/orders',{method:'POST',session:guestA,key:crypto.randomUUID(),body:{...common,paymentMethod:'BIBD'}})).status,422);
});
test('concurrent duplicate submission yields one durable unpaid order; private to guest',async()=>{
  const q=await quote(guestA),key=crypto.randomUUID(),body={quoteId:q.id,confirmed:true,paymentMethod:'CASH'};
  const results=await Promise.all(Array.from({length:5},()=>request('/api/v1/orders',{method:'POST',session:guestA,key,body})));
  for(const r of results)assert.equal(r.status,201,JSON.stringify(r.data));
  const order=results[0].data.data;
  assert(results.every(r=>r.data.data.id===order.id));assert.equal(order.paymentStatus,'UNPAID');
  assert.equal((await request('/api/v1/orders/'+order.id,{session:guestB})).status,404);
  assert.equal((await request('/api/v1/orders/'+order.id,{session:foreign})).status,404);
  assert.equal((await request('/api/v1/submissions/'+key,{session:guestA})).data.data.order.id,order.id);
  assert.equal((await db.transaction(tenantA,c=>c.query('SELECT * FROM orders WHERE quote_id=$1',[q.id]))).rowCount,1);
});
test('cashier settlement validates amount; preparation blocked until paid',async()=>{
  const session=await guest(tenantA),q=await quote(session);
  const o=(await request('/api/v1/orders',{method:'POST',session,key:crypto.randomUUID(),body:{quoteId:q.id,confirmed:true,paymentMethod:'CASH'}})).data.data;
  const accepted=await request(`/api/v1/admin/orders/${o.id}/status`,{method:'PATCH',session:owner,key:crypto.randomUUID(),body:{status:'accepted',expectedVersion:o.version}});
  assert.equal(accepted.status,200);const v=accepted.data.data.version;
  assert.equal((await request(`/api/v1/admin/orders/${o.id}/status`,{method:'PATCH',session:owner,key:crypto.randomUUID(),body:{status:'preparing',expectedVersion:v}})).status,409);
  assert.equal((await request(`/api/v1/admin/orders/${o.id}/payment`,{method:'PATCH',session:owner,key:crypto.randomUUID(),body:{expectedVersion:v,amountMinor:1,reference:'Cash received'}})).status,409);
  const settled=await request(`/api/v1/admin/orders/${o.id}/payment`,{method:'PATCH',session:owner,key:crypto.randomUUID(),body:{expectedVersion:v,amountMinor:1050,reference:'Cash received'}});
  assert.equal(settled.status,200,JSON.stringify(settled.data));assert.equal(settled.data.data.paymentStatus,'PAID');
  const prep=await request(`/api/v1/admin/orders/${o.id}/status`,{method:'PATCH',session:owner,key:crypto.randomUUID(),body:{status:'preparing',expectedVersion:settled.data.data.version}});
  assert.equal(prep.status,200);assert.equal((await request('/api/v1/admin/stats',{session:owner})).data.data.settledMinor,1050);
});
test('waiter request is durable and idempotent',async()=>{
  const session=await guest(tenantA),key=crypto.randomUUID(),body={reason:'Perlu bantuan menu'};
  const a=await request('/api/v1/waiter-calls',{method:'POST',session,key,body});
  const b=await request('/api/v1/waiter-calls',{method:'POST',session,key,body});
  assert.equal(a.status,201);assert.equal(a.data.data.id,b.data.data.id);
  assert((await request('/api/v1/admin/waiter-calls',{session:owner})).data.data.some(c=>c.id===a.data.data.id));
});
test('QR output is an encoded SVG with trusted base URL',async()=>{
  const r=await request('/api/v1/admin/tables/1/qr',{session:owner});assert.equal(r.status,200);
  assert(r.data.data.svg.includes('<svg'));assert.equal(new URL(r.data.data.url).origin,config.PUBLIC_BASE_URL);
  assert.equal(new URL(r.data.data.url).searchParams.get('merchant'),tenantA);
});
test('revoked session cannot be reused',async()=>{
  const session=await guest(tenantA);
  assert.equal((await request('/api/v1/auth/logout',{method:'POST',session,body:{}})).status,200);
  assert.equal((await request('/api/v1/cart',{session})).status,401);
});
