const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = '/Users/baristaalpha/.gemini/antigravity/brain/04630baa-65b1-4699-9b36-26572308a1c8';
const BASE_URL = 'http://127.0.0.1:8080';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function captureActiveChat() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERR:', err.message));
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2 });

  await page.goto(`${BASE_URL}/?merchant=coffeenity&table=5`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);

  // Click on Brunei language pill
  await page.evaluate(() => {
    const pill = document.querySelector('.lang-card-pill[data-lang="ms-BN"]');
    if (pill) pill.click();
  });
  await sleep(1000);

  // Send query via chat input
  await page.type('#chatInputText', 'Rekomendasikan kopi terbaik untuk saya');
  await page.keyboard.press('Enter');

  console.log('Waiting for AI recommendation cards...');
  await page.waitForFunction(() => {
    const rec = document.querySelector('.recommendation-container');
    return rec && rec.querySelectorAll('.rec-card-mini').length > 0;
  }, { timeout: 15000 });

  await sleep(2000);

  const screenChatActive = path.join(ARTIFACT_DIR, 'coffeenity_02b_chat_conversation.png');
  await page.screenshot({ path: screenChatActive });
  console.log('✔ Screen 2B saved:', screenChatActive);

  await browser.close();
}

captureActiveChat().catch(err => {
  console.error(err);
  process.exit(1);
});
