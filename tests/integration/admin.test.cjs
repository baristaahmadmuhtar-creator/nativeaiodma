'use strict';
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const { setTimeout: delay } = require('node:timers/promises');
const OTPAuth = require('otpauth');
const { startLocalDatabase } = require('../../scripts/local-database.cjs');
const { seed } = require('../../scripts/seed-v18.cjs');
const { createDatabase } = require('../../src/infrastructure/database');
const { createApp } = require('../../src/server/app');
const { tableToken, hash } = require('../../src/modules/identity');

// Shares the stopped events cluster; run integration files with --test-concurrency=1.
const suffix = crypto.randomBytes(6).toString('hex');
const tenantA = 'admin_a_' + suffix, tenantB = 'admin_b_' + suffix;
const tenantMfa = 'admin_mfa_' + suffix, tenantGuard = 'admin_guard_' + suffix;
const account = label => ({ email: `${label}_${suffix}@example.test`, password: crypto.randomBytes(24).toString('hex') });
const primary = account('primary'), existing = account('existing'), mfa = account('mfa'), guard = account('guard');
let database, db, server, base, config, owner, guardId, mfaId;
const requests = new Set();
const options = { timeout: 20000 };

function request(route, { method = 'GET', session, body, key } = {}) {
  return new Promise((resolve, reject) => {
    const encoded = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request(new URL(route, base), { method, agent: false, signal: AbortSignal.timeout(7000),
      headers: { ...(encoded ? { 'Content-Type': 'application/json' } : {}),
        ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {}),
        ...(key ? { 'Idempotency-Key': key } : {}) } }, res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { text += chunk; if (text.length > 1024 * 1024) req.destroy(new Error('Response too large')); });
      res.once('error', reject);
      res.once('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(text), cookie: res.headers['set-cookie']?.[0]?.split(';')[0] }); }
        catch { reject(new Error('Expected JSON response')); }
      });
    });
    requests.add(req);
    req.once('close', () => requests.delete(req));
    req.once('error', reject);
    req.end(encoded);
  });
}

function expect(response, status, code) {
  assert.equal(response.status, status);
  if (code) assert.equal(response.data.error?.code, code);
  return response.data.data;
}
function session(response) {
  const data = expect(response, 200);
  assert.ok(response.cookie, 'Session cookie must be set');
  assert.equal(typeof data.csrfToken, 'string');
  return { cookie: response.cookie, csrf: data.csrfToken };
}
function login(user, merchantId, extra = {}) {
  return request('/api/v1/auth/login', { method: 'POST', body: { ...user, merchantId, ...extra } });
}
async function invite(user, role, principal = owner) {
  const result = expect(await request('/api/v1/admin/invitations', { method: 'POST', session: principal,
    body: { email: user.email, role } }), 201);
  assert.equal(result.delivery, 'not_sent');
  const url = new URL(result.invitationUrl);
  assert.equal(url.origin, base);
  const params = new URLSearchParams(url.hash.slice(1));
  return { tenantId: params.get('tenant'), id: params.get('invite'), token: params.get('token') };
}
function accept(invitation, password) {
  return request('/api/v1/auth/accept-invitation', { method: 'POST', body: { ...invitation, password } });
}
async function guest() {
  return session(await request('/api/v1/session', { method: 'POST', body: {
    merchantId: tenantA, tableId: 1, token: tableToken(config, tenantA, 1, 1) } }));
}
async function makeOrder(principal) {
  const cart = expect(await request('/api/v1/cart', { session: principal }), 200);
  const filled = expect(await request('/api/v1/cart', { method: 'PUT', session: principal, key: crypto.randomUUID(),
    body: { expectedVersion: cart.version, lines: [{ menuId: 'latte', qty: 1, optionIds: [] }] } }), 200);
  const quote = expect(await request('/api/v1/quotes', { method: 'POST', session: principal,
    body: { expectedVersion: filled.version } }), 201);
  assert.equal(quote.totalMinor, 450);
  return expect(await request('/api/v1/orders', { method: 'POST', session: principal, key: crypto.randomUUID(),
    body: { quoteId: quote.id, confirmed: true, paymentMethod: 'CASH' } }), 201);
}
async function settle(order) {
  return expect(await request(`/api/v1/admin/orders/${order.id}/payment`, { method: 'PATCH', session: owner,
    key: crypto.randomUUID(), body: { expectedVersion: order.version, amountMinor: 450, reference: 'Fixture cash received' } }), 200);
}
function refund(order, amountMinor, key = crypto.randomUUID(), principal = owner) {
  return request(`/api/v1/admin/orders/${order.id}/refund`, { method: 'POST', session: principal, key,
    body: { expectedVersion: order.version, amountMinor, reference: 'Fixture manual refund' } });
}
async function ledger(orderId) {
  return db.transaction(tenantA, async client => (await client.query(`SELECT kind,count(*)::integer AS count,
    sum(amount_minor)::integer AS total FROM payment_events WHERE order_id=$1 GROUP BY kind ORDER BY kind`, [orderId])).rows);
}
async function resetClientBudgets() {
  // Persistent fixture reuse must not inherit earlier suites' IP limits. Replay attempts stay in one test.
  await db.pool.query('DELETE FROM rate_limits WHERE key=ANY($1::text[])',
    [['login', 'invite-accept', 'qr-exchange'].map(name => hash(name + ':127.0.0.1'))]);
}

before(async () => {
  database = await startLocalDatabase('events');
  db = createDatabase(database.connectionString);
  const fixture = id => ({ id, name: 'Admin integration fixture', currency: 'BND', taxRate: 0, tablesCount: 1,
    menu: [{ id: 'latte', name: 'Latte', category: 'coffee', price: 4.5, available: true }] });
  const seedUser = (user, tenants) => seed({ connectionString: database.migrationUrl, ...user,
    merchants: tenants.map(fixture), published: true });
  await seedUser(primary, [tenantA, tenantB]);
  await seedUser(existing, [tenantB]);
  mfaId = (await seedUser(mfa, [tenantMfa])).userId;
  guardId = (await seedUser(guard, [tenantGuard])).userId;
  config = { NODE_ENV: 'test', PUBLIC_BASE_URL: 'http://127.0.0.1', SESSION_SECRET: crypto.randomBytes(32).toString('hex') };
  server = await new Promise((resolve, reject) => {
    const s = createApp({ db, config }).listen(0, '127.0.0.1', () => resolve(s));
    s.once('error', reject);
  });
  base = 'http://127.0.0.1:' + server.address().port;
  config.PUBLIC_BASE_URL = base;
  await resetClientBudgets();
  owner = session(await login(primary, tenantA));
}, { timeout: 120000 });
beforeEach(resetClientBudgets);
after(async context => {
  const failures = [];
  const clean = async (name, fn) => {
    context.diagnostic('cleanup: ' + name);
    try { await fn(); } catch (error) { failures.push(error); }
  };
  await clean('HTTP connections', async () => {
    for (const req of requests) req.destroy();
    if (server) await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve()); server.closeAllConnections();
    });
  });
  await clean('PostgreSQL pool', () => db?.close());
  await clean('reused events cluster', () => database?.stop());
  context.diagnostic('cleanup: finished');
  if (failures.length) throw new AggregateError(failures, 'Admin test cleanup failed');
}, { timeout: 45000 });

test('MFA enrollment rotates sessions and TOTP/recovery codes reject concurrent replay', options, async () => {
  const enrolling = session(await login(mfa, tenantMfa));
  const previousSession = session(await login(mfa, tenantMfa));
  expect(await request('/api/v1/auth/mfa/enroll', { method: 'POST', session: enrolling,
    body: { password: 'Incorrect fixture password' } }), 401, 'LOGIN_FAILED');
  const enrollment = expect(await request('/api/v1/auth/mfa/enroll', { method: 'POST', session: enrolling,
    body: { password: mfa.password } }), 200);
  // Act as a real authenticator from the returned URI; never print its secret or codes.
  const authenticator = OTPAuth.URI.parse(enrollment.otpauthUri);
  assert.ok(authenticator.secret.base32 === enrollment.secret, 'Enrollment URI matches disclosed secret');
  const pending = (await db.pool.query('SELECT mfa_secret IS NULL AS disabled,mfa_pending IS NOT NULL AS pending FROM users WHERE id=$1', [mfaId])).rows[0];
  assert.deepEqual(pending, { disabled: true, pending: true });
  const candidates = [-30000, 0, 30000].map(offset => authenticator.generate({ timestamp: Date.now() + offset }));
  const wrong = ['000000', '111111', '222222', '333333'].find(value => !candidates.includes(value));
  expect(await request('/api/v1/auth/mfa/verify', { method: 'POST', session: enrolling, body: { otp: wrong } }), 401, 'MFA_INVALID');
  // A previous-window enrollment code leaves the current step available for a real login, without clock mocks.
  if (Date.now() % 30000 > 27500) await delay(30000 - Date.now() % 30000 + 50);
  const enrollmentCode = authenticator.generate({ timestamp: Date.now() - 30000 });
  const verified = await request('/api/v1/auth/mfa/verify', { method: 'POST', session: enrolling, body: { otp: enrollmentCode } });
  const elevated = session(verified);
  const codes = verified.data.data.recoveryCodes;
  assert.ok(Array.isArray(codes) && codes.length === 10, 'Ten recovery codes returned once');
  assert.equal(new Set(codes).size, 10);
  assert.ok(elevated.cookie !== enrolling.cookie, 'Enrollment rotates the session');
  for (const old of [enrolling, previousSession]) expect(await request('/api/v1/session', { session: old }), 401, 'SESSION_EXPIRED');
  expect(await request('/api/v1/admin/staff', { session: elevated }), 200);
  expect(await request('/api/v1/auth/mfa/enroll', { method: 'POST', session: elevated,
    body: { password: mfa.password } }), 409, 'MFA_ALREADY_ENABLED');
  expect(await login(mfa, tenantMfa), 401, 'MFA_INVALID');
  expect(await login(mfa, tenantMfa, { otp: enrollmentCode }), 401, 'MFA_INVALID');
  const otp = authenticator.generate();
  const concurrent = await Promise.all([login(mfa, tenantMfa, { otp }), login(mfa, tenantMfa, { otp })]);
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 401]);
  expect(concurrent.find(r => r.status === 401), 401, 'MFA_INVALID');
  expect(await request('/api/v1/admin/staff', { session: session(concurrent.find(r => r.status === 200)) }), 200);
  const recovery = await Promise.all([login(mfa, tenantMfa, { recoveryCode: codes[0] }), login(mfa, tenantMfa, { recoveryCode: codes[0] })]);
  assert.deepEqual(recovery.map(r => r.status).sort(), [200, 401]);
  expect(recovery.find(r => r.status === 401), 401, 'MFA_INVALID');
  expect(await login(mfa, tenantMfa, { recoveryCode: codes[0] }), 401, 'MFA_INVALID');
  const consumed = (await db.pool.query('SELECT count(*)::integer AS total,count(used_at)::integer AS used FROM mfa_recovery_codes WHERE user_id=$1', [mfaId])).rows[0];
  assert.deepEqual(consumed, { total: 10, used: 1 });
});

test('new staff invitation requires a valid password and token, then accepts exactly once', options, async () => {
  const user = account('new_staff');
  const invitation = await invite(user, 'cashier');
  expect(await accept(invitation, 'short'), 422, 'VALIDATION_ERROR');
  expect(await accept({ ...invitation, token: crypto.randomBytes(32).toString('base64url') }, user.password), 403, 'INVITATION_INVALID');
  expect(await accept({ ...invitation, tenantId: tenantB }, user.password), 403, 'INVITATION_INVALID');
  assert.equal(expect(await accept(invitation, user.password), 200).accepted, true);
  expect(await accept(invitation, user.password), 403, 'INVITATION_INVALID');
  const response = await login(user, tenantA);
  assert.equal(expect(response, 200).role, 'cashier');
  expect(await request('/api/v1/admin/staff', { session: session(response) }), 403, 'FORBIDDEN');
  expect(await login(user, tenantB), 401, 'LOGIN_FAILED');
  const staff = expect(await request('/api/v1/admin/staff', { session: owner }), 200);
  assert.equal(staff.filter(value => value.email === user.email).length, 1);
  assert.equal(staff.find(value => value.email === user.email).role, 'cashier');
});

test('existing invitee must authenticate with the existing password and cannot replace it', options, async () => {
  const invitation = await invite(existing, 'manager');
  const replacement = crypto.randomBytes(24).toString('hex');
  expect(await login(existing, tenantA), 401, 'LOGIN_FAILED');
  expect(await accept(invitation, replacement), 401, 'LOGIN_FAILED');
  expect(await login({ ...existing, password: replacement }, tenantB), 401, 'LOGIN_FAILED');
  assert.equal(expect(await accept(invitation, existing.password), 200).accepted, true);
  assert.equal(expect(await login(existing, tenantA), 200).role, 'manager');
  assert.equal(expect(await login(existing, tenantB), 200).role, 'owner');
  expect(await login({ ...existing, password: replacement }, tenantA), 401, 'LOGIN_FAILED');
  expect(await accept(invitation, existing.password), 403, 'INVITATION_INVALID');
});

test('last owner cannot be demoted, including concurrent attempts against two owners', options, async () => {
  const principal = session(await login(guard, tenantGuard));
  const demote = (id, actor) => request('/api/v1/admin/staff/' + id, { method: 'PATCH', session: actor, body: { role: 'manager' } });
  expect(await demote(guardId, principal), 409, 'LAST_OWNER');
  assert.equal(expect(await request('/api/v1/admin/staff', { session: principal }), 200).find(value => value.id === guardId).role, 'owner');
  const second = account('second_owner');
  const invitation = await invite(second, 'owner', principal);
  expect(await accept(invitation, second.password), 200);
  const secondPrincipal = session(await login(second, tenantGuard));
  const members = expect(await request('/api/v1/admin/staff', { session: principal }), 200);
  const secondId = members.find(value => value.email === second.email).id;
  const results = await Promise.all([demote(guardId, principal), demote(secondId, secondPrincipal)]);
  assert.deepEqual(results.map(value => value.status).sort(), [200, 409]);
  expect(results.find(value => value.status === 409), 409, 'LAST_OWNER');
  const winner = results[0].status === 200 ? principal : secondPrincipal;
  const survivor = results[0].status === 200 ? secondPrincipal : principal;
  expect(await request('/api/v1/admin/staff', { session: winner }), 401, 'SESSION_EXPIRED');
  const finalMembers = expect(await request('/api/v1/admin/staff', { session: survivor }), 200);
  assert.equal(finalMembers.filter(value => value.role === 'owner').length, 1);
  assert.equal(finalMembers.filter(value => value.role === 'manager').length, 1);
});

test('refunds require owner scope, enforce the paid cap and persist only one idempotent refund', options, async () => {
  const customer = await guest();
  const unpaid = await makeOrder(customer);
  expect(await refund(unpaid, 1), 409, 'REFUND_DENIED');
  const paid = await settle(unpaid);
  expect(await refund(paid, 100, crypto.randomUUID(), customer), 403, 'FORBIDDEN');
  const foreign = session(await login(primary, tenantB));
  expect(await refund(paid, 100, crypto.randomUUID(), foreign), 404, 'NOT_FOUND');
  expect(await refund(paid, 451), 409, 'REFUND_EXCEEDS_PAID');
  const key = crypto.randomUUID();
  const partial = expect(await refund(paid, 200, key), 200);
  assert.equal(partial.paymentStatus, 'PARTIALLY_REFUNDED');
  assert.deepEqual(expect(await refund(paid, 200, key), 200), partial);
  expect(await refund(paid, 201, key), 409, 'IDEMPOTENCY_CONFLICT');
  assert.deepEqual(await ledger(paid.id), [{ kind: 'refund', count: 1, total: 200 }, { kind: 'settlement', count: 1, total: 450 }]);
  expect(await refund(partial, 251), 409, 'REFUND_EXCEEDS_PAID');
  const full = expect(await refund(partial, 250), 200);
  assert.equal(full.paymentStatus, 'REFUNDED');
  expect(await refund(full, 1), 409, 'REFUND_DENIED');
  assert.deepEqual(await ledger(paid.id), [{ kind: 'refund', count: 2, total: 450 }, { kind: 'settlement', count: 1, total: 450 }]);
  assert.deepEqual(expect(await request('/api/v1/admin/stats', { session: owner }), 200), { settledMinor: 450, refundedMinor: 450, netMinor: 0 });
});

test('concurrent refunds cannot spend the same remaining balance twice', options, async () => {
  const paid = await settle(await makeOrder(await guest()));
  const attempts = await Promise.all([refund(paid, 300), refund(paid, 300)]);
  assert.deepEqual(attempts.map(value => value.status).sort(), [200, 409]);
  expect(attempts.find(value => value.status === 409), 409, 'ORDER_STALE');
  const partial = expect(attempts.find(value => value.status === 200), 200);
  expect(await refund(partial, 151), 409, 'REFUND_EXCEEDS_PAID');
  const finished = expect(await refund(partial, 150), 200);
  assert.equal(finished.paymentStatus, 'REFUNDED');
  assert.deepEqual(await ledger(paid.id), [{ kind: 'refund', count: 2, total: 450 }, { kind: 'settlement', count: 1, total: 450 }]);
});
