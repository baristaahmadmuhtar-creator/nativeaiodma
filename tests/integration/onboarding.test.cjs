'use strict';
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const OTPAuth = require('otpauth');
const { startLocalDatabase } = require('../../scripts/local-database.cjs');
const { createDatabase } = require('../../src/infrastructure/database');
const { createApp } = require('../../src/server/app');
const { tableToken } = require('../../src/modules/identity');

let local, db, server, base, config;
const password = 'Private-test-' + crypto.randomBytes(12).toString('hex');
const signup = () => ({ email: `signup_${crypto.randomUUID()}@example.test`, password, name: 'Fresh Cafe',
  currency: 'BND', timezone: 'Asia/Brunei', language: 'id', tables: 2 });
async function request(path, { body, session, method = body ? 'POST' : 'GET', origin } = {}) {
  const response = await fetch(base + '/api/v1' + path, { method, headers: {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {}),
    ...(origin ? { Origin: origin } : {})
  }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
const sessionOf = result => ({ cookie: result.cookie, csrf: result.body.data.csrfToken });
async function enrolled() {
  const input = signup();
  const registration = await request('/auth/register', { body: input });
  assert.equal(registration.status, 201, JSON.stringify(registration.body));
  const session = sessionOf(registration);
  const enrollment = await request('/auth/mfa/enroll', { session, body: { password } });
  assert.equal(enrollment.status, 200, JSON.stringify(enrollment.body));
  const otp = OTPAuth.URI.parse(enrollment.body.data.otpauthUri).generate();
  const verified = await request('/auth/mfa/verify', { session, body: { otp } });
  assert.equal(verified.status, 200, JSON.stringify(verified.body));
  return { input, tenantId: registration.body.data.tenantId, session: sessionOf(verified), codes: verified.body.data.recoveryCodes };
}
before(async () => {
  local = await startLocalDatabase('integration'); db = createDatabase(local.connectionString);
  config = { NODE_ENV: 'production', PUBLIC_BASE_URL: 'https://example.test', SESSION_SECRET: crypto.randomBytes(32).toString('hex') };
  server = await new Promise(resolve => { const instance = createApp({ db, config }).listen(0, '127.0.0.1', () => resolve(instance)); });
  base = `http://127.0.0.1:${server.address().port}`;
}, { timeout: 120000 });
beforeEach(async () => { await db.pool.query('DELETE FROM rate_limits'); });
after(async () => { server?.closeAllConnections(); if (server) await new Promise(resolve => server.close(resolve)); await db?.close(); await local?.stop(); });

test('signup is atomic, owner scoped, duplicate safe, and does not claim an existing outlet', async () => {
  const input = signup();
  const responses = await Promise.all([request('/auth/register', { body: input }), request('/auth/register', { body: input })]);
  assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
  const result = responses.find(r => r.status === 201), tenantId = result.body.data.tenantId;
  assert.equal(result.body.data.mfaRequired, true);
  assert.equal(result.body.data.role, 'owner');
  const tenant = (await db.pool.query('SELECT * FROM tenants WHERE id=$1', [tenantId])).rows[0];
  assert.equal(tenant.published, false);
  assert.equal((await db.transaction(tenantId, c => c.query('SELECT * FROM dining_tables WHERE tenant_id=$1', [tenantId]))).rowCount, 2);
  assert.equal((await db.pool.query('SELECT * FROM users WHERE email=$1', [input.email])).rowCount, 1);
  assert.equal((await request('/auth/login', { body: { email: input.email, password } })).body.data.tenantId, tenantId);
  assert.equal((await request('/auth/login', { body: { email: input.email, password: 'wrong' } })).status, 401);
  assert.equal((await request('/admin/onboarding', { session: sessionOf(result) })).body.error.code, 'MFA_REQUIRED');
  const injection = await request('/auth/register', { body: { ...signup(), merchantId: tenantId, role: 'owner', published: true } });
  assert.equal(injection.status, 422);
});

test('publication requires readiness and owner, enforces version/CSRF, and revokes guest sessions', async () => {
  const account = await enrolled(), { tenantId, session } = account;
  const status = await request('/admin/onboarding', { session });
  assert.equal(status.body.data.ready, false);
  assert.equal((await request('/admin/publication', { session, body: { published: true, expectedVersion: 1 } })).body.error.code, 'OUTLET_INCOMPLETE');
  const qrBody = { merchantId: tenantId, tableId: 1, token: tableToken(config, tenantId, 1, 1) };
  assert.equal((await request('/session', { body: qrBody })).status, 403);
  const menu = await request('/admin/menu', { session, body: { id: 'coffee', name: 'Coffee', category: 'Coffee', price: 3.5, available: true, modifierGroups: [] } });
  assert.equal(menu.status, 201, JSON.stringify(menu.body));
  assert.equal((await request('/admin/publication', { session: { ...session, csrf: 'wrong' }, body: { published: true, expectedVersion: 1 } })).status, 403);
  assert.equal((await request('/admin/publication', { session, body: { published: true, expectedVersion: 1 } })).status, 200);
  const guest = await request('/session', { body: qrBody }); assert.equal(guest.status, 200);
  assert.equal((await request('/admin/onboarding', { session: sessionOf(guest) })).status, 403);
  assert.equal((await request('/admin/publication', { session, body: { published: false, expectedVersion: 1 } })).status, 409);
  assert.equal((await request('/admin/publication', { session, body: { published: false, expectedVersion: 2 } })).status, 200);
  assert.equal((await request('/cart', { session: sessionOf(guest) })).status, 401);
  assert.equal((await request('/session', { body: qrBody })).status, 403);
});

test('recovery consumes one code, resets password, preserves MFA and revokes all sessions', async () => {
  const account = await enrolled();
  const newPassword = password + '-new';
  const body = { email: account.input.email, merchantId: account.tenantId, recoveryCode: account.codes[0], password: newPassword };
  const results = await Promise.all([request('/auth/recover', { body }), request('/auth/recover', { body })]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 401]);
  assert.equal((await request('/session', { session: account.session })).status, 401);
  assert.equal((await request('/auth/login', { body: { email: body.email, password } })).status, 401);
  assert.equal((await request('/auth/login', { body: { email: body.email, password: newPassword } })).body.error.code, 'MFA_INVALID');
  const login = await request('/auth/login', { body: { email: body.email, password: newPassword, recoveryCode: account.codes[1] } });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  assert.equal(login.body.data.mfaRequired, false);
});

test('registration rejects invalid fields and foreign origin and applies a persistent rate limit', async () => {
  assert.equal((await request('/auth/register', { body: signup(), origin: 'https://evil.test' })).status, 403);
  for (const change of [{ password: 'short' }, { tables: 0 }, { timezone: 'Invalid/Nowhere' }, { currency: 'XYZ' }, { email: 'invalid' }]) {
    assert.equal((await request('/auth/register', { body: { ...signup(), ...change } })).status, 422);
  }
  assert.equal((await request('/auth/register', { body: signup() })).status, 429);
});
