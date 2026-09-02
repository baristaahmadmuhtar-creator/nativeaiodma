/**
 * AIODMA - Multi-Tenant B2B SaaS Architecture & The Coffeenity Yard (BND) Test Suite
 * 
 * Tests:
 * 1. Multi-Tenant Registry API (/api/merchants, /api/merchants/:id)
 * 2. Coffeenity Yard Menu Catalog (46 items in BND $)
 * 3. Multi-Tenant Isolation (Coffeenity BND vs Senopati IDR)
 * 4. Multi-Tenant Order Pipeline & Modifier Calculation (Pizza size, coffee temp, indomee addons)
 * 5. Multi-Tenant KDS & Admin Isolation (Orders, Stats, Revenue in BND)
 * 6. Multi-Tenant Standee QR Generator (?merchant=coffeenity&table=5)
 * 7. Multi-Tenant Gemini AI Sommelier Chat Proxy with BND Currency
 */

const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:8080';
const ADMIN_TOKEN = 'aiodma2026';

function request(method, pathUrl, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const contentType = res.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
          } else {
            resolve({ status: res.statusCode, headers: res.headers, data: data });
          }
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTestSuite() {
  console.log('\n============================================================');
  console.log('🍕 AIODMA MULTI-TENANT B2B SAAS & THE COFFEENITY YARD (BND)');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    return async () => {
      try {
        await fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
      } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Reason: ${err.message}`);
        failed++;
      }
    };
  }

  let createdOrderId = null;

  const tests = [
    // 1. Merchants Registry List
    test('1. GET /api/merchants returns tenant list with Coffeenity and Senopati', async () => {
      const res = await request('GET', '/api/merchants');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.merchants), 'Merchants must be array');
      const coffeenity = res.data.merchants.find(m => m.id === 'coffeenity');
      assert.ok(coffeenity, 'Coffeenity merchant must exist');
      assert.strictEqual(coffeenity.currency, 'BND');
      assert.strictEqual(coffeenity.currencySymbol, '$');
      assert.strictEqual(coffeenity.tablesCount, 12);
    }),

    // 2. Coffeenity Merchant Metadata
    test('2. GET /api/merchants/coffeenity returns The Coffeenity Yard details', async () => {
      const res = await request('GET', '/api/merchants/coffeenity');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.merchant.name, 'The Coffeenity Yard');
      assert.ok(res.data.merchant.brandUnit.includes('Doughboy Pizza Kayu Api'));
      assert.deepStrictEqual(res.data.merchant.paymentMethods, ['BIBD', 'BAIDURI', 'POCKET', 'CASH']);
      assert.strictEqual(res.data.merchant.taxRate, 0.00);
    }),

    // 3. Complete 62-Item Curated Menu for Coffeenity
    test('3. GET /api/menu?merchant=coffeenity returns all 62 curated BND items', async () => {
      const res = await request('GET', '/api/menu?merchant=coffeenity');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data), 'Menu must be an array of items');
      assert.strictEqual(res.data.length, 62, 'Coffeenity catalog must contain exactly 62 items');

      // Check Wood-Fired Pizzas
      const margherita = res.data.find(m => m.id === 'pizza_margherita');
      assert.ok(margherita, 'Margherita pizza must exist');
      assert.strictEqual(margherita.price, 10.00);
      assert.strictEqual(margherita.category, 'pizza');

      const pepperoni = res.data.find(m => m.id === 'pizza_pepperoni');
      assert.ok(pepperoni, 'Pepperoni pizza must exist');
      assert.strictEqual(pepperoni.price, 8.00);
      assert.ok(pepperoni.customizations?.size?.length >= 2, 'Pepperoni must have size options');

      // Check Calzone & Indomee
      const indomee = res.data.find(m => m.id === 'indomee_custom_bar');
      assert.ok(indomee, 'Indomee custom bar must exist');
      assert.strictEqual(indomee.price, 2.00);

      // Check Espresso & Filter Coffee
      const americano = res.data.find(m => m.id === 'coffee_americano');
      assert.ok(americano, 'Americano must exist');
      assert.strictEqual(americano.price, 3.50);

      const yardLatte = res.data.find(m => m.id === 'sig_yard_latte');
      assert.ok(yardLatte, 'Yard Latte must exist');
      assert.strictEqual(yardLatte.price, 6.00);
    }),

    // 4. Secondary Tenant Menu (Senopati Cafe in IDR)
    test('4. GET /api/menu?merchant=senopati_cafe returns 36 IDR items', async () => {
      const res = await request('GET', '/api/menu?merchant=senopati_cafe');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
      assert.strictEqual(res.data.length, 36, 'Senopati catalog must contain 36 items');
      const aren = res.data.find(m => m.id === 'kopi_milk_aren');
      assert.ok(aren, 'Kopi Milk Aren must exist in IDR tenant');
      assert.strictEqual(aren.price, 28000);
    }),

    // 5. Multi-Tenant Order Placement (Coffeenity in BND with custom modifier pricing)
    test('5. POST /api/orders places a BND order for The Coffeenity Yard', async () => {
      const orderPayload = {
        merchantId: 'coffeenity',
        table: 'Meja 5',
        tableNum: 5,
        paymentMethod: 'BIBD',
        items: [
          {
            id: 'pizza_pepperoni',
            name: 'Pepperoni Pizza',
            price: 8.00,
            qty: 1,
            subtext: 'Large (12")',
            unitPrice: 14.00, // $8.00 base + $6.00 Large upgrade
            subtotal: 14.00
          },
          {
            id: 'indomee_custom_bar',
            name: 'Indomee Custom Bar',
            price: 2.00,
            qty: 1,
            subtext: 'Telur Mata Sapi, Kerang Dara',
            unitPrice: 5.00, // $2.00 base + $1.00 Egg + $2.00 Baby Clam
            subtotal: 5.00
          },
          {
            id: 'coffee_americano',
            name: 'Americano',
            price: 3.50,
            qty: 1,
            subtext: 'Iced',
            unitPrice: 4.00, // $3.50 base + $0.50 Iced
            subtotal: 4.00
          }
        ],
        subtotal: 23.00,
        tax: 0.00,
        total: 23.00
      };

      const res = await request('POST', '/api/orders', orderPayload);
      assert.ok([200, 201].includes(res.status), `Status must be 200 or 201 (got ${res.status})`);
      assert.strictEqual(res.data.success, true);
      assert.ok(res.data.order, 'Order object returned');
      assert.strictEqual(res.data.order.merchantId, 'coffeenity');
      assert.strictEqual(res.data.order.total, 23.00);
      assert.strictEqual(res.data.order.paymentMethod, 'BIBD');
      assert.strictEqual(res.data.order.paymentStatus, 'PAID');
      assert.strictEqual(res.data.order.status, 'received');
      createdOrderId = res.data.order.id;
    }),

    // 6. Multi-Tenant Admin Orders Isolation
    test('6. GET /api/admin/orders with x-merchant-id: coffeenity returns only Coffeenity orders', async () => {
      const res = await request('GET', '/api/admin/orders', null, {
        'x-admin-token': ADMIN_TOKEN,
        'x-merchant-id': 'coffeenity'
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.data));
      const order = res.data.data.find(o => o.id === createdOrderId);
      assert.ok(order, 'Placed order must appear in Coffeenity KDS feed');
      assert.strictEqual(order.merchantId, 'coffeenity');
      assert.strictEqual(order.total, 23.00);
    }),

    // 7. Multi-Tenant Admin Stats in BND
    test('7. GET /api/admin/stats returns metrics in BND for Coffeenity', async () => {
      const res = await request('GET', '/api/admin/stats', null, {
        'x-admin-token': ADMIN_TOKEN,
        'x-merchant-id': 'coffeenity'
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.currency, 'BND');
      assert.strictEqual(res.data.currencySymbol, '$');
      assert.ok(res.data.stats.grossRevenue >= 23.00, 'Gross revenue should include placed BND order');
    }),

    // 8. Multi-Tenant Table Standee QR Code Generator
    test('8. GET /api/tables/5/qr?merchant=coffeenity returns SVG QR targeting Coffeenity table', async () => {
      const res = await request('GET', '/api/tables/5/qr?merchant=coffeenity');
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers['content-type'].includes('svg'), 'Content-Type must be SVG');
      assert.ok(typeof res.data === 'string' && res.data.includes('<svg'), 'Response must contain SVG element');
    }),

    // 9. Multi-Tenant AI Sommelier Chat Proxy in BND
    test('9. POST /api/ai/chat for Coffeenity responds with BND knowledge', async () => {
      const res = await request('POST', '/api/ai/chat', {
        merchant: 'coffeenity',
        message: 'Rekomendasi pizza untuk 2 orang dan minumannya apa?',
        history: [],
        table: 'Meja 5',
        cart: []
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(res.data.text || res.data.functionCalls, 'AI response must return text or tool call');
    })
  ];

  for (const t of tests) {
    await t();
  }

  console.log('\n============================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Start server if needed or run against running server
runTestSuite().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
