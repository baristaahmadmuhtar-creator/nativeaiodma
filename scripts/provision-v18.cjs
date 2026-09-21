'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { migrate } = require('./migrate.cjs');
const { seed } = require('./seed-v18.cjs');
const { tableToken } = require('../src/modules/identity');
const { Client } = require('pg');

async function configureRuntimeRole(connectionString, role, password) {
  if (!/^[a-z][a-z0-9_]{2,62}$/.test(role) || !/^[A-Za-z0-9_-]{32,128}$/.test(password)) {
    throw new Error('Runtime database credentials are invalid');
  }
  const identifier = `"${role}"`;
  const literal = `'${password}'`;
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');
    const exists = await client.query('SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname=$1', [role]);
    if (!exists.rowCount) {
      await client.query(`CREATE ROLE ${identifier} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD ${literal}`);
    } else if (exists.rows[0].rolsuper || exists.rows[0].rolbypassrls) {
      throw new Error('Existing runtime database role is privileged');
    }
    await client.query(`GRANT USAGE ON SCHEMA public TO ${identifier}`);
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${identifier}`);
    await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${identifier}`);
    await client.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${identifier}`);
    await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${identifier}`);
    await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${identifier}`);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function provision() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING;
  if (!connectionString) throw new Error('Unpooled production database URL is required');
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required');
  if (!process.env.PUBLIC_BASE_URL) throw new Error('PUBLIC_BASE_URL is required');
  if (!process.env.DB_RUNTIME_PASSWORD) throw new Error('DB_RUNTIME_PASSWORD is required');

  await migrate(connectionString);
  await configureRuntimeRole(connectionString, process.env.DB_RUNTIME_USER || 'aiodma_runtime', process.env.DB_RUNTIME_PASSWORD);

  const localDirectory = path.resolve(__dirname, '../.local');
  const accessPath = path.join(localDirectory, 'production-access.json');
  fs.mkdirSync(localDirectory, { recursive: true });
  const access = process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD
    ? { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD }
    : fs.existsSync(accessPath)
      ? JSON.parse(fs.readFileSync(accessPath, 'utf8'))
      : { email: 'owner@aiodma.local', password: crypto.randomBytes(24).toString('base64url') };
  const legacy = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/db.json'), 'utf8'));
  const merchants = Object.values(legacy.merchants);
  await seed({ connectionString, merchants, email: access.email, password: access.password, published: true });

  const customerLinks = merchants.map(merchant => {
    const url = new URL('/', process.env.PUBLIC_BASE_URL);
    url.search = new URLSearchParams({
      merchant: merchant.id,
      table: '1',
      token: tableToken({ SESSION_SECRET: process.env.SESSION_SECRET }, merchant.id, 1, 1)
    }).toString();
    return { merchant: merchant.id, table: 1, url: url.href };
  });
  if (!process.env.VERCEL) {
    fs.writeFileSync(accessPath, JSON.stringify({ ...access, customerLinks }, null, 2), { mode: 0o600 });
  }
  console.log(`Provisioned ${merchants.length} merchants and ${customerLinks.length} table links`);
}

module.exports = { provision, configureRuntimeRole };
if (require.main === module) {
  provision().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
