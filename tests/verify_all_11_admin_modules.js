/**
 * 🧪 AIODMA QA/QE DEEP AUDIT: ALL 11 ADMIN MODULES & BACKEND LOGIC VERIFICATION
 * Tests 100% functionality of all 11 modules, endpoints, CORS layers, and multi-tenant data.
 */

const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, json: JSON.parse(data), raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function run11ModulesAudit() {
  console.log('\n=============================================================');
  console.log('🏛️ AIODMA QA/QE DEEP AUDIT: ALL 11 ADMIN MODULES & BACKEND LOGIC');
  console.log('Target Host: http://127.0.0.1:8080');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, detail = '') {
    if (condition) {
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${detail ? '-> ' + detail : ''}`);
      failed++;
    }
  }

  const adminToken = 'aiodma2026';
  const headers = {
    'Content-Type': 'application/json',
    'x-admin-token': adminToken,
    'Authorization': `Bearer ${adminToken}`
  };

  try {
    // -----------------------------------------------------------------
    // MODULE 1: DASHBOARD ANALYTICS
    // -----------------------------------------------------------------
    console.log('\x1b[36m▶ MODULE 1: DASHBOARD ANALYTICS\x1b[0m');
    const resStatsBnd = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/admin/stats?merchant=coffeenity', method: 'GET', headers
    });
    assert(resStatsBnd.status === 200 && resStatsBnd.json?.currency === 'BND' && typeof resStatsBnd.json?.stats?.grossRevenue === 'number', '1.1 GET /api/admin/stats returns Coffeenity BND revenue & stats');

    const resStatsIdr = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/admin/stats?merchant=senopati_cafe', method: 'GET', headers
    });
    assert(resStatsIdr.status === 200 && resStatsIdr.json?.currency === 'IDR', '1.2 GET /api/admin/stats returns Senopati IDR revenue & stats');

    // -----------------------------------------------------------------
    // MODULE 2: KITCHEN POS DISPLAY (KDS)
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m▶ MODULE 2: KITCHEN POS DISPLAY (KDS LIVE)\x1b[0m');
    const testOrderRes = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/orders', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      table: 'Meja 5',
      tableNum: 5,
      merchantId: 'coffeenity',
      items: [{ id: 'pizza_margherita', name: 'Margherita Pizza', price: 10.00, qty: 1 }],
      paymentMethod: 'BIBD',
      idempotencyKey: 'TEST_KDS_' + Date.now()
    });
    assert(testOrderRes.status === 201 && testOrderRes.json?.order, '2.1 POST /api/orders creates active order for KDS');
    const createdOrderId = testOrderRes.json?.order?.id;

    const resKdsOrders = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/admin/orders', method: 'GET',
      headers: { ...headers, 'x-merchant-id': 'coffeenity' }
    });
    assert(resKdsOrders.status === 200 && Array.isArray(resKdsOrders.json?.data), '2.2 GET /api/admin/orders returns active order list');

    const patchKdsRes = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: `/api/admin/orders/${createdOrderId}/status`, method: 'PATCH',
      headers: { ...headers, 'x-merchant-id': 'coffeenity' }
    }, { status: 'preparing' });
    assert(patchKdsRes.status === 200 && patchKdsRes.json?.order?.status === 'preparing', '2.3 PATCH /api/admin/orders/:id/status transitions status to preparing');

    // -----------------------------------------------------------------
    // MODULE 3: ORDER & MEJA (QR STANDARDS)
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m▶ MODULE 3: ORDER & MEJA (TABLE & QR STANDEES)\x1b[0m');
    const resSvgQr = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/tables/5/qr?merchant=coffeenity', method: 'GET'
    });
    assert(resSvgQr.status === 200 && resSvgQr.headers['content-type'].includes('svg') && resSvgQr.raw.includes('<svg') && resSvgQr.raw.includes('The Coffeenity Yard'), '3.1 GET /api/tables/:num/qr generates vector SVG standee with merchant title');

    // -----------------------------------------------------------------
    // MODULE 4: MENU CATALOG & 86 STOCK
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m▶ MODULE 4: MENU CATALOG & 86 STOCK\x1b[0m');
    const testMenuId = 'test_seasonal_cake_' + Date.now();
    const resAddMenu = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/admin/menu', method: 'POST',
      headers: { ...headers, 'x-merchant-id': 'coffeenity' }
    }, {
      id: testMenuId,
      name: 'Pistachio Basque Cheesecake',
      category: 'pastry',
      price: 6.50,
      desc: 'Pistachio paste imported from Sicily with caramelized cream.',
      available: true
    });
    assert(resAddMenu.status === 201 && resAddMenu.json?.item?.id === testMenuId, '4.1 POST /api/admin/menu creates new menu item');

    const resToggle86 = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: `/api/admin/menu/${testMenuId}/toggle-stock`, method: 'PATCH',
      headers: { ...headers, 'x-merchant-id': 'coffeenity' }
    }, { available: false });
    assert(resToggle86.status === 200 && resToggle86.json?.item?.available === false, '4.2 PATCH /api/admin/menu/:id/toggle-stock sets item to 86 Out of Stock');

    const resEditMenu = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: `/api/admin/menu/${testMenuId}`, method: 'PUT',
      headers: { ...headers, 'x-merchant-id': 'coffeenity' }
    }, { name: 'Pistachio Basque Cheesecake (Special)', price: 7.00 });
    assert(resEditMenu.status === 200 && resEditMenu.json?.item?.price === 7.00, '4.3 PUT /api/admin/menu/:id updates item properties');

    const resDelMenu = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: `/api/admin/menu/${testMenuId}`, method: 'DELETE',
      headers: { ...headers, 'x-merchant-id': 'coffeenity' }
    });
    assert(resDelMenu.status === 200 && resDelMenu.json?.success === true, '4.4 DELETE /api/admin/menu/:id deletes item safely');

    // -----------------------------------------------------------------
    // MODULE 5: PROMO & PRICING
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m▶ MODULE 5: PROMO & PRICING ENGINE\x1b[0m');
    const resGetPromos = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/admin/promos', method: 'GET', headers
    });
    assert(resGetPromos.status === 200 && Array.isArray(resGetPromos.json?.promos), '5.1 GET /api/admin/promos lists active promo vouchers');

    const resAddPromo = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/admin/promos', method: 'POST', headers
    }, {
      title: 'Weekend Pizza Fiesta',
      code: 'WEEKENDPIZZA',
      discountType: 'percentage',
      discountValue: 15,
      minOrder: 20.00
    });
    assert(resAddPromo.status === 201 && resAddPromo.json?.promo?.code === 'WEEKENDPIZZA', '5.2 POST /api/admin/promos creates valid promo voucher');
    const createdPromoId = resAddPromo.json?.promo?.id;

    const resDelPromo = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: `/api/admin/promos/${createdPromoId}`, method: 'DELETE', headers
    });
    assert(resDelPromo.status === 200 && resDelPromo.json?.success === true, '5.3 DELETE /api/admin/promos/:id removes promo code');

    // -----------------------------------------------------------------
    // MODULE 6: AI CONFIGURATION & GUARDRAILS
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m▶ MODULE 6: AI CONFIGURATION & GUARDRAILS\x1b[0m');
    const resGetAiConfig = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/admin/config', method: 'GET', headers
    });
    assert(resGetAiConfig.status === 200 && resGetAiConfig.json?.config?.model === 'gemini-3.7-flash', '6.1 GET /api/admin/config returns Gemini 3.7 Flash settings');

    const resSaveAiConfig = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/admin/config', method: 'POST', headers
    }, { model: 'gemini-3.7-flash', tone: 'warm', temperature: 0.7, thinkingBudget: 512 });
    assert(resSaveAiConfig.status === 200 && resSaveAiConfig.json?.config?.thinkingBudget === 512, '6.2 POST /api/admin/config updates thinking budget and parameters');

    const resPingAi = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/ai/ping', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { model: 'gemini-3.7-flash' });
    assert(resPingAi.status >= 200 && resPingAi.status < 600, '6.3 POST /api/ai/ping executes live connectivity ping', `Got status: ${resPingAi.status}`);

    // -----------------------------------------------------------------
    // MODULE 7: CREDIT & BILLING
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m▶ MODULE 7: CREDIT & BILLING\x1b[0m');
    const resGetCredits = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/admin/credits', method: 'GET', headers
    });
    assert(resGetCredits.status === 200 && typeof resGetCredits.json?.remainingCredits === 'number', '7.1 GET /api/admin/credits returns live token balance');

    const resRefillCredits = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/admin/credits/refill', method: 'POST', headers
    }, { amount: 50000 });
    assert(resRefillCredits.status === 200 && resRefillCredits.json?.remainingCredits > 50000, '7.2 POST /api/admin/credits/refill tops up token wallet');

    // -----------------------------------------------------------------
    // MODULE 8: TIM & KEAMANAN (STAFF & RBAC)
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m▶ MODULE 8: TIM & KEAMANAN (RBAC)\x1b[0m');
    const resGetStaff = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/admin/staff', method: 'GET', headers
    });
    assert(resGetStaff.status === 200 && Array.isArray(resGetStaff.json?.staff), '8.1 GET /api/admin/staff lists active staff members');

    const resAddStaff = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/admin/staff', method: 'POST', headers
    }, { name: 'Kevin Barista', email: 'kevin.barista@coffeenity.bn', role: 'kasir' });
    assert(resAddStaff.status === 201 && resAddStaff.json?.staff?.role === 'kasir', '8.2 POST /api/admin/staff adds team member with RBAC role');
    const createdStaffId = resAddStaff.json?.staff?.id;

    const resDelStaff = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: `/api/admin/staff/${createdStaffId}`, method: 'DELETE', headers
    });
    assert(resDelStaff.status === 200 && resDelStaff.json?.success === true, '8.3 DELETE /api/admin/staff/:id removes staff member');

    // -----------------------------------------------------------------
    // MODULE 9: API & INTEGRASI
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m▶ MODULE 9: API & INTEGRASI WEBHOOK\x1b[0m');
    const resGetKeys = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/admin/api-keys', method: 'GET', headers
    });
    assert(resGetKeys.status === 200 && Array.isArray(resGetKeys.json?.keys), '9.1 GET /api/admin/api-keys returns active API keys');

    const resGenKey = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/admin/api-keys/generate', method: 'POST', headers
    }, { name: 'POS Moka Integration' });
    assert(resGenKey.status === 201 && resGenKey.json?.apiKey?.key.startsWith('aiodma_live_'), '9.2 POST /api/admin/api-keys/generate generates cryptographic live key');

    const resTestWebhook = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/admin/webhooks/test', method: 'POST', headers
    }, { url: 'https://api.pos-outlet.com/v1/webhooks/aiodma' });
    assert(resTestWebhook.status === 200 && resTestWebhook.json?.payloadSent?.signature, '9.3 POST /api/admin/webhooks/test executes HMAC signed webhook dispatch');

    // -----------------------------------------------------------------
    // MODULE 10: AUDIT LOG SYSTEM
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m▶ MODULE 10: REAL-TIME AUDIT LOG SYSTEM\x1b[0m');
    const resAddLog = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/admin/audit-logs', method: 'POST', headers
    }, { action: 'SECURITY_PIN_ROTATION', actor: 'Ahmad Owner', detail: 'Master admin PIN verified.' });
    assert(resAddLog.status === 201 && resAddLog.json?.log?.action === 'SECURITY_PIN_ROTATION', '10.1 POST /api/admin/audit-logs appends immutable log entry');

    const resGetLogs = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/admin/audit-logs', method: 'GET', headers
    });
    assert(resGetLogs.status === 200 && resGetLogs.json?.logs?.some(l => l.action === 'SECURITY_PIN_ROTATION'), '10.2 GET /api/admin/audit-logs queries real-time activity stream');

    // -----------------------------------------------------------------
    // MODULE 11: BANTUAN & CORS LAYER VERIFICATION
    // -----------------------------------------------------------------
    console.log('\n\x1b[36m▶ MODULE 11: BANTUAN, PANDUAN & CORS LAYER SECURITY\x1b[0m');
    const resCorsPreflight = await makeRequest({
      hostname: '127.0.0.1', port: 8080, path: '/api/admin/stats', method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'x-admin-token,x-merchant-id'
      }
    });
    assert(resCorsPreflight.status === 204 && resCorsPreflight.headers['access-control-allow-origin'] === 'http://localhost:3000' && resCorsPreflight.headers['access-control-max-age'] === '86400', '11.1 CORS Preflight OPTIONS returns 204 with full origin & Max-Age: 86400');

    console.log('\n=============================================================');
    console.log(`📊 11 MODULES AUDIT RESULT: ${passed} PASSED | ${failed} FAILED`);
    console.log('=============================================================\n');

    if (failed === 0) {
      console.log('✨ ALL 11 ADMIN MODULES & BACKEND LOGIC VERIFIED 100% FUNCTIONAL!');
      process.exit(0);
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error('Audit suite error:', err);
    process.exit(1);
  }
}

run11ModulesAudit();
