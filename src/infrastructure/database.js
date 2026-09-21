'use strict';
const { Pool } = require('pg');

function createDatabase(connectionString) {
  const pool = new Pool({ connectionString, max: 12, connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000, statement_timeout: 10000 });
  pool.on('error', () => console.error(JSON.stringify({ event: 'database_pool_error' })));

  async function transaction(tenantId, work) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId || '']);
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
  return { pool, transaction, close: () => pool.end() };
}

module.exports = { createDatabase };
