'use strict';
const crypto=require('node:crypto');
const {z}=require('zod');
const {requireValue}=require('../shared/errors');
const {hash}=require('../modules/identity');
const {audit,emit,idempotent}=require('../modules/transactions');
const {orderView}=require('../modules/orders');

function registerAdminRoutes(api,{db,config,identity,wrap,valid,send,tx}) {
  const manage=identity.allow('owner','manager'),owner=identity.allow('owner');
  const uuid=z.string().uuid(),id=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
  const knowledge=z.object({title:z.string().trim().min(1).max(200),text:z.string().trim().min(1).max(4000),status:z.enum(['draft','published','archived'])}).strict();
  const promo=z.object({type:z.enum(['percent','fixed']),value:z.number().min(0).max(100000000),minSpend:z.number().min(0).optional(),
    maxDiscount:z.number().min(0).optional(),limit:z.number().int().positive().optional(),active:z.boolean(),
    startsAt:z.iso.datetime({offset:true}).optional(),endsAt:z.iso.datetime({offset:true}).optional()}).strict();
  const kindSchema=z.enum(['knowledge','promo']);
  api.get('/admin/resources/:kind',manage,wrap(async(req,res)=>{
    const kind=valid(kindSchema,req.params.kind);
    send(res,(await tx(req,c=>c.query('SELECT id,content,version,updated_at FROM tenant_resources WHERE tenant_id=$1 AND kind=$2 ORDER BY updated_at DESC LIMIT 200',[req.principal.tenant_id,kind]))).rows);
  }));
  const saveResource=wrap(async(req,res)=>{
    const kind=valid(kindSchema,req.params.kind);
    const b=valid(z.object({id,expectedVersion:z.number().int().min(0),content:kind==='knowledge'?knowledge:promo}).strict(),req.body);
    if(kind==='promo') {
      requireValue(b.content.type!=='percent'||b.content.value<=100,'INVALID_PROMO','Persentase maksimal 100.');
      requireValue(!b.content.startsAt||!b.content.endsAt||new Date(b.content.startsAt)<new Date(b.content.endsAt),'INVALID_PERIOD','Tanggal berakhir harus setelah tanggal mulai.');
    }
    const row=await tx(req,async c=>{
      let result;
      if(b.expectedVersion===0)result=await c.query('INSERT INTO tenant_resources(tenant_id,kind,id,content) VALUES($1,$2,$3,$4) RETURNING *',[req.principal.tenant_id,kind,b.id,JSON.stringify(b.content)]);
      else result=await c.query(`UPDATE tenant_resources SET content=$4::jsonb || CASE WHEN kind='promo' THEN jsonb_build_object('redemptions',COALESCE((content->>'redemptions')::integer,0)) ELSE '{}'::jsonb END,
        version=version+1,updated_at=now() WHERE tenant_id=$1 AND kind=$2 AND id=$3 AND version=$5 RETURNING *`,[req.principal.tenant_id,kind,b.id,JSON.stringify(b.content),b.expectedVersion]);
      requireValue(result.rowCount,'RESOURCE_STALE','Data telah berubah. Muat ulang.',409);
      await audit(c,req.principal,kind.toUpperCase()+'_SAVED',b.id,{version:result.rows[0].version});return result.rows[0];
    });send(res,row,b.expectedVersion?200:201);
  });
  api.post('/admin/resources/:kind',manage,saveResource);
  api.put('/admin/resources/:kind',manage,saveResource);
  api.get('/admin/settings',manage,wrap(async(req,res)=>{
    const t=(await db.pool.query('SELECT id,name,currency,config,version,published FROM tenants WHERE id=$1',[req.principal.tenant_id])).rows[0];send(res,t);
  }));
  api.post('/admin/settings',owner,wrap(async(req,res)=>{
    const b=valid(z.object({expectedVersion:z.number().int().positive(),name:z.string().trim().min(1).max(150).optional(),config:z.object({
      orderingPaused:z.boolean(),timezone:z.string().max(80),taxRate:z.number().min(0).max(100),serviceRate:z.number().min(0).max(100),language:z.enum(['id','en','ms'])}).strict()}).strict(),req.body);
    try{new Intl.DateTimeFormat('en',{timeZone:b.config.timezone});}catch{requireValue(false,'INVALID_TIMEZONE','Zona waktu tidak valid.');}
    const row=await tx(req,async c=>{
      const result=await c.query('UPDATE tenants SET name=COALESCE($3,name),config=$4,version=version+1 WHERE id=$1 AND version=$2 RETURNING id,name,currency,config,version,published',
        [req.principal.tenant_id,b.expectedVersion,b.name || null,JSON.stringify(b.config)]);
      requireValue(result.rowCount,'SETTINGS_STALE','Pengaturan telah berubah.',409);
      await audit(c,req.principal,'SETTINGS_UPDATED',req.principal.tenant_id,b.config);await emit(c,req.principal.tenant_id,'MENU_UPDATED',{settingsChanged:true});return result.rows[0];
    });send(res,row);
  }));
  api.post('/admin/tables',manage,wrap(async(req,res)=>{
    const b=valid(z.object({id:z.number().int().min(1).max(999)}).strict(),req.body);
    await tx(req,async c=>{await c.query('INSERT INTO dining_tables(tenant_id,id) VALUES($1,$2)',[req.principal.tenant_id,b.id]);await audit(c,req.principal,'TABLE_CREATED',b.id);});send(res,{...b,active:true},201);
  }));
  api.patch('/admin/tables/:id',manage,wrap(async(req,res)=>{
    const b=valid(z.object({active:z.boolean(),rotate:z.boolean().default(false)}).strict(),req.body),tableId=valid(z.coerce.number().int().min(1).max(999),req.params.id);
    const row=await tx(req,async c=>{
      const r=await c.query('UPDATE dining_tables SET active=$3,qr_version=qr_version+$4 WHERE tenant_id=$1 AND id=$2 RETURNING *',[req.principal.tenant_id,tableId,b.active,b.rotate?1:0]);
      requireValue(r.rowCount,'NOT_FOUND','Meja tidak ditemukan.',404);
      if(!b.active||b.rotate)await c.query('UPDATE sessions SET revoked=true WHERE tenant_id=$1 AND table_id=$2',[req.principal.tenant_id,tableId]);
      await audit(c,req.principal,'TABLE_UPDATED',tableId,b);return r.rows[0];
    });send(res,row);
  }));
  api.delete('/admin/menu/:id',manage,wrap(async(req,res)=>{
    const b=valid(z.object({expectedVersion:z.number().int().positive()}).strict(),req.body);
    await tx(req,async c=>{
      const r=await c.query('UPDATE catalog_items SET archived=true,available=false,version=version+1 WHERE tenant_id=$1 AND id=$2 AND version=$3 RETURNING id',[req.principal.tenant_id,valid(id,req.params.id),b.expectedVersion]);
      requireValue(r.rowCount,'MENU_STALE','Menu telah berubah.',409);await audit(c,req.principal,'MENU_ARCHIVED',req.params.id);await emit(c,req.principal.tenant_id,'MENU_UPDATED',{menuId:req.params.id});
    });send(res,{});
  }));
  api.post('/admin/orders/:id/refund',owner,wrap(async(req,res)=>{
    const b=valid(z.object({expectedVersion:z.number().int().positive(),amountMinor:z.number().int().positive(),reference:z.string().trim().min(3).max(200)}).strict(),req.body);
    const orderId=valid(uuid,req.params.id);
    const result=await tx(req,c=>idempotent(c,req.principal,'refund',req.get('Idempotency-Key'),{orderId,...b},async()=>{
      const o=(await c.query('SELECT * FROM orders WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[req.principal.tenant_id,orderId])).rows[0];
      requireValue(o,'NOT_FOUND','Pesanan tidak ditemukan.',404);
      requireValue(o.version===b.expectedVersion,'ORDER_STALE','Status berubah.',409);
      requireValue(['paid','partially_refunded'].includes(o.payment_status),'REFUND_DENIED','Pembayaran tidak dapat dikembalikan.',409);
      const refunded=Number((await c.query("SELECT COALESCE(sum(amount_minor),0) AS amount FROM payment_events WHERE tenant_id=$1 AND order_id=$2 AND kind='refund'",[req.principal.tenant_id,orderId])).rows[0].amount);
      requireValue(b.amountMinor+refunded<=o.snapshot.totalMinor,'REFUND_EXCEEDS_PAID','Jumlah melebihi pembayaran.',409);
      await c.query("INSERT INTO payment_events(tenant_id,id,order_id,kind,amount_minor,actor_id,reference) VALUES($1,$2,$3,'refund',$4,$5,$6)",
        [req.principal.tenant_id,crypto.randomUUID(),orderId,b.amountMinor,req.principal.user_id,b.reference]);
      const status=b.amountMinor+refunded===o.snapshot.totalMinor?'refunded':'partially_refunded';
      const updated=(await c.query('UPDATE orders SET payment_status=$3,version=version+1,updated_at=now() WHERE tenant_id=$1 AND id=$2 RETURNING *',[req.principal.tenant_id,orderId,status])).rows[0];
      await audit(c,req.principal,'MANUAL_REFUND_RECORDED',orderId,{amountMinor:b.amountMinor,reference:b.reference});
      await emit(c,req.principal.tenant_id,'ORDER_STATUS_CHANGED',{order:orderView(updated)},o.session_id);return orderView(updated);
    }));send(res,result);
  }));
  api.get('/admin/staff',owner,wrap(async(req,res)=>send(res,(await tx(req,c=>c.query('SELECT u.id,u.email,u.disabled,m.role,(u.mfa_secret IS NOT NULL) AS mfa_enabled FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.tenant_id=$1 ORDER BY u.email',[req.principal.tenant_id]))).rows)));
  api.post('/admin/invitations',owner,wrap(async(req,res)=>{
    const b=valid(z.object({email:z.email().max(200),role:z.enum(['owner','manager','cashier','kitchen','waiter'])}).strict(),req.body);
    const token=crypto.randomBytes(32).toString('base64url'),inviteId=crypto.randomUUID();
    await tx(req,async c=>{await c.query('INSERT INTO staff_invitations(tenant_id,id,email,role,token_hash) VALUES($1,$2,$3,$4,$5)',[req.principal.tenant_id,inviteId,b.email.toLowerCase(),b.role,hash(token)]);await audit(c,req.principal,'STAFF_INVITED',inviteId,{role:b.role});});
    const url=new URL('/admin.html',config.PUBLIC_BASE_URL);url.hash=new URLSearchParams({invite:inviteId,tenant:req.principal.tenant_id,token}).toString();
    send(res,{invitationUrl:url.href,delivery:'not_sent',expiresInHours:24},201);
  }));
  api.patch('/admin/staff/:id',owner,wrap(async(req,res)=>{
    const userId=valid(uuid,req.params.id),b=valid(z.object({role:z.enum(['owner','manager','cashier','kitchen','waiter']).optional(),revoke:z.boolean().default(false)}).strict(),req.body);
    await tx(req,async c=>{
      await c.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE',[req.principal.tenant_id]);
      const member=(await c.query('SELECT role FROM memberships WHERE tenant_id=$1 AND user_id=$2',[req.principal.tenant_id,userId])).rows[0];
      requireValue(member,'NOT_FOUND','Staf tidak ditemukan.',404);
      if(member.role==='owner'&&b.role&&b.role!=='owner'){
        const count=Number((await c.query("SELECT count(*) AS n FROM memberships WHERE tenant_id=$1 AND role='owner'",[req.principal.tenant_id])).rows[0].n);
        requireValue(count>1,'LAST_OWNER','Owner terakhir tidak dapat diturunkan.',409);
      }
      if(b.role)await c.query('UPDATE memberships SET role=$3 WHERE tenant_id=$1 AND user_id=$2',[req.principal.tenant_id,userId,b.role]);
      if(b.revoke||b.role)await c.query('UPDATE sessions SET revoked=true WHERE tenant_id=$1 AND user_id=$2',[req.principal.tenant_id,userId]);
      await audit(c,req.principal,'STAFF_ACCESS_UPDATED',userId,b);
    });send(res,{});
  }));
  api.get('/admin/ai-status',manage,wrap(async(req,res)=>{
    const rows=(await tx(req,c=>c.query('SELECT message_id,created_at,result FROM ai_messages WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 30',[req.principal.tenant_id]))).rows;
    send(res,{configured:!!(config.GEMINI_API_KEY&&config.AI_MODEL),model:config.AI_MODEL || null,liveVerified:false,
      visionEnabled:false,externalIntegrationsEnabled:false,runs:rows.map(r=>({id:r.message_id,createdAt:r.created_at,mode:r.result.mode,status:r.result.status,usage:r.result.usage || null}))});
  }));
}
module.exports={registerAdminRoutes};
