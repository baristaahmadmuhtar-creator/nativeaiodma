'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { migrate } = require('./migrate.cjs');
const { seed } = require('./seed-v18.cjs');
const { tableToken } = require('../src/modules/identity');

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING;
  if (!connectionString) throw new Error('Unpooled production database URL is required');
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required');
  if (!process.env.PUBLIC_BASE_URL) throw new Error('PUBLIC_BASE_URL is required');

  await migrate(connectionString);

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

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
