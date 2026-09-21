'use strict';
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const { z } = require('zod');
const QRCode = require('qrcode');
const { AppError, requireValue } = require('../shared/errors');
const { createIdentity, verifyPassword, hashPassword, hash, tableToken, safeEqual } = require('../modules/identity');
const { createOrders, catalog, orderView } = require('../modules/orders');
const { audit, emit, idempotent } = require('../modules/transactions');
const { createAiService } = require('../modules/ai-service');
const { registerAdminRoutes } = require('./admin-routes');
const { decryptSecret,encryptSecret,generateEnrollment,verifyTotp,generateRecoveryCodes,hashRecoveryCode }=require('../modules/mfa');

const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const uuid = z.string().uuid();
const lineSchema = z.object({ menuId: idSchema, qty: z.number().int().min(1).max(99), optionIds: z.array(idSchema).max(30).default([]) }).strict();
const cartSchema = z.object({ expectedVersion: z.number().int().positive(), lines: z.array(lineSchema).max(50) }).strict();
const staffRoles = ['owner','manager','cashier','kitchen','waiter'];

function createApp({ db, config, aiProvider }) {
  const app = express();
  const root=path.resolve(__dirname,'../..');
  const publicRoot=path.join(root,'public');
  const customerHtml=fs.readFileSync(path.join(root,'index.html'),'utf8')
    .replace('src="js/app.js"','src="js/customer-v18.js"')
    .replace('</head>','<link rel="stylesheet" href="css/customer-v18.css"></head>');
  const inlineHashes=[...customerHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map(match=>"'sha256-"+crypto.createHash('sha256').update(match[1]).digest('base64')+"'");
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  app.use(helmet({ contentSecurityPolicy: {useDefaults:false,directives:{
    defaultSrc:["'self'"],scriptSrc:["'self'",...inlineHashes],scriptSrcAttr:["'none'"],
    styleSrc:["'self'","'unsafe-inline'",'https://fonts.googleapis.com'],
    imgSrc:["'self'",'https:','data:','blob:'],fontSrc:["'self'",'https://fonts.gstatic.com','data:'],
    connectSrc:["'self'"],objectSrc:["'none'"],baseUri:["'self'"],frameAncestors:["'none'"],
    formAction:["'self'"],workerSrc:["'self'"],
    ...(config.NODE_ENV==='production'?{upgradeInsecureRequests:[]}:{}),
  }},crossOriginEmbedderPolicy:false }));
  app.use(express.json({ limit: '128kb' }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control','no-store');
    if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
      const origin = req.get('origin');
      if (origin && origin !== new URL(config.PUBLIC_BASE_URL).origin) {
        return next(new AppError('ORIGIN_DENIED','Origin tidak diizinkan.',403));
      }
    }
    next();
  });
  const identity = createIdentity(db,config);
  const orders = createOrders(db);
  const ai = createAiService(db,config,{provider:aiProvider});
  const wrap = fn => (req,res,next) => Promise.resolve(fn(req,res)).catch(next);
  const send = (res, data, status = 200) => res.status(status).json({ success:true, data, requestId:res.getHeader('X-Request-Id') });
  const valid = (schema, value) => {
    const result = schema.safeParse(value);
    if (!result.success) throw new AppError('VALIDATION_ERROR','Periksa isian permintaan.',422,
      result.error.issues.map(i => ({ field:i.path.join('.'),message:i.message })));
    return result.data;
  };
  const tenantId = req => valid(idSchema, req.query.merchant || req.headers['x-merchant-id']);
  const key = req => req.get('Idempotency-Key');
  const admin = identity.allow(...staffRoles);
  const manage = identity.allow('owner','manager');
  const cashier = identity.allow('owner','manager','cashier');
  const guest = identity.allow('guest');
  const tx = (req, fn) => db.transaction(req.principal.tenant_id, fn);
  const limited = (name, limit, seconds) => async (req,res) => {
    const scope = hash(`${name}:${req.principal?.id || req.ip}`);
    const result = await db.pool.query(`INSERT INTO rate_limits(key,count,reset_at) VALUES($1,1,now()+($2*interval '1 second'))
      ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.reset_at<=now() THEN 1 ELSE rate_limits.count+1 END,
      reset_at=CASE WHEN rate_limits.reset_at<=now() THEN excluded.reset_at ELSE rate_limits.reset_at END RETURNING count`,[scope,seconds]);
    if (result.rows[0].count > limit) { res.setHeader('Retry-After',String(seconds)); throw new AppError('RATE_LIMITED','Terlalu banyak permintaan.',429); }
    return true;
  };
  // Rate middleware deliberately calls next only after the persistent counter succeeds.
  const rate = (name,limit,seconds) => (req,res,next) => limited(name,limit,seconds)(req,res).then(() => next(),next);

  app.get('/api/health',wrap(async (_req,res) => {
    await db.pool.query('SELECT 1'); send(res,{status:'ok',version:18});
  }));
  app.get('/api/v1/merchants',wrap(async (_req,res) => {
    send(res,(await db.pool.query('SELECT id,name,currency FROM tenants WHERE published ORDER BY name')).rows);
  }));
  app.get('/api/v1/menu',wrap(async (req,res) => {
    const id=tenantId(req);
    const t=(await db.pool.query('SELECT * FROM tenants WHERE id=$1 AND published',[id])).rows[0];
    requireValue(t,'NOT_FOUND','Outlet tidak ditemukan.',404);
    const items=await db.transaction(id,c => catalog(c,id));
    send(res,{merchant:{id:t.id,name:t.name,currency:t.currency,taxRate:t.config.taxRate || 0,serviceRate:t.config.serviceRate || 0,
      orderingPaused:!!t.config.orderingPaused,language:t.config.language || 'id',paymentMethods:['CASH','MANUAL_TRANSFER']},items});
  }));
  app.post('/api/v1/auth/login',rate('login',10,900),wrap(async (req,res) => {
    const b=valid(z.object({email:z.email().max(200),password:z.string().max(256),merchantId:idSchema,otp:z.string().max(60).optional(),recoveryCode:z.string().max(60).optional()}).strict(),req.body);
    const user=(await db.pool.query('SELECT * FROM users WHERE email=$1 AND NOT disabled',[b.email.toLowerCase()])).rows[0];
    const ok=user && await verifyPassword(b.password,user.password_hash);
    requireValue(ok,'LOGIN_FAILED','Email atau kata sandi salah.',401);
    const membership=await db.transaction(b.merchantId,c => c.query('SELECT role FROM memberships WHERE tenant_id=$1 AND user_id=$2',[b.merchantId,user.id]));
    requireValue(membership.rowCount,'LOGIN_FAILED','Akses outlet tidak tersedia.',401);
    const mfaVerified=await db.transaction(b.merchantId,async c=>{
      const current=(await c.query('SELECT * FROM users WHERE id=$1 AND NOT disabled FOR UPDATE',[user.id])).rows[0];
      requireValue(current && current.password_hash===user.password_hash,'LOGIN_FAILED','Kredensial telah berubah.',401);
      if(!current.mfa_secret)return false;
      if(b.recoveryCode){
        const consumed=await c.query('UPDATE mfa_recovery_codes SET used_at=now() WHERE user_id=$1 AND code_hash=$2 AND used_at IS NULL RETURNING user_id',[user.id,hashRecoveryCode(b.recoveryCode)]);
        requireValue(consumed.rowCount,'MFA_INVALID','Kode verifikasi tidak valid.',401);
      }else{
        const step=verifyTotp(decryptSecret(current.mfa_secret,config.SESSION_SECRET,user.id),b.otp,current.mfa_last_step,Date.now());
        requireValue(step!==null,'MFA_INVALID','Kode verifikasi tidak valid atau telah digunakan.',401);
        await c.query('UPDATE users SET mfa_last_step=$2 WHERE id=$1',[user.id,step]);
      }
      return true;
    });
    const session=await identity.session(b.merchantId,user.id,null,mfaVerified);
    identity.setCookie(res,session); send(res,{csrfToken:session.csrf,role:membership.rows[0].role,tenantId:b.merchantId,
      mfaRequired:!mfaVerified && config.NODE_ENV==='production' && membership.rows[0].role==='owner'});
  }));
  app.post('/api/v1/session',rate('qr-exchange',30,60),wrap(async (req,res) => {
    const b=valid(z.object({merchantId:idSchema,tableId:z.number().int().min(1).max(999),token:z.string().min(20).max(100)}).strict(),req.body);
    const table=await db.transaction(b.merchantId,async c => (await c.query(`SELECT d.* FROM dining_tables d JOIN tenants t ON t.id=d.tenant_id
      WHERE d.tenant_id=$1 AND d.id=$2 AND d.active AND t.published`,[b.merchantId,b.tableId])).rows[0]);
    requireValue(table && safeEqual(b.token,tableToken(config,b.merchantId,b.tableId,table.qr_version)),'QR_INVALID','QR tidak valid atau telah dicabut.',403);
    const session=await identity.session(b.merchantId,null,b.tableId);
    await db.transaction(b.merchantId,c => orders.getCart(c,{tenant_id:b.merchantId,id:session.id}));
    identity.setCookie(res,session); send(res,{csrfToken:session.csrf,tenantId:b.merchantId,tableId:b.tableId,role:'guest'});
  }));
  app.post('/api/v1/auth/accept-invitation',rate('invite-accept',10,900),wrap(async(req,res)=>{
    const b=valid(z.object({tenantId:idSchema,id:uuid,token:z.string().min(30).max(100),password:z.string().min(12).max(256),otp:z.string().max(6).optional()}).strict(),req.body);
    await db.transaction(b.tenantId,async c=>{
      const invitation=(await c.query('SELECT * FROM staff_invitations WHERE tenant_id=$1 AND id=$2 AND accepted_at IS NULL AND expires_at>now() FOR UPDATE',[b.tenantId,b.id])).rows[0];
      requireValue(invitation&&safeEqual(hash(b.token),invitation.token_hash),'INVITATION_INVALID','Undangan tidak valid atau kedaluwarsa.',403);
      let user=(await c.query('SELECT * FROM users WHERE email=$1 FOR UPDATE',[invitation.email])).rows[0];
      if(user){
        requireValue(!user.disabled&&await verifyPassword(b.password,user.password_hash),'LOGIN_FAILED','Masukkan kata sandi akun yang sudah ada.',401);
        if(user.mfa_secret){
          const step=verifyTotp(decryptSecret(user.mfa_secret,config.SESSION_SECRET,user.id),b.otp,user.mfa_last_step,Date.now());
          requireValue(step!==null,'MFA_INVALID','Kode verifikasi diperlukan.',401);await c.query('UPDATE users SET mfa_last_step=$2 WHERE id=$1',[user.id,step]);
        }
      }else user=(await c.query('INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3) RETURNING id',[crypto.randomUUID(),invitation.email,await hashPassword(b.password)])).rows[0];
      await c.query('INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[b.tenantId,user.id,invitation.role]);
      await c.query('UPDATE staff_invitations SET accepted_at=now() WHERE tenant_id=$1 AND id=$2',[b.tenantId,b.id]);
      await audit(c,{tenant_id:b.tenantId,user_id:user.id},'INVITATION_ACCEPTED',b.id);
    });send(res,{accepted:true});
  }));
  const api=express.Router();
  api.use(identity.authenticate);
  api.get('/session',wrap(async (req,res) => send(res,{csrfToken:req.csrfToken,tenantId:req.principal.tenant_id,
    tableId:req.principal.table_id,role:req.principal.role,mfaRequired:!!req.principal.mfaRequired,expiresAt:req.principal.expires_at})));
  api.post('/auth/mfa/enroll',rate('mfa-enroll',5,900),wrap(async(req,res)=>{
    requireValue(req.principal.user_id,'FORBIDDEN','Akun staf diperlukan.',403);
    const b=valid(z.object({password:z.string().max(256)}).strict(),req.body);
    const enrollment=await tx(req,async c=>{
      const user=(await c.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[req.principal.user_id])).rows[0];
      requireValue(!user.mfa_secret,'MFA_ALREADY_ENABLED','MFA telah aktif.',409);
      requireValue(await verifyPassword(b.password,user.password_hash),'LOGIN_FAILED','Kata sandi salah.',401);
      const value=generateEnrollment(user.email);
      await c.query("UPDATE users SET mfa_pending=$2,mfa_pending_expires_at=now()+interval '10 minutes' WHERE id=$1",[user.id,encryptSecret(value.secret,config.SESSION_SECRET,user.id)]);
      return value;
    });send(res,enrollment);
  }));
  api.post('/auth/mfa/verify',rate('mfa-verify',10,900),wrap(async(req,res)=>{
    requireValue(req.principal.user_id,'FORBIDDEN','Akun staf diperlukan.',403);
    const b=valid(z.object({otp:z.string().regex(/^\d{6}$/)}).strict(),req.body);
    const codes=await tx(req,async c=>{
      const user=(await c.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[req.principal.user_id])).rows[0];
      requireValue(!user.mfa_secret && user.mfa_pending && new Date(user.mfa_pending_expires_at)>new Date(),'MFA_EXPIRED','Pendaftaran MFA kedaluwarsa.',409);
      const step=verifyTotp(decryptSecret(user.mfa_pending,config.SESSION_SECRET,user.id),b.otp,-1,Date.now());
      requireValue(step!==null,'MFA_INVALID','Kode verifikasi salah.',401);
      await c.query('UPDATE users SET mfa_secret=mfa_pending,mfa_pending=NULL,mfa_pending_expires_at=NULL,mfa_last_step=$2 WHERE id=$1',[user.id,step]);
      const recovery=generateRecoveryCodes();
      for(const codeHash of recovery.hashes)await c.query('INSERT INTO mfa_recovery_codes(user_id,code_hash) VALUES($1,$2)',[user.id,codeHash]);
      await c.query('UPDATE sessions SET revoked=true WHERE user_id=$1',[user.id]);
      await audit(c,req.principal,'MFA_ENABLED',user.id);return recovery.codes;
    });
    const replacement=await identity.session(req.principal.tenant_id,req.principal.user_id,null,true);
    identity.setCookie(res,replacement);send(res,{recoveryCodes:codes,csrfToken:replacement.csrf});
  }));
  api.post('/auth/logout',wrap(async (req,res) => {
    await db.pool.query('UPDATE sessions SET revoked=true WHERE id=$1',[req.principal.id]);
    res.clearCookie('aiodma_session',{path:'/'});send(res,{});
  }));
  api.post('/ai/chat',guest,rate('ai-chat',20,60),wrap(async(req,res)=>{
    const b=valid(z.object({messageId:uuid,message:z.string().trim().min(1).max(2000),language:z.enum(['id','en','ms']).default('id')}).strict(),req.body);
    const controller=new AbortController();
    res.once('close',()=>{if(!res.writableEnded)controller.abort();});
    send(res,await ai.chat(req.principal,b,controller.signal));
  }));
  api.post('/ai/proposals/:id/confirm',guest,rate('ai-confirm',20,60),wrap(async(req,res)=>{
    const b=valid(z.object({messageId:uuid,expectedVersion:z.number().int().positive()}).strict(),req.body);
    send(res,await ai.confirm(req.principal,valid(uuid,req.params.id),b,key(req)));
  }));
  api.get('/profile',guest,wrap(async(req,res)=>{
    const row=(await tx(req,c=>c.query("SELECT content FROM tenant_resources WHERE tenant_id=$1 AND kind='profile' AND id=$2",[req.principal.tenant_id,req.principal.id]))).rows[0];
    send(res,row?.content || {consent:false,preferences:[]});
  }));
  api.put('/profile',guest,wrap(async(req,res)=>{
    const b=valid(z.object({consent:z.literal(true),preferences:z.array(z.string().trim().min(1).max(200)).max(20)}).strict(),req.body);
    await tx(req,c=>c.query("INSERT INTO tenant_resources(tenant_id,kind,id,content) VALUES($1,'profile',$2,$3) ON CONFLICT(tenant_id,kind,id) DO UPDATE SET content=excluded.content,version=tenant_resources.version+1,updated_at=now()",[req.principal.tenant_id,req.principal.id,JSON.stringify(b)]));send(res,b);
  }));
  api.delete('/profile',guest,wrap(async(req,res)=>{
    await tx(req,async c=>{
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[req.principal.id]);
      await c.query("DELETE FROM tenant_resources WHERE tenant_id=$1 AND kind='profile' AND id=$2",[req.principal.tenant_id,req.principal.id]);
      await c.query('DELETE FROM ai_proposals WHERE tenant_id=$1 AND session_id=$2',[req.principal.tenant_id,req.principal.id]);
      await c.query('DELETE FROM ai_messages WHERE tenant_id=$1 AND session_id=$2',[req.principal.tenant_id,req.principal.id]);
    });send(res,{consent:false,preferences:[]});
  }));
  api.get('/cart',guest,wrap(async (req,res) => send(res,await tx(req,c => orders.getCart(c,req.principal)))));
  api.put('/cart',guest,wrap(async (req,res) => send(res,await orders.replaceCart(req.principal,valid(cartSchema,req.body),key(req)))));
  api.post('/quotes',guest,wrap(async (req,res) => send(res,await orders.quote(req.principal,valid(z.object({expectedVersion:z.number().int().positive(),promoCode:idSchema.optional()}).strict(),req.body)),201)));
  api.post('/orders',guest,wrap(async (req,res) => send(res,await orders.submit(req.principal,valid(z.object({quoteId:uuid,confirmed:z.literal(true),paymentMethod:z.enum(['CASH','MANUAL_TRANSFER'])}).strict(),req.body),key(req)),201)));
  api.get('/orders',wrap(async (req,res) => {
    requireValue(!req.principal.mfaRequired,'MFA_REQUIRED','Verifikasi MFA diperlukan.',403);
    const rows=await tx(req,c => c.query(`SELECT * FROM orders WHERE tenant_id=$1 ${req.principal.role === 'guest' ? 'AND session_id=$2' : ''}
      ORDER BY created_at DESC LIMIT 200`,req.principal.role === 'guest' ? [req.principal.tenant_id,req.principal.id] : [req.principal.tenant_id]));
    send(res,rows.rows.map(orderView));
  }));
  api.get('/orders/:id',wrap(async (req,res) => {
    requireValue(!req.principal.mfaRequired,'MFA_REQUIRED','Verifikasi MFA diperlukan.',403);
    const id=valid(uuid,req.params.id);
    const row=await tx(req,async c => (await c.query(`SELECT * FROM orders WHERE tenant_id=$1 AND id=$2 ${req.principal.role === 'guest' ? 'AND session_id=$3' : ''}`,
      req.principal.role === 'guest' ? [req.principal.tenant_id,id,req.principal.id] : [req.principal.tenant_id,id])).rows[0]);
    requireValue(row,'NOT_FOUND','Pesanan tidak ditemukan.',404);send(res,orderView(row));
  }));
  api.get('/submissions/:key',guest,wrap(async (req,res) => {
    const saved=await tx(req,c => c.query("SELECT response FROM idempotency_records WHERE tenant_id=$1 AND principal_id=$2 AND operation='order' AND key=$3",[req.principal.tenant_id,req.principal.id,req.params.key]));
    send(res,{found:!!saved.rowCount,order:saved.rows[0]?.response || null});
  }));
  api.patch('/admin/orders/:id/status',identity.allow('owner','manager','kitchen','cashier'),wrap(async (req,res) => send(res,await orders.transition(req.principal,
    valid(uuid,req.params.id),valid(z.object({status:z.enum(['accepted','preparing','ready','served','completed','cancelled','rejected']),expectedVersion:z.number().int().positive(),reason:z.string().max(300).optional()}).strict(),req.body),key(req)))));
  api.patch('/admin/orders/:id/payment',cashier,wrap(async (req,res) => send(res,await orders.payment(req.principal,
    valid(uuid,req.params.id),valid(z.object({expectedVersion:z.number().int().positive(),amountMinor:z.number().int().positive(),reference:z.string().min(3).max(200)}).strict(),req.body),key(req)))));

  api.post('/waiter-calls',guest,rate('waiter',6,60),wrap(async (req,res) => {
    const b=valid(z.object({reason:z.string().trim().min(3).max(300)}).strict(),req.body);
    const result=await tx(req,c => idempotent(c,req.principal,'waiter',key(req),b,async () => {
      const p=req.principal;
      await orders.getCart(c,p,true);
      const existing=await c.query("SELECT * FROM waiter_calls WHERE tenant_id=$1 AND session_id=$2 AND status<>'resolved' ORDER BY created_at DESC LIMIT 1",[p.tenant_id,p.id]);
      if(existing.rowCount)return existing.rows[0];
      const call=(await c.query('INSERT INTO waiter_calls(tenant_id,id,session_id,table_id,reason) VALUES($1,$2,$3,$4,$5) RETURNING *',[p.tenant_id,crypto.randomUUID(),p.id,p.table_id,b.reason])).rows[0];
      await emit(c,p.tenant_id,'CALL_WAITER',{call},p.id);return call;
    }));send(res,result,201);
  }));
  api.get('/admin/waiter-calls',admin,wrap(async (req,res) => send(res,(await tx(req,c => c.query('SELECT * FROM waiter_calls WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 200',[req.principal.tenant_id]))).rows)));
  api.patch('/admin/waiter-calls/:id',admin,wrap(async (req,res) => {
    const b=valid(z.object({status:z.enum(['acknowledged','resolved']),expectedVersion:z.number().int().positive()}).strict(),req.body);
    const result=await tx(req,async c => {
      const r=await c.query("UPDATE waiter_calls SET status=$3,version=version+1 WHERE tenant_id=$1 AND id=$2 AND version=$4 AND status<> 'resolved' RETURNING *",[req.principal.tenant_id,valid(uuid,req.params.id),b.status,b.expectedVersion]);
      requireValue(r.rowCount,'STALE_CALL','Panggilan telah berubah.',409);
      await emit(c,req.principal.tenant_id,'WAITER_CALL_UPDATED',{call:r.rows[0]},r.rows[0].session_id);
      await audit(c,req.principal,'WAITER_CALL_UPDATED',req.params.id,{status:b.status});return r.rows[0];
    });send(res,result);
  }));
  api.get('/admin/tables',admin,wrap(async (req,res) => send(res,(await tx(req,c => c.query('SELECT id,active,qr_version FROM dining_tables WHERE tenant_id=$1 ORDER BY id',[req.principal.tenant_id]))).rows)));
  api.get('/admin/tables/:id/qr',admin,wrap(async (req,res) => {
    const id=valid(z.coerce.number().int().min(1).max(999),req.params.id),tenant=req.principal.tenant_id;
    const table=(await tx(req,c => c.query('SELECT * FROM dining_tables WHERE tenant_id=$1 AND id=$2 AND active',[tenant,id]))).rows[0];
    requireValue(table,'NOT_FOUND','Meja tidak ditemukan.',404);
    const url=new URL('/',config.PUBLIC_BASE_URL);
    url.search=new URLSearchParams({merchant:tenant,table:String(id),token:tableToken(config,tenant,id,table.qr_version)}).toString();
    const svg=await QRCode.toString(url.href,{type:'svg',errorCorrectionLevel:'M',margin:4,width:320});
    send(res,{url:url.href,svg});
  }));
  api.get('/admin/menu',admin,wrap(async (req,res) => send(res,await tx(req,c => catalog(c,req.principal.tenant_id)))));
  const optionSchema=z.object({id:idSchema,name:z.string().min(1).max(150),price:z.number().min(0).max(100000000),available:z.boolean().optional()});
  const menuSchema=z.object({id:idSchema,name:z.string().min(1).max(150),price:z.number().min(0).max(100000000),category:z.string().max(80),desc:z.string().max(2000).default(''),
    image:z.string().max(500).regex(/^(assets\/|https:\/\/)/).optional(),available:z.boolean(),
    modifierGroups:z.array(z.object({id:idSchema,min:z.number().int().min(0),max:z.number().int().min(0),options:z.array(optionSchema).max(30)})).max(10).default([])}).strict();
  api.post('/admin/menu',manage,wrap(async (req,res) => {
    const b=valid(menuSchema,req.body);
    requireValue(b.modifierGroups.every(g=>g.min<=g.max && g.max<=g.options.length),'INVALID_MODIFIERS','Batas modifier tidak valid.');
    const data=await tx(req,async c=>{
      await c.query('INSERT INTO catalog_items(tenant_id,id,content,available) VALUES($1,$2,$3,$4)',[req.principal.tenant_id,b.id,JSON.stringify(b),b.available]);
      await audit(c,req.principal,'MENU_CREATED',b.id);await emit(c,req.principal.tenant_id,'MENU_UPDATED',{menuId:b.id});return b;
    });send(res,data,201);
  }));
  api.put('/admin/menu/:id',manage,wrap(async (req,res) => {
    const b=valid(z.object({item:menuSchema,expectedVersion:z.number().int().positive()}).strict(),req.body);
    requireValue(b.item.id===req.params.id,'ID_MISMATCH','ID menu tidak cocok.');
    const data=await tx(req,async c=>{
      const r=await c.query('UPDATE catalog_items SET content=$3,available=$4,version=version+1 WHERE tenant_id=$1 AND id=$2 AND version=$5 RETURNING version',
        [req.principal.tenant_id,b.item.id,JSON.stringify(b.item),b.item.available,b.expectedVersion]);
      requireValue(r.rowCount,'STALE_MENU','Menu telah berubah.',409);await audit(c,req.principal,'MENU_UPDATED',b.item.id);
      await emit(c,req.principal.tenant_id,'MENU_UPDATED',{menuId:b.item.id});return {...b.item,version:r.rows[0].version};
    });send(res,data);
  }));
  api.get('/admin/audit',identity.allow('owner','manager'),wrap(async(req,res)=>send(res,(await tx(req,c=>c.query('SELECT * FROM audit_events WHERE tenant_id=$1 ORDER BY seq DESC LIMIT 200',[req.principal.tenant_id]))).rows)));
  api.get('/admin/stats',cashier,wrap(async(req,res)=>{
    const rows=await tx(req,c=>c.query("SELECT kind,COALESCE(sum(amount_minor),0)::text AS amount FROM payment_events WHERE tenant_id=$1 GROUP BY kind",[req.principal.tenant_id]));
    const amounts=Object.fromEntries(rows.rows.map(r=>[r.kind,Number(r.amount)]));send(res,{settledMinor:amounts.settlement||0,refundedMinor:amounts.refund||0,netMinor:(amounts.settlement||0)-(amounts.refund||0)});
  }));

  api.get('/events',wrap(async(req,res)=>{
    requireValue(!req.principal.mfaRequired,'MFA_REQUIRED','Verifikasi MFA diperlukan.',403);
    const p=req.principal;
    let cursor=Number(req.get('Last-Event-ID') || req.query.cursor || 0);
    requireValue(Number.isSafeInteger(cursor)&&cursor>=0,'INVALID_CURSOR','Cursor tidak valid.');
    res.setHeader('Content-Type','text/event-stream');res.setHeader('Cache-Control','no-cache');res.setHeader('X-Accel-Buffering','no');res.flushHeaders();
    let closed=false,busy=false;
    const close=()=>{closed=true;clearInterval(timer);res.end();};
    const pump=async()=>{
      if(closed||busy)return;busy=true;
      try {
        const live=await db.pool.query(`SELECT 1 FROM sessions s LEFT JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND NOT s.revoked AND s.expires_at>now()
          AND (s.user_id IS NULL OR (NOT u.disabled AND s.last_seen_at>now()-interval '30 minutes'))`,[p.id]);
        if(!live.rowCount)return close();
        const permitted=await db.transaction(p.tenant_id,c=>p.role==='guest'
          ?c.query('SELECT 1 FROM dining_tables WHERE tenant_id=$1 AND id=$2 AND active',[p.tenant_id,p.table_id])
          :c.query('SELECT 1 FROM memberships WHERE tenant_id=$1 AND user_id=$2 AND role=$3',[p.tenant_id,p.user_id,p.role]));
        if(!permitted.rowCount)return close();
        const rows=await db.transaction(p.tenant_id,c=>c.query(`SELECT * FROM outbox_events WHERE tenant_id=$1 AND seq>$2
          ${p.role==='guest' ? 'AND (audience_session=$3 OR kind=\'MENU_UPDATED\')' : ''} ORDER BY seq LIMIT 100`,p.role==='guest'?[p.tenant_id,cursor,p.id]:[p.tenant_id,cursor]));
        for(const e of rows.rows){cursor=Number(e.seq);if(!res.write(`id: ${cursor}\ndata: ${JSON.stringify({id:e.id,type:e.kind,...e.payload})}\n\n`))return close();}
        res.write(': heartbeat\n\n');
      }catch{close();}finally{busy=false;}
    };
    const timer=setInterval(pump,1000);req.on('close',()=>{closed=true;clearInterval(timer);});await pump();
  }));
  registerAdminRoutes(api,{db,config,identity,wrap,valid,send,tx});
  app.use('/api/v1',api);
  app.use('/api',(_req,_res,next)=>next(new AppError('NOT_FOUND','Endpoint tidak tersedia.',404)));
  for(const folder of ['assets','css'])app.use('/'+folder,express.static(path.join(publicRoot,folder),{dotfiles:'deny',index:false}));
  for(const file of ['customer-v18.js','admin-v18.js'])app.get('/js/'+file,(_req,res)=>res.sendFile(path.join(publicRoot,'js',file)));
  app.get(['/', '/index.html'],(_req,res)=>res.set('Cache-Control','no-store').type('html').send(customerHtml));
  app.get('/admin.html',(_req,res)=>res.set('Cache-Control','no-store').sendFile(path.join(root,'admin-v18.html')));
  app.get('/manifest.json',(_req,res)=>res.sendFile(path.join(publicRoot,'manifest.json')));
  app.get('/sw.js',(_req,res)=>res.set('Cache-Control','no-cache').sendFile(path.join(publicRoot,'sw.js')));
  app.use((_req,_res,next)=>next(new AppError('NOT_FOUND','Halaman tidak ditemukan.',404)));
  app.use((error,req,res,_next)=>{
    if(res.headersSent)return res.end();
    let status=error.status || (error.code==='23505'?409:500);
    if(status>=500)console.error(JSON.stringify({event:'request_failed',requestId:req.requestId,code:error.code || 'INTERNAL_ERROR'}));
    res.status(status).json({success:false,error:{code:status===500?'INTERNAL_ERROR':error.code || 'INVALID_REQUEST',
      message:status>=500?'Layanan belum tersedia. Coba lagi nanti.':error.message,fieldErrors:error.details,retryable:status>=500},requestId:req.requestId});
  });
  return app;
}
module.exports={createApp};
