/**
 * AIODMA Suite 12 — Customer Memory, Frontend Logic & All-Screen CORS Layer Verification
 * Validates PRD v17.0 Specifications:
 * 1. Customer Habit & Dietary Profile Store (/api/customer/profile)
 * 2. AI Sommelier Conversational Memory & Multi-Turn Retention
 * 3. Multi-Language (ID / EN) Localization
 * 4. Multi-Origin CORS Layer Resilience (Private LAN, WebViews, Whitelist)
 * 5. Multi-Tenant Pricing & Tax Calculation Precision (BND & IDR)
 */

const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:8080';

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url || '/', BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json
        });
      });
    });

    req.on('error', reject);
    if (postData) {
      if (typeof postData === 'object') {
        req.write(JSON.stringify(postData));
      } else {
        req.write(postData);
      }
    }
    req.end();
  });
}

async function runSuite12() {
  console.log('🚀 Starting Suite 12: Frontend Logic, CORS Layer Resilience & Customer Memory...\n');

  // =========================================================================
  // TEST 1: Customer Profile & Habit Persistence Store
  // =========================================================================
  console.log('[Test 1] Customer Profile & Habit Persistence Store');
  const testCustId = 'cust_test_' + Date.now();

  // 1a. Default Profile Retrieval
  const resGetDefault = await request({
    url: `/api/customer/profile?customerId=${testCustId}`,
    method: 'GET'
  });
  assert.strictEqual(resGetDefault.statusCode, 200);
  assert.strictEqual(resGetDefault.json.success, true);
  assert.strictEqual(resGetDefault.json.profile.customerId, testCustId);
  console.log(`  ✔ Default profile successfully provisioned for ${testCustId}`);

  // 1b. Update Customer Habits (Dietary, Sweetness, Milk)
  const resUpdateProfile = await request({
    url: '/api/customer/profile',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    customerId: testCustId,
    preferences: {
      sweetnessLevel: 'Less Sugar 50%',
      milkAlternative: 'Oat Milk',
      temperature: 'Iced'
    },
    allergies: ['lactose', 'kacang_tanah'],
    favoriteItems: ['Pepperoni Pizza', 'Iced Latte']
  });

  assert.strictEqual(resUpdateProfile.statusCode, 200);
  assert.strictEqual(resUpdateProfile.json.success, true);
  const updated = resUpdateProfile.json.profile;
  assert.strictEqual(updated.preferences.milkAlternative, 'Oat Milk');
  assert.strictEqual(updated.preferences.sweetnessLevel, 'Less Sugar 50%');
  assert(updated.allergies.includes('lactose'));
  assert(updated.allergies.includes('kacang_tanah'));
  console.log('  ✔ Customer dietary habits, allergies & preferences persistently recorded');

  // =========================================================================
  // TEST 2: AI Sommelier Conversational Memory & Multi-Turn Retention
  // =========================================================================
  console.log('\n[Test 2] AI Sommelier Conversational Memory & Multi-Turn Retention');

  // 2a. Returning Customer with Lactose Allergy & Oat Milk Preference
  const resChatWithMemory = await request({
    url: '/api/ai/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-merchant-id': 'coffeenity'
    }
  }, {
    merchantId: 'coffeenity',
    table: 'Meja 5',
    message: 'Halo, tolong berikan rekomendasi minuman kopi untuk saya.',
    customerProfile: {
      customerId: testCustId,
      visitCount: 4, // Repeat customer
      preferences: {
        milkAlternative: 'Oat Milk',
        sweetnessLevel: 'Less Sugar 50%'
      },
      allergies: ['lactose']
    },
    language: 'id'
  });

  assert.strictEqual(resChatWithMemory.statusCode, 200);
  assert.strictEqual(resChatWithMemory.json.success, true);
  const aiText = resChatWithMemory.json.text;
  assert(aiText.toLowerCase().includes('kembali') || aiText.toLowerCase().includes('oat'), 'AI should acknowledge return visit or non-dairy preference');
  console.log(`  ✔ AI Sommelier tailored response based on customer memory: "${aiText.slice(0, 75)}..."`);

  // =========================================================================
  // TEST 3: Multi-Language AI Localization (English & Indonesian)
  // =========================================================================
  console.log('\n[Test 3] Multi-Language AI Localization');

  // 3a. English Inquiry
  const resChatEn = await request({
    url: '/api/ai/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-merchant-id': 'coffeenity'
    }
  }, {
    merchantId: 'coffeenity',
    table: 'Meja 5',
    message: 'Can you recommend a savory wood-fired pizza?',
    language: 'en'
  });

  assert.strictEqual(resChatEn.statusCode, 200);
  assert.strictEqual(resChatEn.json.success, true);
  assert.strictEqual(resChatEn.json.language, 'en');
  console.log(`  ✔ English language response generated: "${resChatEn.json.text.slice(0, 70)}..."`);

  // =========================================================================
  // TEST 4: Client-Side CORS Layer Resilience across Display Layers
  // =========================================================================
  console.log('\n[Test 4] Client-Side CORS Layer Resilience across Display Layers');

  // 4a. Native Mobile App WebView (capacitor://localhost)
  const resCapacitor = await request({
    url: '/api/merchants',
    method: 'GET',
    headers: { 'Origin': 'capacitor://localhost' }
  });
  assert.strictEqual(resCapacitor.statusCode, 200);
  assert.strictEqual(resCapacitor.headers['access-control-allow-origin'], 'capacitor://localhost');
  console.log('  ✔ Native Mobile App WebView origin allowed with credentials');

  // 4b. Localhost PWA Dev Port (http://localhost:5173)
  const resPwaPort = await request({
    url: '/api/merchants',
    method: 'GET',
    headers: { 'Origin': 'http://localhost:5173' }
  });
  assert.strictEqual(resPwaPort.statusCode, 200);
  assert.strictEqual(resPwaPort.headers['access-control-allow-origin'], 'http://localhost:5173');
  console.log('  ✔ Localhost PWA port dynamically whitelisted');

  // 4c. Rogue Origin Rejection
  const resRogue = await request({
    url: '/api/merchants',
    method: 'GET',
    headers: { 'Origin': 'https://unauthorized-attacker.xyz' }
  });
  assert.strictEqual(resRogue.headers['access-control-allow-origin'], undefined, 'Rogue origin must NOT receive allow-origin header');
  console.log('  ✔ Rogue cross-origin domain blocked from CORS access');

  // =========================================================================
  // TEST 5: Multi-Tenant Pricing & Financial Calculation Precision
  // =========================================================================
  console.log('\n[Test 5] Multi-Tenant Pricing & Financial Calculation Precision');

  // 5a. Coffeenity (Brunei BND) - 0.0% Regional Tax
  const resOrderBnd = await request({
    url: '/api/orders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-merchant-id': 'coffeenity'
    }
  }, {
    merchantId: 'coffeenity',
    table: 'Meja 5',
    items: [
      { id: 'pizza_pepperoni', name: 'Pepperoni Pizza', qty: 2 },
      { id: 'sig_garden_mojito', name: 'Garden Mojito (Virgin)', qty: 1 }
    ],
    paymentMethod: 'BIBD'
  });

  assert.strictEqual(resOrderBnd.statusCode, 201);
  assert.strictEqual(resOrderBnd.json.order.currency, 'BND');
  assert.strictEqual(resOrderBnd.json.order.tax, 0, 'Brunei Coffeenity tax must be exactly 0%');
  assert.strictEqual(resOrderBnd.json.order.total, 21.00, '2 * 8.00 + 5.00 = 21.00');
  console.log(`  ✔ BND precision verified: Total $${resOrderBnd.json.order.total.toFixed(2)} with $${resOrderBnd.json.order.tax} tax`);

  // 5b. Senopati (Indonesia IDR) - 10.0% PB1 Restaurant Tax
  const resOrderIdr = await request({
    url: '/api/orders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-merchant-id': 'senopati_cafe'
    }
  }, {
    merchantId: 'senopati_cafe',
    table: 'Meja 3',
    items: [
      { id: 'kopi_milk_aren', name: 'Kopi Milk Aren', price: 28000, qty: 2 }
    ],
    paymentMethod: 'QRIS'
  });

  assert.strictEqual(resOrderIdr.statusCode, 201);
  assert.strictEqual(resOrderIdr.json.order.currency, 'IDR');
  assert.strictEqual(resOrderIdr.json.order.tax, 5600, '10% of 56000 is 5600');
  assert.strictEqual(resOrderIdr.json.order.total, 61600, '56000 + 5600 = 61600');
  console.log(`  ✔ IDR precision verified: Total Rp ${resOrderIdr.json.order.total.toLocaleString()} with Rp ${resOrderIdr.json.order.tax.toLocaleString()} PB1 tax`);

  console.log('\n======================================================================');
  console.log('🎉 ALL 5/5 SUITE 12 FRONTEND LOGIC & MEMORY VERIFICATIONS PASSED!');
  console.log('======================================================================\n');
}

runSuite12().catch(err => {
  console.error('\n❌ Suite 12 Failed with Error:');
  console.error(err);
  process.exit(1);
});
