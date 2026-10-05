'use strict';
const crypto = require('node:crypto');
const { z } = require('zod');
const { hashPassword } = require('../modules/identity');
const { hashRecoveryCode } = require('../modules/mfa');
const { audit } = require('../modules/transactions');
const { requireValue } = require('../shared/errors');

function registerOnboarding(app, { db, identity, config, valid, wrap, send, rate }) {
  app.post('/api/v1/auth/register', rate('register', 5, 900), wrap(async (req, res) => {
    const body = valid(z.object({
      email: z.email().max(200).transform(value => value.toLowerCase()),
      password: z.string().min(12).max(256), name: z.string().trim().min(2).max(150),
      currency: z.enum(['BND', 'IDR']), language: z.enum(['id', 'en', 'ms']),
      timezone: z.string().min(1).max(80), tables: z.number().int().min(1).max(99)
    }).strict(), req.body);
    try { new Intl.DateTimeFormat('en', { timeZone: body.timezone }); }
    catch { requireValue(false, 'INVALID_TIMEZONE', 'Zona waktu tidak valid.', 422); }
    const tenantId = 'cafe_' + crypto.randomBytes(10).toString('hex');
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(body.password);
    const session = await db.transaction(tenantId, async client => {
      // The unique email insert serializes competing registrations before any outlet is created.
      const user = await client.query('INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO NOTHING RETURNING id',
        [userId, body.email, passwordHash]);
      requireValue(user.rowCount, 'ACCOUNT_EXISTS', 'Email sudah terdaftar. Silakan masuk atau pulihkan akun.', 409);
      await client.query('INSERT INTO tenants(id,name,currency,config) VALUES($1,$2,$3,$4)',
        [tenantId, body.name, body.currency, JSON.stringify({ timezone: body.timezone, language: body.language, taxRate: 0, serviceRate: 0, orderingPaused: false })]);
      await client.query('UPDATE users SET default_tenant_id=$2 WHERE id=$1', [userId, tenantId]);
      await client.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'owner')", [tenantId, userId]);
      await client.query('INSERT INTO dining_tables(tenant_id,id) SELECT $1,generate_series(1,$2::integer)', [tenantId, body.tables]);
      await audit(client, { tenant_id: tenantId, user_id: userId }, 'CAFE_REGISTERED', tenantId);
      return identity.session(tenantId, userId, null, false, client);
    });
    identity.setCookie(res, session);
    send(res, { tenantId, role: 'owner', csrfToken: session.csrf, mfaRequired: config.NODE_ENV === 'production' }, 201);
  }));

  app.post('/api/v1/auth/recover', rate('recover', 5, 900), wrap(async (req, res) => {
    const body = valid(z.object({ email: z.email().max(200), merchantId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
      recoveryCode: z.string().min(16).max(60), password: z.string().min(12).max(256) }).strict(), req.body);
    const codeHash = hashRecoveryCode(body.recoveryCode);
    const passwordHash = await hashPassword(body.password);
    await db.transaction(body.merchantId, async client => {
      const user = (await client.query('SELECT * FROM users WHERE email=$1 AND NOT disabled FOR UPDATE', [body.email.toLowerCase()])).rows[0];
      requireValue(user?.mfa_secret, 'RECOVERY_FAILED', 'Data pemulihan tidak valid atau kode telah digunakan.', 401);
      const membership = await client.query('SELECT 1 FROM memberships WHERE tenant_id=$1 AND user_id=$2', [body.merchantId, user.id]);
      requireValue(membership.rowCount, 'RECOVERY_FAILED', 'Data pemulihan tidak valid atau kode telah digunakan.', 401);
      const consumed = await client.query('UPDATE mfa_recovery_codes SET used_at=now() WHERE user_id=$1 AND code_hash=$2 AND used_at IS NULL RETURNING user_id', [user.id, codeHash]);
      requireValue(consumed.rowCount, 'RECOVERY_FAILED', 'Data pemulihan tidak valid atau kode telah digunakan.', 401);
      await client.query('UPDATE users SET password_hash=$2 WHERE id=$1', [user.id, passwordHash]);
      await client.query('UPDATE sessions SET revoked=true WHERE user_id=$1', [user.id]);
      await audit(client, { tenant_id: body.merchantId, user_id: user.id }, 'ACCOUNT_RECOVERED', user.id);
    });
    res.clearCookie('aiodma_session', { path: '/' });
    send(res, { recovered: true });
  }));
}

function registerPublication(api, { db, identity, valid, wrap, send }) {
  const owner = identity.allow('owner');
  async function readiness(client, tenantId) {
    const tenant = (await client.query('SELECT id,name,currency,config,published,version FROM tenants WHERE id=$1', [tenantId])).rows[0];
    const menu = Number((await client.query('SELECT count(*) FROM catalog_items WHERE tenant_id=$1 AND NOT archived AND available', [tenantId])).rows[0].count);
    const tables = Number((await client.query('SELECT count(*) FROM dining_tables WHERE tenant_id=$1 AND active', [tenantId])).rows[0].count);
    return { tenant, menu, tables, ready: !!tenant.name.trim() && menu > 0 && tables > 0 };
  }
  api.get('/admin/onboarding', owner, wrap(async (req, res) => {
    send(res, await db.transaction(req.principal.tenant_id, client => readiness(client, req.principal.tenant_id)));
  }));
  api.post('/admin/publication', owner, wrap(async (req, res) => {
    const body = valid(z.object({ published: z.boolean(), expectedVersion: z.number().int().positive() }).strict(), req.body);
    const result = await db.transaction(req.principal.tenant_id, async client => {
      await client.query('SELECT id FROM tenants WHERE id=$1 FOR UPDATE', [req.principal.tenant_id]);
      const status = await readiness(client, req.principal.tenant_id);
      requireValue(status.tenant.version === body.expectedVersion, 'SETTINGS_STALE', 'Pengaturan berubah. Muat ulang halaman.', 409);
      requireValue(!body.published || status.ready, 'OUTLET_INCOMPLETE', 'Lengkapi profil, menu tersedia, dan meja aktif sebelum menerbitkan.', 409);
      const tenant = (await client.query('UPDATE tenants SET published=$2,version=version+1 WHERE id=$1 RETURNING id,published,version', [req.principal.tenant_id, body.published])).rows[0];
      if (!body.published) await client.query('UPDATE sessions SET revoked=true WHERE tenant_id=$1 AND user_id IS NULL', [req.principal.tenant_id]);
      await audit(client, req.principal, body.published ? 'OUTLET_PUBLISHED' : 'OUTLET_UNPUBLISHED', tenant.id);
      return tenant;
    });
    send(res, result);
  }));
}
module.exports = { registerOnboarding, registerPublication };
