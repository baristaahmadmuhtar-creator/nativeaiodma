const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const artifactDir = '/Users/baristaalpha/.gemini/antigravity/brain/04630baa-65b1-4699-9b36-26572308a1c8';

  // 1. Capture Customer App (Mobile Viewport)
  const customerPage = await browser.newPage();
  await customerPage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await customerPage.goto('http://127.0.0.1:8080/?table=5', { waitUntil: 'domcontentloaded' });
  await customerPage.screenshot({ path: path.join(artifactDir, 'prod_01_customer_screen1.png') });
  console.log('Saved prod_01_customer_screen1.png');

  // Open Chat via Language selection
  await customerPage.click('.lang-card-pill[data-lang="id-ID"]');
  await new Promise(r => setTimeout(r, 600));
  await customerPage.screenshot({ path: path.join(artifactDir, 'prod_02_customer_chat.png') });
  console.log('Saved prod_02_customer_chat.png');

  // Open Menu Catalog via Mode Dropdown
  await customerPage.click('#btnModeTrigger');
  await new Promise(r => setTimeout(r, 200));
  await customerPage.click('#optModeMenu');
  await new Promise(r => setTimeout(r, 600));
  await customerPage.screenshot({ path: path.join(artifactDir, 'prod_03_customer_catalog.png') });
  console.log('Saved prod_03_customer_catalog.png');

  // 2. Capture Admin KDS Portal (Desktop Viewport)
  const adminPage = await browser.newPage();
  await adminPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await adminPage.goto('http://127.0.0.1:8080/admin.html#kds', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 600));
  await adminPage.screenshot({ path: path.join(artifactDir, 'prod_04_admin_kds.png') });
  console.log('Saved prod_04_admin_kds.png');

  // Admin Tables & Local QR Codes
  await adminPage.goto('http://127.0.0.1:8080/admin.html#tables', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 600));
  await adminPage.screenshot({ path: path.join(artifactDir, 'prod_05_admin_tables_qr.png') });
  console.log('Saved prod_05_admin_tables_qr.png');

  await browser.close();
  console.log('All screenshots captured successfully!');
})();
