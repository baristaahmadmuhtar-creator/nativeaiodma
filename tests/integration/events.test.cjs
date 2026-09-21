'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const { setTimeout: delay } = require('node:timers/promises');
const { startLocalDatabase } = require('../../scripts/local-database.cjs');
const { seed } = require('../../scripts/seed-v18.cjs');
const { createDatabase } = require('../../src/infrastructure/database');
const { createApp } = require('../../src/server/app');
const { tableToken } = require('../../src/modules/identity');

let database, db, server, base, config, ownerA, ownerB, guestA, peerA, guestB;
const suffix = crypto.randomBytes(6).toString('hex');
const tenantA = 'events_a_' + suffix;
const tenantB = 'events_b_' + suffix;
const email = `events_${suffix}@example.test`;
const password = crypto.randomBytes(24).toString('hex');
const streams = new Set();
const requests = new Set();
const testOptions = { timeout: 20000 };

function track(req) {
  requests.add(req);
  req.once('close', () => requests.delete(req));
  return req;
}

// No global fetch dispatcher or keep-alive agent survives an individual request.
function request(route, { method = 'GET', body, session, headers = {}, key } = {}) {
  return new Promise((resolve, reject) => {
    const encoded = body === undefined ? undefined : JSON.stringify(body);
    const req = track(http.request(new URL(route, base), {
      method, agent: false, signal: AbortSignal.timeout(7000),
      headers: { ...(encoded ? { 'Content-Type': 'application/json' } : {}),
        ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {}),
        ...(key ? { 'Idempotency-Key': key } : {}), ...headers }
    }, res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => {
        text += chunk;
        if (text.length > 1024 * 1024) req.destroy(new Error('Response exceeds test limit'));
      });
      res.once('error', reject);
      res.once('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(text),
            cookie: res.headers['set-cookie']?.[0]?.split(';')[0] });
        } catch { reject(new Error('Expected a JSON API response')); }
      });
    }));
    req.once('error', reject);
    req.end(encoded);
  });
}

function expectResponse(response, status, code) {
  assert.equal(response.status, status);
  if (code) assert.equal(response.data.error?.code, code);
  return response.data.data;
}

async function guest(tenant) {
  const response = await request('/api/v1/session', { method: 'POST', body: {
    merchantId: tenant, tableId: 1, token: tableToken(config, tenant, 1, 1)
  } });
  const data = expectResponse(response, 200);
  assert.equal(data.tableId, 1);
  assert.equal(data.tenantId, tenant);
  assert.ok(response.cookie);
  return { cookie: response.cookie, csrf: data.csrfToken };
}

async function login(tenant) {
  const response = await request('/api/v1/auth/login', { method: 'POST', body: { email, password, merchantId: tenant } });
  const data = expectResponse(response, 200);
  assert.equal(data.tenantId, tenant);
  return { cookie: response.cookie, csrf: data.csrfToken };
}

async function quote(session) {
  const cart = expectResponse(await request('/api/v1/cart', { session }), 200);
  const filled = expectResponse(await request('/api/v1/cart', { method: 'PUT', session, key: crypto.randomUUID(),
    body: { expectedVersion: cart.version, lines: [{ menuId: 'latte', qty: 1, optionIds: [] }] } }), 200);
  return expectResponse(await request('/api/v1/quotes', { method: 'POST', session,
    body: { expectedVersion: filled.version } }), 201);
}

async function order(session, quoted) {
  const q = quoted || await quote(session);
  const key = crypto.randomUUID();
  const value = expectResponse(await request('/api/v1/orders', { method: 'POST', session, key,
    body: { quoteId: q.id, confirmed: true, paymentMethod: 'CASH' } }), 201);
  return { value, key };
}

async function menuEvent(session) {
  const id = 'marker_' + crypto.randomBytes(6).toString('hex');
  expectResponse(await request('/api/v1/admin/menu', { method: 'POST', session,
    body: { id, name: 'Event barrier', category: 'coffee', price: 1, available: true, modifierGroups: [] } }), 201);
  return id;
}

async function cursor() {
  const values = await Promise.all([tenantA, tenantB].map(tenant => db.transaction(tenant,
    async c => Number((await c.query('SELECT COALESCE(max(seq),0)::text AS seq FROM outbox_events')).rows[0].seq))));
  return Math.max(...values);
}

async function until(predicate, label, observed = [], timeoutMs = 6000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    for (const stream of observed) if (stream.error) throw stream.error;
    assert.ok(Date.now() < deadline, 'Timed out: ' + label);
    await delay(20);
  }
}

// Parse complete SSE frames, including fragmented chunks; every stream has a hard abort.
async function openEvents(session, lastEventId = 0) {
  const controller = new AbortController();
  const state = { events: [], heartbeats: 0, ended: false, error: null, stopped: false };
  let response;
  let buffer = '';
  const req = track(http.request(new URL('/api/v1/events', base), { agent: false, signal: controller.signal,
    headers: { Cookie: session.cookie, 'Last-Event-ID': String(lastEventId) } }));
  const closed = new Promise(resolve => req.once('close', resolve));
  const timeout = setTimeout(() => {
    state.error = new Error('SSE exceeded 15-second test deadline');
    controller.abort();
  }, 15000);
  state.close = async () => {
    state.stopped = true;
    clearTimeout(timeout);
    controller.abort();
    response?.destroy();
    req.destroy();
    await closed;
    streams.delete(state);
  };
  streams.add(state);
  req.once('close', () => clearTimeout(timeout));
  req.on('error', error => { if (!state.stopped) state.error = error; });
  try {
    response = await new Promise((resolve, reject) => {
      req.once('response', resolve);
      req.once('error', reject);
      req.end();
    });
    assert.equal(response.statusCode, 200);
    assert.match(response.headers['content-type'], /^text\/event-stream/);
    response.setEncoding('utf8');
    response.on('data', chunk => {
      try {
        buffer += chunk;
        assert.ok(buffer.length < 1024 * 1024, 'SSE buffer exceeds test limit');
        let boundary;
        while ((boundary = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          if (frame.startsWith(':')) { state.heartbeats++; continue; }
          const lines = frame.split('\n');
          const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
          if (!data) continue;
          const id = Number(lines.find(line => line.startsWith('id:'))?.slice(3).trim());
          assert.ok(Number.isSafeInteger(id) && id > 0, 'SSE event must have a numeric replay cursor');
          state.events.push({ cursor: id, ...JSON.parse(data) });
          assert.ok(state.events.length <= 200, 'SSE event limit exceeded');
        }
      } catch (error) { state.error = error; controller.abort(); }
    });
    response.on('error', error => { if (!state.stopped) state.error = error; });
    response.once('end', () => { state.ended = true; });
    await until(() => state.heartbeats > 0, 'first SSE heartbeat', [state]);
    return state;
  } catch (error) { await state.close(); throw error; }
}

before(async () => {
  database = await startLocalDatabase('events');
  const fixture = { name: 'Events integration fixture', currency: 'BND', taxRate: 0, tablesCount: 1,
    menu: [{ id: 'latte', name: 'Latte', category: 'coffee', price: 4.5, available: true }] };
  await seed({ connectionString: database.migrationUrl, merchants: [{ ...fixture, id: tenantA }, { ...fixture, id: tenantB }],
    email, password, published: true });
  db = createDatabase(database.connectionString);
  config = { SESSION_SECRET: crypto.randomBytes(32).toString('hex'), PUBLIC_BASE_URL: 'http://127.0.0.1', NODE_ENV: 'test' };
  server = await new Promise((resolve, reject) => {
    const s = createApp({ db, config }).listen(0, '127.0.0.1', () => resolve(s));
    s.once('error', reject);
  });
  base = 'http://127.0.0.1:' + server.address().port;
  config.PUBLIC_BASE_URL = base;
  ownerA = await login(tenantA);
  ownerB = await login(tenantB);
  guestA = await guest(tenantA);
  peerA = await guest(tenantA);
  guestB = await guest(tenantB);
}, { timeout: 120000 });

after(async context => {
  const errors = [];
  const cleanup = async (phase, action) => {
    context.diagnostic('cleanup: ' + phase);
    try { await action(); } catch (error) { errors.push(error); }
  };
  await cleanup('abort SSE and HTTP', async () => {
    await Promise.all([...streams].map(stream => stream.close()));
    for (const req of requests) req.destroy();
  });
  await cleanup('close ephemeral HTTP server', async () => {
    if (!server) return;
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  });
  await cleanup('close PostgreSQL pool', () => db?.close());
  await cleanup('stop events PostgreSQL cluster', () => database?.stop());
  context.diagnostic('cleanup: finished');
  if (errors.length) throw new AggregateError(errors, 'Events integration cleanup failed');
}, { timeout: 45000 });

test('SSE isolates guests at the same table and both tenants while staff see only their tenant', testOptions, async t => {
  const start = await cursor();
  const observers = [];
  t.after(async () => { await Promise.all(observers.map(stream => stream.close())); });
  for (const session of [guestA, peerA, guestB, ownerA, ownerB]) observers.push(await openEvents(session, start));
  const calls = [];
  for (const session of [guestA, peerA, guestB]) calls.push(expectResponse(await request('/api/v1/waiter-calls', {
    method: 'POST', session, key: crypto.randomUUID(), body: { reason: 'Fixture assistance request' }
  }), 201));
  const placed = await order(guestA);
  // Committed menu markers prove each observer pumped beyond preceding private events.
  const markerA = await menuEvent(ownerA);
  const markerB = await menuEvent(ownerB);
  for (const [index, stream] of observers.entries()) {
    const marker = [2, 4].includes(index) ? markerB : markerA;
    await until(() => stream.events.some(event => event.menuId === marker), 'tenant menu barrier', [stream]);
    assert.equal(stream.ended, false);
  }
  const ids = stream => stream.events.filter(event => event.type === 'CALL_WAITER').map(event => event.call.id).sort();
  assert.deepEqual(ids(observers[0]), [calls[0].id]);
  assert.deepEqual(ids(observers[1]), [calls[1].id]);
  assert.deepEqual(ids(observers[2]), [calls[2].id]);
  assert.deepEqual(ids(observers[3]), [calls[0].id, calls[1].id].sort());
  assert.deepEqual(ids(observers[4]), [calls[2].id]);
  for (const [index, stream] of observers.entries()) {
    assert.deepEqual(stream.events.filter(event => event.type === 'ORDER_CREATED').map(event => event.order.id),
      [0, 3].includes(index) ? [placed.value.id] : []);
    assert.deepEqual(stream.events.filter(event => event.type === 'MENU_UPDATED').map(event => event.menuId),
      [[2, 4].includes(index) ? markerB : markerA]);
    assert.ok(stream.events.every((event, i, all) => i === 0 || event.cursor > all[i - 1].cursor));
    assert.equal(new Set(stream.events.map(event => event.id)).size, stream.events.length);
  }
});

test('Last-Event-ID resumes after the cursor without replaying delivered or foreign events', testOptions, async t => {
  const first = await openEvents(guestA, await cursor());
  t.after(() => first.close());
  const delivered = await menuEvent(ownerA);
  await until(() => first.events.some(event => event.menuId === delivered), 'first replay marker', [first]);
  const last = first.events.find(event => event.menuId === delivered).cursor;
  await first.close();
  const foreign = await menuEvent(ownerB);
  const pending = await menuEvent(ownerA);
  const resumed = await openEvents(guestA, last);
  t.after(() => resumed.close());
  await until(() => resumed.events.some(event => event.menuId === pending), 'resumed event', [resumed]);
  assert.deepEqual(resumed.events.map(event => event.menuId), [pending]);
  assert.ok(resumed.events.every(event => event.cursor > last && event.menuId !== foreign));
});

test('logout closes an already-open SSE stream and rejects reuse of that session', testOptions, async t => {
  const session = await guest(tenantA);
  const stream = await openEvents(session, await cursor());
  t.after(() => stream.close());
  const before = await menuEvent(ownerA);
  await until(() => stream.events.some(event => event.menuId === before), 'live pre-revocation event', [stream]);
  expectResponse(await request('/api/v1/auth/logout', { method: 'POST', session, body: {} }), 200);
  const forbidden = await menuEvent(ownerA);
  await until(() => stream.ended, 'server-side SSE revocation close', [stream]);
  assert.equal(stream.events.some(event => event.menuId === forbidden), false);
  expectResponse(await request('/api/v1/events', { session }), 401, 'SESSION_EXPIRED');
  expectResponse(await request('/api/v1/cart', { session }), 401, 'SESSION_EXPIRED');
});

test('SSE rejects unauthenticated callers, forged tenant selectors and invalid replay cursors', testOptions, async () => {
  expectResponse(await request('/api/v1/events'), 401, 'UNAUTHENTICATED');
  expectResponse(await request('/api/v1/events?merchant=' + tenantB, { session: guestA }), 403, 'TENANT_MISMATCH');
  expectResponse(await request('/api/v1/events', { session: guestA, headers: { 'x-merchant-id': tenantB } }), 403, 'TENANT_MISMATCH');
  for (const value of ['-1', '1.5', 'not-a-cursor', '9007199254740992']) {
    expectResponse(await request('/api/v1/events', { session: guestA, headers: { 'Last-Event-ID': value } }), 422, 'INVALID_CURSOR');
    expectResponse(await request('/api/v1/events?cursor=' + value, { session: guestA }), 422, 'INVALID_CURSOR');
  }
});

test('foreign quote/order/submission IDs cannot cross tenant or same-table guest ownership', testOptions, async () => {
  const q = await quote(guestA);
  for (const session of [peerA, guestB]) expectResponse(await request('/api/v1/orders', {
    method: 'POST', session, key: crypto.randomUUID(), body: { quoteId: q.id, confirmed: true, paymentMethod: 'CASH' }
  }), 409, 'QUOTE_EXPIRED');
  const placed = await order(guestA, q);
  for (const session of [peerA, guestB, ownerB]) {
    expectResponse(await request('/api/v1/orders/' + placed.value.id, { session }), 404, 'NOT_FOUND');
    const listed = expectResponse(await request('/api/v1/orders', { session }), 200);
    assert.equal(listed.some(value => value.id === placed.value.id), false);
  }
  for (const session of [peerA, guestB]) {
    const result = expectResponse(await request('/api/v1/submissions/' + placed.key, { session }), 200);
    assert.deepEqual(result, { found: false, order: null });
  }
  expectResponse(await request('/api/v1/admin/orders/' + placed.value.id + '/status', {
    method: 'PATCH', session: ownerB, key: crypto.randomUUID(), body: { expectedVersion: 1, status: 'accepted' }
  }), 404, 'NOT_FOUND');
  expectResponse(await request('/api/v1/admin/orders/' + placed.value.id + '/payment', {
    method: 'PATCH', session: ownerB, key: crypto.randomUUID(), body: { expectedVersion: 1, amountMinor: 450, reference: 'Fixture cash' }
  }), 404, 'NOT_FOUND');
  const unchanged = expectResponse(await request('/api/v1/orders/' + placed.value.id, { session: guestA }), 200);
  assert.equal(unchanged.status, 'received');
  assert.equal(unchanged.paymentStatus, 'UNPAID');
  assert.equal(unchanged.version, 1);
  assert.equal(expectResponse(await request('/api/v1/orders/' + placed.value.id, { session: ownerA }), 200).id, placed.value.id);
  const call = expectResponse(await request('/api/v1/waiter-calls', { method: 'POST', session: guestA,
    key: crypto.randomUUID(), body: { reason: 'Foreign call ID check' } }), 201);
  expectResponse(await request('/api/v1/admin/waiter-calls/' + call.id, { method: 'PATCH', session: ownerB,
    body: { status: 'resolved', expectedVersion: call.version } }), 409, 'STALE_CALL');
  const calls = expectResponse(await request('/api/v1/admin/waiter-calls', { session: ownerA }), 200);
  assert.equal(calls.find(value => value.id === call.id).status, call.status);
  assert.equal(calls.find(value => value.id === call.id).version, call.version);
});

test('malformed UUIDs return validation errors rather than PostgreSQL cast errors', testOptions, async () => {
  for (const id of ['not-a-uuid', '12345678-1234-1234-1234-12345678901z']) {
    expectResponse(await request('/api/v1/orders/' + id, { session: guestA }), 422, 'VALIDATION_ERROR');
    expectResponse(await request('/api/v1/orders', { method: 'POST', session: guestA, key: crypto.randomUUID(),
      body: { quoteId: id, confirmed: true, paymentMethod: 'CASH' } }), 422, 'VALIDATION_ERROR');
    expectResponse(await request(`/api/v1/admin/orders/${id}/status`, { method: 'PATCH', session: ownerA,
      key: crypto.randomUUID(), body: { status: 'accepted', expectedVersion: 1 } }), 422, 'VALIDATION_ERROR');
    expectResponse(await request(`/api/v1/admin/orders/${id}/payment`, { method: 'PATCH', session: ownerA,
      key: crypto.randomUUID(), body: { amountMinor: 450, reference: 'Fixture cash', expectedVersion: 1 } }), 422, 'VALIDATION_ERROR');
    expectResponse(await request(`/api/v1/admin/waiter-calls/${id}`, { method: 'PATCH', session: ownerA,
      body: { status: 'acknowledged', expectedVersion: 1 } }), 422, 'VALIDATION_ERROR');
  }
  expectResponse(await request('/api/v1/orders/' + crypto.randomUUID(), { session: guestA }), 404, 'NOT_FOUND');
});

test('one reused PostgreSQL connection clears tenant context after commit and rollback', testOptions, async () => {
  const reused = createDatabase(database.connectionString);
  const rollback = new Error('Intentional transaction rollback');
  let backendPid;
  const inspect = async client => {
    const scope = (await client.query("SELECT pg_backend_pid() AS pid, current_setting('app.tenant_id',true) AS tenant")).rows[0];
    backendPid ??= scope.pid;
    assert.equal(scope.pid, backendPid, 'The test must reuse the same physical PostgreSQL connection');
    const tenants = (await client.query('SELECT DISTINCT tenant_id FROM catalog_items ORDER BY tenant_id')).rows.map(row => row.tenant_id);
    return { tenant: scope.tenant || '', tenants };
  };
  try {
    assert.deepEqual(await inspect(reused.pool), { tenant: '', tenants: [] });
    for (const tenant of [tenantA, tenantB, tenantA]) {
      assert.deepEqual(await reused.transaction(tenant, inspect), { tenant, tenants: [tenant] });
      assert.deepEqual(await inspect(reused.pool), { tenant: '', tenants: [] });
      await assert.rejects(reused.transaction(tenant, async client => {
        assert.deepEqual(await inspect(client), { tenant, tenants: [tenant] });
        throw rollback;
      }), error => error === rollback);
      assert.deepEqual(await inspect(reused.pool), { tenant: '', tenants: [] });
    }
  } finally { await reused.close(); }
});

test('membership revocation closes a live staff SSE stream without closing unrelated sessions', testOptions, async t => {
  const start = await cursor();
  const observers = [];
  t.after(async () => { await Promise.all(observers.map(stream => stream.close())); });
  for (const session of [ownerA, guestA, ownerB]) observers.push(await openEvents(session, start));
  const [staff, ownGuest, otherTenant] = observers;
  // There is no staff-revocation HTTP route yet; mutate only this fixture's real membership.
  const removed = await db.transaction(tenantA, async client => (await client.query(
    'DELETE FROM memberships WHERE tenant_id=$1 RETURNING user_id,role', [tenantA])).rows);
  assert.equal(removed.length, 1);
  try {
    expectResponse(await request('/api/v1/events', { session: ownerA }), 403, 'FORBIDDEN');
    const placed = await order(guestA);
    const markerB = await menuEvent(ownerB);
    await until(() => ownGuest.events.some(event => event.order?.id === placed.value.id),
      'guest receives own event after staff membership revocation', [ownGuest]);
    await until(() => otherTenant.events.some(event => event.menuId === markerB),
      'other tenant remains live after membership revocation', [otherTenant]);
    await until(() => staff.ended, 'membership-revoked staff stream closes', [staff]);
    assert.equal(staff.events.some(event => event.order?.id === placed.value.id), false,
      'Revoked staff must not receive newly committed private orders');
    assert.equal(ownGuest.ended, false);
    assert.equal(otherTenant.ended, false);
  } finally {
    await db.transaction(tenantA, async client => {
      for (const membership of removed) await client.query(
        'INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
        [tenantA, membership.user_id, membership.role]);
    });
  }
});
