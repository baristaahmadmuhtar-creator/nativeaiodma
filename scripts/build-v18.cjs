'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { provision } = require('./provision-v18.cjs');

function copy(source, destination) {
  fs.cpSync(source, destination, { recursive: true, force: true });
}

async function build() {
  await provision();
  const root = path.resolve(__dirname, '..');
  const output = path.join(root, 'public');
  fs.mkdirSync(output, { recursive: true });
  copy(path.join(root, 'assets'), path.join(output, 'assets'));
  copy(path.join(root, 'css'), path.join(output, 'css'));
  fs.mkdirSync(path.join(output, 'js'), { recursive: true });
  for (const name of ['customer-v18.js', 'admin-v18.js']) {
    fs.copyFileSync(path.join(root, 'js', name), path.join(output, 'js', name));
  }
  fs.copyFileSync(path.join(root, 'js', 'sw-v18.js'), path.join(output, 'sw.js'));
  fs.copyFileSync(path.join(root, 'manifest.json'), path.join(output, 'manifest.json'));
  fs.copyFileSync(path.join(root, 'admin-v18.html'), path.join(output, 'admin.html'));
  console.log('Prepared vetted v18 static assets for Vercel');
}

build().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
