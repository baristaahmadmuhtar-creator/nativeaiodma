'use strict';
const { z } = require('zod');
const { requireValue } = require('../shared/errors');
function kinds(role) {
  const orders=['ORDER_CREATED','ORDER_STATUS_CHANGED','ORDER_PAID'];
  const calls=['CALL_WAITER','WAITER_CALL_UPDATED'];
  if(role==='kitchen')return orders;
  if(role==='waiter')return ['ORDER_STATUS_CHANGED',...calls];
  return [...orders,...calls];
}
function notification(row) {
  const order=row.payload.order,call=row.payload.call;
  return {seq:Number(row.seq),createdAt:row.created_at,type:row.kind,
    orderId:order?.id || null,callId:call?.id || null,
    orderNumber:order?.orderNumber || null,table:order?.tableNum ?? call?.table_id ?? null,
    status:order?.status || call?.status || null,paymentStatus:order?.paymentStatus || null};
}
function registerNotifications(api,{wrap,valid,send,tx}) {
  api.get('/notifications',wrap(async(req,res)=>{
    requireValue(!req.principal.mfaRequired,'MFA_REQUIRED','Verifikasi MFA diperlukan.',403);
    const before=req.query.before===undefined?null:valid(z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),req.query.before);
    const p=req.principal,principal=p.user_id || p.id;
    const result=await tx(req,async c=>{
      const args=[p.tenant_id,kinds(p.role),p.role==='guest'?p.id:null];
      const predicate='tenant_id=$1 AND kind=ANY($2::text[]) AND ($3::uuid IS NULL OR audience_session=$3)';
      const read=Number((await c.query('SELECT through_seq FROM notification_reads WHERE tenant_id=$1 AND principal_id=$2',[p.tenant_id,principal])).rows[0]?.through_seq || 0);
      const summary=(await c.query(`SELECT COALESCE(max(seq),0)::text AS latest,count(*) FILTER (WHERE seq>$4)::integer AS unread FROM outbox_events WHERE ${predicate}`,[...args,read])).rows[0];
      const rows=(await c.query(`SELECT seq,created_at,kind,payload FROM outbox_events WHERE ${predicate} AND ($4::bigint IS NULL OR seq<$4) AND seq<=$5 ORDER BY seq DESC LIMIT 51`,[...args,before,summary.latest])).rows;
      const items=rows.slice(0,50).map(row=>({...notification(row),read:Number(row.seq)<=read}));
      return {items,unread:summary.unread,latestSeq:Number(summary.latest),nextBefore:rows.length>50?items.at(-1).seq:null};
    });send(res,result);
  }));
  api.post('/notifications/read',wrap(async(req,res)=>{
    requireValue(!req.principal.mfaRequired,'MFA_REQUIRED','Verifikasi MFA diperlukan.',403);
    const {throughSeq}=valid(z.object({throughSeq:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)}).strict(),req.body);
    const p=req.principal;
    await tx(req,async c=>{
      const latest=Number((await c.query('SELECT COALESCE(max(seq),0)::text AS seq FROM outbox_events WHERE tenant_id=$1 AND kind=ANY($2::text[]) AND ($3::uuid IS NULL OR audience_session=$3)',[p.tenant_id,kinds(p.role),p.role==='guest'?p.id:null])).rows[0].seq);
      requireValue(throughSeq<=latest,'INVALID_CURSOR','Cursor notifikasi tidak valid.',422);
      await c.query('INSERT INTO notification_reads(tenant_id,principal_id,through_seq) VALUES($1,$2,$3) ON CONFLICT(tenant_id,principal_id) DO UPDATE SET through_seq=GREATEST(notification_reads.through_seq,excluded.through_seq)',[p.tenant_id,p.user_id || p.id,throughSeq]);
    });send(res,{read:true});
  }));
}
module.exports={registerNotifications,kinds};
