const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = '/Users/baristaalpha/.gemini/antigravity/brain/04630baa-65b1-4699-9b36-26572308a1c8';
const BASE_URL = 'http://127.0.0.1:8080';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function captureMultiTurnFlow() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2 });

  await page.goto(`${BASE_URL}/?merchant=coffeenity&table=5`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);

  // Click on Brunei language pill
  await page.evaluate(() => {
    const pill = document.querySelector('.lang-card-pill[data-lang="ms-BN"]');
    if (pill) pill.click();
  });
  await sleep(1000);

  // Turn 1: Ask for Pizza Recommendations
  console.log('Turn 1: Asking for Pizza Recommendations...');
  await page.type('#chatInputText', 'Ada pizza apa aja?');
  await page.keyboard.press('Enter');

  await page.waitForFunction(() => {
    const rec = document.querySelector('.recommendation-container');
    return rec && rec.querySelectorAll('.rec-card-mini').length > 0;
  }, { timeout: 15000 });
  await sleep(2000);

  // Screenshot 1: Pizza Cards
  const screenPizza = path.join(ARTIFACT_DIR, 'coffeenity_02c_chat_pizza_cards.png');
  await page.screenshot({ path: screenPizza });
  console.log('✔ Screen Pizza saved:', screenPizza);

  // Turn 2: Order Margherita Pizza
  console.log('Turn 2: Ordering Margherita Pizza...');
  await page.type('#chatInputText', 'Mau pesan 1 Margherita Pizza');
  await page.keyboard.press('Enter');

  await page.waitForFunction(() => {
    const addedCards = document.querySelectorAll('.chat-added-card');
    return addedCards.length > 0;
  }, { timeout: 15000 });
  await sleep(2000);

  // Screenshot 2: Cart Card Added
  const screenAdded = path.join(ARTIFACT_DIR, 'coffeenity_02d_chat_item_added.png');
  await page.screenshot({ path: screenAdded });
  console.log('✔ Screen Added saved:', screenAdded);

  // Turn 3: Check live order status
  console.log('Turn 3: Checking Order Status...');
  await page.type('#chatInputText', 'Status pesanan saya');
  await page.keyboard.press('Enter');

  await page.waitForFunction(() => {
    const bubbles = document.querySelectorAll('.chat-bubble-ai:not(.thinking)');
    return bubbles.length >= 3;
  }, { timeout: 15000 });
  await sleep(2000);

  const screenFull = path.join(ARTIFACT_DIR, 'coffeenity_02e_chat_full_flow.png');
  await page.screenshot({ path: screenFull });
  console.log('✔ Screen Full saved:', screenFull);

  await browser.close();
}

captureMultiTurnFlow().catch(err => {
  console.error(err);
  process.exit(1);
});
