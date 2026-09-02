const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = '/Users/baristaalpha/.gemini/antigravity/brain/04630baa-65b1-4699-9b36-26572308a1c8';
const BASE_URL = 'http://127.0.0.1:8080';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function captureScreens() {
  console.log('📸 Launching Puppeteer to capture Coffeenity Multi-Tenant screens...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2 }); // iPhone 16 Pro dimensions

  // 1. Customer Screen 1: Welcome & Language Selection
  await page.goto(`${BASE_URL}/?merchant=coffeenity&table=5`, { waitUntil: 'domcontentloaded' });
  await sleep(600);
  const screen1Path = path.join(ARTIFACT_DIR, 'coffeenity_01_welcome.png');
  await page.screenshot({ path: screen1Path });
  console.log('✔ Screen 1 saved:', screen1Path);

  // 2. Customer Screen 2: Conversational Sommelier Chat
  await page.click('.lang-card-pill[data-lang="ms-BN"]');
  await sleep(800);
  const screen2Path = path.join(ARTIFACT_DIR, 'coffeenity_02_chat.png');
  await page.screenshot({ path: screen2Path });
  console.log('✔ Screen 2 saved:', screen2Path);

  // 3. Customer Screen 3: Menu Catalog in BND $
  await page.click('#btnModeTrigger');
  await sleep(300);
  await page.click('#optModeMenu');
  await sleep(800);
  const screen3Path = path.join(ARTIFACT_DIR, 'coffeenity_03_menu_bnd.png');
  await page.screenshot({ path: screen3Path });
  console.log('✔ Screen 3 saved:', screen3Path);

  // 4. Customer Screen 4: Pizza Customizer Modal (Size 9" vs 12")
  const pizzaCard = await page.$('.product-card');
  if (pizzaCard) {
    await pizzaCard.click();
    await sleep(700);
    const screen4Path = path.join(ARTIFACT_DIR, 'coffeenity_04_customizer_modal.png');
    await page.screenshot({ path: screen4Path });
    console.log('✔ Screen 4 saved:', screen4Path);

    // Add to cart from customizer
    await page.click('#btnAddCustomizedToCart');
    await sleep(500);
  }

  // 5. Customer Screen 5: Payment Sheet with BND & Brunei Methods
  await page.click('#btnCatalogCartPill');
  await sleep(600);
  await page.click('#btnProceedToPayment');
  await sleep(800);
  const screen5Path = path.join(ARTIFACT_DIR, 'coffeenity_05_payment_sheet_bnd.png');
  await page.screenshot({ path: screen5Path });
  console.log('✔ Screen 5 saved:', screen5Path);

  // 6. Admin Portal Multi-Tenant KDS & Tenant Selector
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/admin.html`, { waitUntil: 'domcontentloaded' });
  await sleep(800);
  await page.click('.nav-item-btn[data-tab="tabKDS"]');
  await sleep(800);
  const screen6Path = path.join(ARTIFACT_DIR, 'coffeenity_06_admin_kds_saas.png');
  await page.screenshot({ path: screen6Path });
  console.log('✔ Screen 6 saved:', screen6Path);

  // 7. Admin Tables QR Standees Grid (12 Tables)
  await page.click('.nav-item-btn[data-tab="tabTableQR"]');
  await sleep(800);
  const screen7Path = path.join(ARTIFACT_DIR, 'coffeenity_07_admin_tables_standees.png');
  await page.screenshot({ path: screen7Path });
  console.log('✔ Screen 7 saved:', screen7Path);

  await browser.close();
  console.log('🏁 All 7 production screenshots captured successfully!');
}

captureScreens().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
