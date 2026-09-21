'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

async function migrate(connectionString) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock(180018)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const folder = path.join(__dirname, '../db/migrations');
    for (const name of fs.readdirSync(folder).filter(n => n.endsWith('.sql')).sort()) {
      if ((await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name])).rowCount) continue;
      await client.query('BEGIN');
      try {
        await client.query(fs.readFileSync(path.join(folder, name), 'utf8'));
        await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [name]);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(180018)').catch(() => {});
    await client.end();
  }
}
module.exports = { migrate };
if (require.main === module) {
  if (!process.env.MIGRATION_DATABASE_URL) throw new Error('MIGRATION_DATABASE_URL required');
  migrate(process.env.MIGRATION_DATABASE_URL).then(() => console.log('Migrations applied')).catch(e => {
    console.error(e.message); process.exitCode = 1;
  });
}
