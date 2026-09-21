'use strict';
const crypto=require('node:crypto');
const {createGeminiProvider}=require('../ai/provider');
const {createOrchestrator}=require('../ai/orchestrator');
const {catalog,createOrders}=require('./orders');
const {hash}=require('./identity');
const {audit,emit,idempotent}=require('./transactions');
const {requireValue}=require('../shared/errors');

function createAiService(db,config,{provider}={}) {
  const engine=createOrchestrator({provider:provider || createGeminiProvider({env:config})});
  const orders=createOrders(db);
  async function chat(principal,body,signal) {
    const tenantId=principal.tenant_id;
    const requestHash=hash(JSON.stringify([body.message,body.language]));
    const prepared=await db.transaction(tenantId,async c=>{
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[principal.id]);
      const interrupted={status:'failed',text:'Permintaan sebelumnya terputus. Silakan kirim ulang.',mode:'degraded',modelUsed:null,usage:null,proposals:[],recommendations:[]};
      await c.query("UPDATE ai_messages SET result=$3 WHERE tenant_id=$1 AND session_id=$2 AND result->>'status'='running' AND created_at<=now()-interval '30 seconds'",
        [tenantId,principal.id,JSON.stringify(interrupted)]);
      const previous=(await c.query('SELECT * FROM ai_messages WHERE tenant_id=$1 AND session_id=$2 AND message_id=$3',[tenantId,principal.id,body.messageId])).rows[0];
      if(previous){
        requireValue(previous.request_hash===requestHash,'IDEMPOTENCY_CONFLICT','Pesan dengan ID ini memiliki isi berbeda.',409);
        requireValue(previous.result.status!=='running','AI_RUN_PENDING','Pesan masih diproses. Coba lagi sebentar.',409);
        return {cached:previous.result};
      }
      const active=await c.query("SELECT 1 FROM ai_messages WHERE tenant_id=$1 AND session_id=$2 AND result->>'status'='running' AND created_at>now()-interval '30 seconds'",[tenantId,principal.id]);
      requireValue(!active.rowCount,'AI_RUN_PENDING','Tunggu balasan sebelumnya.',409);
      const tenant=(await c.query('SELECT id,name,currency,config FROM tenants WHERE id=$1',[tenantId])).rows[0];
      const cart=await orders.getCart(c,principal);
      const menu=await catalog(c,tenantId);
      const words=body.message.toLowerCase().split(/\s+/).filter(w=>w.length>2);
      const rank=item=>words.reduce((n,w)=>n+Number((item.name+' '+item.category).toLowerCase().includes(w)),0)+(cart.lines.some(l=>l.menuId===item.id)?2:0);
      const selected=menu.sort((a,b)=>rank(b)-rank(a)).slice(0,8).map(i=>({id:i.id,name:i.name,price:i.price,
        available:i.available&&i.stock!==0,category:i.category,description:(i.desc || '').slice(0,300),modifierGroups:i.modifierGroups}));
      const docs=(await c.query("SELECT id,content FROM tenant_resources WHERE tenant_id=$1 AND kind='knowledge' AND content->>'status'='published' ORDER BY updated_at DESC LIMIT 30",[tenantId])).rows;
      const knowledge=docs.filter(d=>words.some(w=>(d.content.title+' '+d.content.text).toLowerCase().includes(w))).slice(0,2).map(d=>({id:d.id,...d.content,text:d.content.text.slice(0,1200)}));
      const profile=(await c.query("SELECT content FROM tenant_resources WHERE tenant_id=$1 AND kind='profile' AND id=$2",[tenantId,principal.id])).rows[0]?.content || null;
      const history=(await c.query("SELECT input,result FROM ai_messages WHERE tenant_id=$1 AND session_id=$2 AND result->>'status'='completed' ORDER BY created_at DESC LIMIT 3",[tenantId,principal.id])).rows.reverse()
        .flatMap(m=>[{role:'user',text:m.input.slice(0,1000)},{role:'assistant',text:String(m.result.text || '').slice(0,1000)}]);
      await c.query('INSERT INTO ai_messages(tenant_id,session_id,message_id,request_hash,input,result) VALUES($1,$2,$3,$4,$5,$6)',
        [tenantId,principal.id,body.messageId,requestHash,body.message,JSON.stringify({status:'running'})]);
      return {context:{tenant:{id:tenant.id,name:tenant.name,currency:tenant.currency,orderingPaused:!!tenant.config.orderingPaused},catalog:selected,
        cart:{version:cart.version,lines:cart.lines.map((l,index)=>({...l,id:'line_'+index}))},knowledge,profile,history}};
    });
    if(prepared.cached)return prepared.cached;
    let result;
    try {
      result=await engine.run({message:body.message,language:body.language,context:prepared.context,signal,tools:{
        get_cart:()=>db.transaction(tenantId,async c=>{
          const cart=await orders.getCart(c,principal);return {version:cart.version,lines:cart.lines.map((l,index)=>({...l,id:'line_'+index}))};
        }),
        get_order_status:({orderId})=>db.transaction(tenantId,async c=>{
          requireValue(/^[0-9a-f-]{36}$/i.test(orderId),'NOT_FOUND','Pesanan tidak ditemukan.',404);
          const row=(await c.query('SELECT id,status,payment_status FROM orders WHERE tenant_id=$1 AND id=$2 AND session_id=$3',[tenantId,orderId,principal.id])).rows[0];
          requireValue(row,'NOT_FOUND','Pesanan tidak ditemukan.',404);return {id:row.id,status:row.status,paymentStatus:row.payment_status};
        })
      }});
    }catch{
      result={text:'Layanan percakapan belum tersedia. Anda tetap dapat memilih menu dan memesan.',mode:'degraded',modelUsed:null,usage:null,proposals:[],recommendations:[]};
    }
    return db.transaction(tenantId,async c=>{
      // Serialize finalization with memory deletion and stale-run recovery.
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[principal.id]);
      const current=(await c.query('SELECT result FROM ai_messages WHERE tenant_id=$1 AND session_id=$2 AND message_id=$3 FOR UPDATE',
        [tenantId,principal.id,body.messageId])).rows[0];
      requireValue(current,'AI_RUN_DISCARDED','Percakapan telah dihapus.',409);
      if(current.result.status!=='running')return current.result;
      // A revoked session cannot keep valid action proposals after an in-flight provider call.
      const session=(await c.query('SELECT 1 FROM sessions WHERE id=$1 AND NOT revoked AND expires_at>now()',[principal.id])).rowCount;
      const proposals=session?result.proposals:[];
      const final={...result,proposals,status:'completed',messageId:body.messageId,cartVersion:prepared.context.cart.version};
      for(const proposal of proposals)await c.query('INSERT INTO ai_proposals(tenant_id,id,session_id,message_id,cart_version,action) VALUES($1,$2,$3,$4,$5,$6)',
        [tenantId,proposal.id,principal.id,body.messageId,prepared.context.cart.version,JSON.stringify(proposal)]);
      await c.query('UPDATE ai_messages SET result=$4 WHERE tenant_id=$1 AND session_id=$2 AND message_id=$3',[tenantId,principal.id,body.messageId,JSON.stringify(final)]);
      await audit(c,principal,'AI_RUN_COMPLETED',body.messageId,{mode:result.mode,modelUsed:result.modelUsed,proposalCount:proposals.length});
      return final;
    });
  }
  async function confirm(principal,id,body,key) {
    return db.transaction(principal.tenant_id,c=>idempotent(c,principal,'ai-confirm',key,{id,...body},async()=>{
      const proposal=(await c.query('SELECT * FROM ai_proposals WHERE tenant_id=$1 AND id=$2 AND session_id=$3 AND message_id=$4 FOR UPDATE',
        [principal.tenant_id,id,principal.id,body.messageId])).rows[0];
      requireValue(proposal,'NOT_FOUND','Usulan tidak ditemukan.',404);
      if(proposal.result)return proposal.result;
      requireValue(new Date(proposal.expires_at)>new Date(),'PROPOSAL_EXPIRED','Usulan telah kedaluwarsa.',409);
      const service=createOrders({transaction:(_tenant,work)=>work(c)});
      const cart=await service.getCart(c,principal,true);
      requireValue(cart.version===body.expectedVersion && cart.version===proposal.cart_version,'CART_STALE','Keranjang berubah. Minta usulan baru.',409);
      const {name,args}=proposal.action;
      let result;
      if(['add_cart_items','update_cart_line','remove_cart_line'].includes(name)){
        let lines=cart.lines;
        if(name==='add_cart_items')lines=[...lines,...args.items];
        else {
          const index=lines.findIndex((_l,i)=>'line_'+i===args.lineId);
          requireValue(index>=0,'LINE_NOT_FOUND','Item tidak ditemukan.',409);
          lines=name==='remove_cart_line'?lines.filter((_l,i)=>i!==index):lines.map((l,i)=>i===index?{...l,qty:args.qty,optionIds:args.optionIds}:l);
        }
        result={action:'cart_updated',cart:await service.replaceCart(principal,{expectedVersion:cart.version,lines},id)};
      }else if(name==='request_waiter'){
        const existing=(await c.query("SELECT * FROM waiter_calls WHERE tenant_id=$1 AND session_id=$2 AND status<>'resolved' LIMIT 1",[principal.tenant_id,principal.id])).rows[0];
        const call=existing || (await c.query('INSERT INTO waiter_calls(tenant_id,id,session_id,table_id,reason) VALUES($1,$2,$3,$4,$5) RETURNING *',
          [principal.tenant_id,crypto.randomUUID(),principal.id,principal.table_id,args.reason || 'Bantuan pelanggan'])).rows[0];
        if(!existing)await emit(c,principal.tenant_id,'CALL_WAITER',{call},principal.id);
        result={action:'waiter_requested',call};
      }else if(['get_quote','present_checkout'].includes(name))result={action:'present_checkout'};
      else requireValue(false,'TOOL_DENIED','Tindakan tidak diizinkan.',403);
      await c.query('UPDATE ai_proposals SET result=$3 WHERE tenant_id=$1 AND id=$2',[principal.tenant_id,id,JSON.stringify(result)]);
      await audit(c,principal,'AI_PROPOSAL_CONFIRMED',id,{name});return result;
    }));
  }
  return {chat,confirm};
}
module.exports={createAiService};
