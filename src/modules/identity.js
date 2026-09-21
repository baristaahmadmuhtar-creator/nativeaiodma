'use strict';
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { AppError, requireValue } = require('../shared/errors');
const scrypt = promisify(crypto.scrypt);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

async function hashPassword(password) {
  requireValue(typeof password === 'string' && password.length >= 12 && password.length <= 256,
    'PASSWORD_POLICY', 'Gunakan kata sandi 12-256 karakter.');
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 256) return false;
  const [algorithm, salt, saved] = (encoded || '').split(':');
  if (algorithm !== 'scrypt' || !salt || !saved) return false;
  const actual = await scrypt(password, salt, 64);
  const expected = Buffer.from(saved, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function tableToken(config, tenantId, tableId, version) {
  return crypto.createHmac('sha256', config.SESSION_SECRET)
    .update(JSON.stringify([tenantId, tableId, version])).digest('base64url');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createIdentity(db, config) {
  const csrfFor = token => crypto.createHmac('sha256', config.SESSION_SECRET).update('csrf:' + token).digest('base64url');
  async function session(tenantId, userId, tableId, mfaVerified=false) {
    const token = crypto.randomBytes(32).toString('base64url');
    const csrf = csrfFor(token);
    const id = crypto.randomUUID();
    await db.pool.query(`INSERT INTO sessions(id,token_hash,csrf_hash,tenant_id,user_id,table_id,expires_at,mfa_verified)
      VALUES($1,$2,$3,$4,$5,$6,now()+($7 * interval '1 hour'),$8)`,
    [id, hash(token), hash(csrf), tenantId, userId, tableId, userId ? 12 : 4,mfaVerified]);
    return { token, csrf, id, tenantId, tableId };
  }
  async function authenticate(req, _res, next) {
    try {
      const token = req.cookies?.aiodma_session;
      if (!token) throw new AppError('UNAUTHENTICATED', 'Silakan masuk atau pindai QR meja.', 401);
      const result = await db.pool.query(`SELECT s.*,u.disabled,(u.mfa_secret IS NOT NULL) AS mfa_enabled FROM sessions s
        LEFT JOIN users u ON u.id=s.user_id WHERE token_hash=$1 AND NOT revoked AND expires_at>now()
        AND (user_id IS NULL OR last_seen_at>now()-interval '30 minutes')`, [hash(token)]);
      const principal = result.rows[0];
      if (!principal || principal.disabled) throw new AppError('SESSION_EXPIRED', 'Sesi berakhir. Silakan masuk kembali.', 401);
      if (principal.user_id) {
        const role = await db.transaction(principal.tenant_id, c => c.query(
          'SELECT role FROM memberships WHERE tenant_id=$1 AND user_id=$2', [principal.tenant_id, principal.user_id]));
        if (!role.rowCount) throw new AppError('FORBIDDEN', 'Akses outlet telah dicabut.', 403);
        principal.role = role.rows[0].role;
        principal.mfaRequired = !principal.mfa_verified && (principal.mfa_enabled || (config.NODE_ENV==='production' && principal.role==='owner'));
      } else {
        const table = await db.transaction(principal.tenant_id, c => c.query(
          'SELECT 1 FROM dining_tables WHERE tenant_id=$1 AND id=$2 AND active', [principal.tenant_id, principal.table_id]));
        if (!table.rowCount) throw new AppError('TABLE_CLOSED', 'Meja tidak aktif.', 403);
        principal.role = 'guest';
      }
      const selectors = [req.headers['x-merchant-id'], req.query.merchant, req.body?.merchantId, req.body?.merchant].filter(Boolean);
      if (selectors.some(id => id !== principal.tenant_id)) throw new AppError('TENANT_MISMATCH', 'Akses outlet ditolak.', 403);
      if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
        if (!safeEqual(hash(String(req.headers['x-csrf-token'] || '')), principal.csrf_hash)) {
          throw new AppError('CSRF_INVALID', 'Sesi perlu dimuat ulang.', 403);
        }
      }
      await db.pool.query('UPDATE sessions SET last_seen_at=now() WHERE id=$1', [principal.id]);
      req.principal = principal;
      req.csrfToken = csrfFor(token);
      next();
    } catch (error) { next(error); }
  }
  const allow = (...roles) => (req, _res, next) => {
    if(req.principal.mfaRequired)return next(new AppError('MFA_REQUIRED','Aktifkan verifikasi dua langkah terlebih dahulu.',403));
    return roles.includes(req.principal.role) ? next() : next(new AppError('FORBIDDEN', 'Anda tidak memiliki izin untuk tindakan ini.', 403));
  };

  function setCookie(res, value) {
    res.cookie('aiodma_session', value.token, { httpOnly: true, secure: config.NODE_ENV === 'production',
      sameSite: 'strict', path: '/', maxAge: value.tableId ? 4 * 3600000 : 12 * 3600000 });
  }
  return { session, authenticate, allow, setCookie, csrfFor };
}

module.exports = { hash, hashPassword, verifyPassword, safeEqual, tableToken, createIdentity };
