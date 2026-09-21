'use strict';
// Real PostgreSQL persistence with a deterministic planner, not live AI evaluation.
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {startLocalDatabase}=require('../../scripts/local-database.cjs');
const {seed}=require('../../scripts/seed-v18.cjs');
const {createDatabase}=require('../../src/infrastructure/database');
const {createApp}=require('../../src/server/app');
const {tableToken,hash}=require('../../src/modules/identity');
const {createAiService}=require('../../src/modules/ai-service');
const {createOrders}=require('../../src/modules/orders');
let local,db,server,base,config;
const tenant='ai_'+crypto.randomBytes(6).toString('hex');
const body=()=>({messageId:crypto.randomUUID(),message:'Add a coffee',language:'en'});
function plan(name,args){const call={name,args};return {content:{role:'model',parts:[{functionCall:call}]},toolCalls:[call],text:'',modelUsed:'mock-planner',usage:null};}
function planner(pause){let count=0;return {configured:true,mode:'mock',async generate(){if(count++===0){if(pause)await pause();return plan('add_cart_items',{items:[{menuId:'coffee',qty:1,optionIds:[]}]});}return plan('respond',{kind:'clarify'});}};}
async function guest(){
  const response=await fetch(base+'/api/v1/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({merchantId:tenant,tableId:1,token:tableToken(config,tenant,1,1)})});
  assert.equal(response.status,200);const data=(await response.json()).data;
  const cookie=response.headers.get('set-cookie').split(';')[0];
  const row=(await db.pool.query('SELECT * FROM sessions WHERE token_hash=$1',[hash(cookie.slice(cookie.indexOf('=')+1))])).rows[0];
  return {...row,role:'guest',cookie,csrf:data.csrfToken};
}
before(async()=>{
  local=await startLocalDatabase('integration');
  await seed({connectionString:local.migrationUrl,merchants:[{id:tenant,name:'AI Storage Test',currency:'BND',taxRate:0,tablesCount:1,
    menu:[{id:'coffee',name:'Coffee',category:'Coffee',price:3.5,available:true}]}],email:tenant+'@example.test',password:crypto.randomBytes(24).toString('hex'),published:true});
  db=createDatabase(local.connectionString);config={NODE_ENV:'test',SESSION_SECRET:crypto.randomBytes(32).toString('hex'),PUBLIC_BASE_URL:'http://localhost'};
  server=await new Promise(resolve=>{const s=createApp({db,config}).listen(0,'127.0.0.1',()=>resolve(s));});base='http://127.0.0.1:'+server.address().port;config.PUBLIC_BASE_URL=base;
},{timeout:120000});
after(async()=>{server?.closeAllConnections();if(server)await new Promise(resolve=>server.close(resolve));await db?.close();await local?.stop();});

test('AI proposals persist without mutating cart, then concurrent confirmations execute once',async()=>{
  const p=await guest(),b=body(),service=createAiService(db,config,{provider:planner()});
  const result=await service.chat(p,b);assert.equal(result.mode,'mock');assert.equal(result.proposals.length,1);
  assert.equal((await db.transaction(tenant,c=>createOrders(db).getCart(c,p))).lines.length,0);
  const confirmation={messageId:b.messageId,expectedVersion:result.cartVersion};
  const replies=await Promise.all(Array.from({length:4},()=>service.confirm(p,result.proposals[0].id,confirmation,crypto.randomUUID())));
  for(const reply of replies)assert.equal(reply.cart.lines[0].qty,1);
  assert.equal((await db.transaction(tenant,c=>createOrders(db).getCart(c,p))).lines.length,1);
  assert.deepEqual(await service.chat(p,b),result);
  await assert.rejects(service.chat(p,{...b,message:'Changed'}),{code:'IDEMPOTENCY_CONFLICT'});
});
test('same-table guest cannot confirm another guest proposal; stale cart rejects confirmation',async()=>{
  const p=await guest(),other=await guest(),b=body(),service=createAiService(db,config,{provider:planner()});
  const result=await service.chat(p,b),confirmation={messageId:b.messageId,expectedVersion:result.cartVersion};
  await assert.rejects(service.confirm(other,result.proposals[0].id,confirmation,crypto.randomUUID()),{code:'NOT_FOUND'});
  await createOrders(db).replaceCart(p,{expectedVersion:1,lines:[]},crypto.randomUUID());
  await assert.rejects(service.confirm(p,result.proposals[0].id,confirmation,crypto.randomUUID()),{code:'CART_STALE'});
});
test('retrying the same interrupted message reaches a terminal state instead of permanent pending',async()=>{
  const p=await guest(),b=body();
  await db.transaction(tenant,c=>c.query("INSERT INTO ai_messages(tenant_id,session_id,message_id,request_hash,input,result,created_at) VALUES($1,$2,$3,$4,$5,$6,now()-interval '1 minute')",
    [tenant,p.id,b.messageId,hash(JSON.stringify([b.message,b.language])),b.message,JSON.stringify({status:'running'})]));
  const service=createAiService(db,config,{provider:{configured:true,generate(){assert.fail('Must not rerun interrupted request');}}});
  const result=await service.chat(p,b);assert.equal(result.status,'failed');assert.deepEqual(result.proposals,[]);
});
test('deleting memory during an in-flight provider run prevents resurrection and proposal persistence',async()=>{
  const p=await guest(),b=body();let release,entered;
  const waiting=new Promise(resolve=>{entered=resolve;}),barrier=new Promise(resolve=>{release=resolve;});
  const service=createAiService(db,config,{provider:planner(async()=>{entered();await barrier;})});
  const run=service.chat(p,b);const rejection=assert.rejects(run,{code:'AI_RUN_DISCARDED'});await waiting;
  const deleted=await fetch(base+'/api/v1/profile',{method:'DELETE',headers:{Cookie:p.cookie,'X-CSRF-Token':p.csrf}});
  assert.equal(deleted.status,200);release();await rejection;
  const count=await db.transaction(tenant,c=>c.query('SELECT * FROM ai_messages WHERE session_id=$1',[p.id]));assert.equal(count.rowCount,0);
  assert.equal((await db.transaction(tenant,c=>c.query('SELECT * FROM ai_proposals WHERE session_id=$1',[p.id]))).rowCount,0);
});
test('session revocation during provider work returns no executable proposals',async()=>{
  const p=await guest(),b=body();let release,entered;
  const waiting=new Promise(resolve=>{entered=resolve;}),barrier=new Promise(resolve=>{release=resolve;});
  const service=createAiService(db,config,{provider:planner(async()=>{entered();await barrier;})});
  const run=service.chat(p,b);await waiting;await db.pool.query('UPDATE sessions SET revoked=true WHERE id=$1',[p.id]);release();
  const result=await run;assert.deepEqual(result.proposals,[]);
  assert.equal((await db.transaction(tenant,c=>c.query('SELECT * FROM ai_proposals WHERE session_id=$1',[p.id]))).rowCount,0);
});
