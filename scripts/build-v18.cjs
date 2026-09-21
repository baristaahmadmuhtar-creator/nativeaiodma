'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { provision } = require('./provision-v18.cjs');

async function build() {
  await provision();
  const root = path.resolve(__dirname, '..');
  const required = ['public/assets','public/css/styles.css','public/css/customer-v18.css',
    'public/css/admin-v18.css','public/js/customer-v18.js','public/js/admin-v18.js',
    'public/sw.js','public/manifest.json'];
  for (const name of required) {
    if (!fs.existsSync(path.join(root,name))) throw new Error(`Missing production asset: ${name}`);
  }
  console.log('Verified vetted v18 static assets for Vercel');
}

build().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
