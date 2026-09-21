'use strict';
const crypto = require('node:crypto');
const { hash } = require('./identity');
const { requireValue } = require('../shared/errors');

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

async function idempotent(client, principal, operation, key, payload, work) {
  requireValue(typeof key === 'string' && /^[a-zA-Z0-9_-]{8,128}$/.test(key), 'IDEMPOTENCY_REQUIRED', 'Kunci permintaan valid diperlukan.');
  const scope = [principal.tenant_id, principal.id, operation, key];
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [JSON.stringify(scope)]);
  const requestHash = hash(JSON.stringify(canonical(payload)));
  const saved = await client.query(`SELECT * FROM idempotency_records
    WHERE tenant_id=$1 AND principal_id=$2 AND operation=$3 AND key=$4`, scope);
  if (saved.rowCount) {
    requireValue(saved.rows[0].request_hash === requestHash, 'IDEMPOTENCY_CONFLICT', 'Kunci sudah digunakan untuk isi berbeda.', 409);
    return saved.rows[0].response;
  }
  const response = await work();
  await client.query(`INSERT INTO idempotency_records(tenant_id,principal_id,operation,key,request_hash,response)
    VALUES($1,$2,$3,$4,$5,$6)`, [...scope, requestHash, JSON.stringify(response)]);
  return response;
}

async function audit(client, principal, action, entityId, detail = {}) {
  await client.query('INSERT INTO audit_events(tenant_id,actor_id,action,entity_id,detail) VALUES($1,$2,$3,$4,$5)',
    [principal.tenant_id, principal.user_id || principal.id, action, String(entityId), JSON.stringify(detail)]);
}

async function emit(client, tenantId, kind, payload, audienceSession = null) {
  await client.query('INSERT INTO outbox_events(id,tenant_id,audience_session,kind,payload) VALUES($1,$2,$3,$4,$5)',
    [crypto.randomUUID(), tenantId, audienceSession, kind, JSON.stringify(payload)]);
}

module.exports = { canonical, idempotent, audit, emit };
