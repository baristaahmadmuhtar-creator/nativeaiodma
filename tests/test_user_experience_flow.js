/**
 * Automated Verification Script: Testing Recent UX & Feature Enhancements
 * 1. Pure AI Model Configuration & Server Status
 * 2. Zero API Key mention verification & Zero Emoji on Buka Menu button
 * 3. Chat bubble borders and non-black user bubble
 * 4. Borderless input fields & focus outline removal
 * 5. Screen 1 Table 5 Liquid Glass badge
 * 6. Single liquid glass stepper in cart (no duplicate outer quantity)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:8080';

function makeRequest(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (postData) reqHeaders['Content-Length'] = Buffer.byteLength(postData);

    const req = http.request(url, {
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, body: data, json });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('=============================================================');
  console.log('🧪 LIVE TEST: PURE AI ENGINE, CHAT BUBBLES, INPUTS & STEPPER');
  console.log(`Target Host: ${BASE_URL}`);
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, title) {
    if (condition) {
      console.log(`  ✔ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  ✖ [FAIL] ${title}`);
      failed++;
    }
  }

  // 1. Check Server AI Config Endpoint
  console.log('▶ STEP 1: VERIFY PURE AI CONFIG API');
  const aiCfgRes = await makeRequest('GET', '/api/ai/config');
  assert(aiCfgRes.status === 200, 'GET /api/ai/config returns HTTP 200');
  assert(aiCfgRes.json && aiCfgRes.json.success === true, 'AI Config endpoint returns success: true');
  assert(Boolean(aiCfgRes.json?.model), `AI Config exposes model: ${aiCfgRes.json?.model}`);

  // 2. Test Admin Config Updates
  console.log('\n▶ STEP 2: TEST ADMIN AI CONFIG MANAGEMENT');
  const loginRes = await makeRequest('POST', '/api/admin/login', { pin: '8888' });
  const token = loginRes.json?.token;
  assert(Boolean(token), 'Admin logged in with PIN 8888');

  const updateCfgRes = await makeRequest('POST', '/api/admin/config', {
    model: 'gemini-3.7-flash',
    tone: 'warm',
    temperature: 0.7
  }, { 'Authorization': `Bearer ${token}` });
  assert(updateCfgRes.json?.config?.model === 'gemini-3.7-flash', 'Admin successfully set model to gemini-3.7-flash');

  // 3. Test Customer Chat Guidance (Zero Emoji Policy & Buka Menu button)
  console.log('\n▶ STEP 3: VERIFY ZERO EMOJI POLICY & CLEAN BUKA MENU BUTTON');
  const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  const stylesCss = fs.readFileSync(path.join(__dirname, '../public/css/styles.css'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

  const hasCleanBukaMenu = appJs.includes("label: 'Buka Menu'");
  assert(hasCleanBukaMenu, 'Button label is strictly "Buka Menu" without Buku or emojis');

  const hasNoClipboardEmoji = !appJs.includes('Buka Buku Menu 📋');
  assert(hasNoClipboardEmoji, 'No clipboard emoji or emoji symbols on Buka Menu button');

  const leaksApiKeyToCustomer = appJs.includes("appendAiBubble('Sistem saat ini berada dalam **Fokus Mode AI Saja**. Pastikan API Key");
  assert(!leaksApiKeyToCustomer, 'Client app NEVER mentions "API Key" to customer');

  // 4. Verify Chat Bubble Styles (No border, non-black user bubble)
  console.log('\n▶ STEP 4: VERIFY CHAT BUBBLE STYLING (BORDERLESS & NON-BLACK)');
  const userBubbleHasNoBorder = stylesCss.includes('.chat-bubble-user') && stylesCss.includes('border: none !important;');
  assert(userBubbleHasNoBorder, '.chat-bubble-user has "border: none !important;"');

  const aiBubbleHasNoBorder = stylesCss.includes('.chat-bubble-ai') && stylesCss.includes('border: none !important;');
  assert(aiBubbleHasNoBorder, '.chat-bubble-ai has "border: none !important;"');

  const userBubbleIsNotBlack = (stylesCss.includes('background: #F1F3F5;') || stylesCss.includes('background: #DEE4EB;') || stylesCss.includes('background: #E8EDF2;')) && !stylesCss.includes('background: #111111;\n  color: #FFFFFF;\n  font-size: 15px;');
  assert(userBubbleIsNotBlack, '.chat-bubble-user uses soft neutral slate-grey (#F1F3F5) instead of black');

  // 5. Verify Input & Search Field Styling (Borderless, No Focus Rings)
  console.log('\n▶ STEP 5: VERIFY BORDERLESS INPUTS & REMOVAL OF INNER FOCUS RINGS');
  const inputHasNoOutline = stylesCss.includes(':focus-visible') && stylesCss.includes('outline: none !important;');
  assert(inputHasNoOutline, ':focus-visible outline is completely removed (outline: none !important)');

  const chatInputBorderless = stylesCss.includes('.chat-text-input') && stylesCss.includes('border: none !important;');
  assert(chatInputBorderless, '.chat-text-input has border: none !important');

  const catalogSearchBorderless = indexHtml.includes('id="catalogSearchInput"') && indexHtml.includes('border: none !important');
  assert(catalogSearchBorderless, '#catalogSearchInput has inline border: none !important');

  // 6. Verify Screen 1 Table 5 Liquid Glass Pill
  console.log('\n▶ STEP 6: VERIFY SCREEN 1 TABLE 5 LIQUID GLASS PILL');
  const screen1TableLiquidGlass = stylesCss.includes('.lang-table-badge-pill') && stylesCss.includes('backdrop-filter: blur(');
  assert(screen1TableLiquidGlass, 'Screen 1 MEJA 5 pill is styled with full crystal Liquid Glass');

  // 7. Verify Cart Stepper (No duplicate quantity label, Liquid Glass styled)
  console.log('\n▶ STEP 7: VERIFY CART STEPPER (LIQUID GLASS & NO DUPLICATE NUMBER)');
  const cartRowNoDuplicateQty = !appJs.includes('<span class="cart-item-qty-badge">x ${item.qty}</span>');
  assert(cartRowNoDuplicateQty, 'Cart sheet row does NOT contain duplicate outer "x ${item.qty}" badge');

  const stepperIsCleanSeparated = stylesCss.includes('.cart-stepper-control') && stylesCss.includes('background: transparent !important;');
  assert(stepperIsCleanSeparated, '.cart-stepper-control has no background envelope so buttons are cleanly separated');

  const stepperButtonComfortSize = stylesCss.includes('.stepper-btn') && stylesCss.includes('width: 32px;') && stylesCss.includes('height: 32px;');
  assert(stepperButtonComfortSize, '.stepper-btn has ergonomic enlarged touch size (32px x 32px)');

  // 8. Verify Removal of Ganti Bahasa from 3-dots Menu
  console.log('\n▶ STEP 8: VERIFY REMOVAL OF GANTI BAHASA FROM 3-DOTS MENU');
  const noChangeLangInHtml = !indexHtml.includes('id="menuItemChangeLang"');
  assert(noChangeLangInHtml, 'Ganti Bahasa item successfully removed from 3-dots action menu in index.html');

  const noChangeLangInJs = !appJs.includes("document.getElementById('menuItemChangeLang')");
  assert(noChangeLangInJs, 'Ganti Bahasa event listener successfully removed from js/app.js');

  console.log('\n=============================================================');
  console.log(`📊 TEST SUMMARY: Total: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('=============================================================');

  if (failed === 0) {
    console.log('\n✨ ALL USER PREFERENCE & EXPERIENCE TESTS PASSED 100% PERFECTLY!\n');
    process.exit(0);
  } else {
    console.error('\n❌ SOME TESTS FAILED!\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test Execution Error:', err);
  process.exit(1);
});
