const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
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

async function runTests() {
  console.log('\n=============================================================');
  console.log('🧪 VERIFICATION: ZERO-HALLUCINATION MENU, MODIFIERS & ADMIN');
  console.log('Target: http://127.0.0.1:8080');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✔ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Menu Catalog & Structured Customizations Verification
    const menuRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 8080,
      path: '/api/menu',
      method: 'GET'
    });

    assert(menuRes.status === 200 && Array.isArray(menuRes.body.data), 'GET /api/menu returns HTTP 200 with menu array');
    const menuItems = menuRes.body.data || [];
    assert(menuItems.length === 36, `Menu contains exactly 36 curated items (found: ${menuItems.length})`);
    
    const allHaveCustomizations = menuItems.every(m => m.customizations && typeof m.customizations === 'object');
    assert(allHaveCustomizations, 'All 36 menu items have official structured customizations');

    const kopiAren = menuItems.find(m => m.id === 'kopi_milk_aren');
    assert(kopiAren && kopiAren.customizations.addons.some(a => a.name === 'Oat Milk' && a.price === 6000), 'Kopi Milk Aren has Oat Milk (+Rp 6.000) option');

    // 2. Order Submission & Addon Price Recalculation Guardrails
    const orderWithAddons = {
      table: 'Meja 5',
      tableNum: 5,
      items: [
        {
          id: 'kopi_milk_aren',
          name: 'Kopi Milk Aren (Es)',
          qty: 1,
          subtext: 'Less Sugar 50%, Ganti Oat Milk, Extra Shot'
        },
        {
          id: 'pizza_margherita',
          name: 'Pizza Margherita Classic',
          qty: 1,
          subtext: 'Stuffed Cheese Crust, Ekstra Mozzarella'
        }
      ],
      paymentMethod: 'BIBD'
    };

    const orderRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 8080,
      path: '/api/orders',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, orderWithAddons);

    assert(orderRes.status === 201 && orderRes.body.success, 'POST /api/orders successfully created order with modifiers');
    const created = orderRes.body.order;
    
    // Calculation:
    // Item 1: Kopi Aren (28,000) + Oat Milk (6,000) + Extra Shot (4,000) = 38,000
    // Item 2: Pizza Margherita (58,000) + Stuffed Cheese (15,000) + Extra Mozzarella (10,000) = 83,000
    // Subtotal: 38,000 + 83,000 = 121,000
    // Tax 10%: 12,100
    // Total: 133,100
    assert(created.subtotal === 121000, `Server accurately recalculated Subtotal with addons: Rp ${created.subtotal} (Expected: 121000)`);
    assert(created.tax === 12100, `Server accurately recalculated Tax PB1: Rp ${created.tax} (Expected: 12100)`);
    assert(created.total === 133100, `Server accurately recalculated Grand Total: Rp ${created.total} (Expected: 133100)`);
    assert(created.items[0].subtext === 'Less Sugar 50%, Ganti Oat Milk, Extra Shot', 'Item modifier notes preserved in KDS order entity');

    // 3. Admin Authentication & Menu CRUD Management
    const loginRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 8080,
      path: '/api/admin/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { pin: '8888' });

    assert(loginRes.status === 200 && loginRes.body.token, 'Admin authenticated with PIN 8888');
    const adminToken = loginRes.body.token;

    // GET /api/admin/menu
    const adminMenuRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 8080,
      path: '/api/admin/menu',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(adminMenuRes.status === 200 && adminMenuRes.body.count >= 36, 'Admin GET /api/admin/menu returns full catalog with details');

    // PUT /api/admin/menu/:id (Edit price/desc)
    const updateItemRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 8080,
      path: '/api/admin/menu/kopi_milk_aren',
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, {
      desc: 'Espresso bold, fresh milk creamy, dan lelehan gula aren asli nusantara terbaik.'
    });
    assert(updateItemRes.status === 200 && updateItemRes.body.item.desc.includes('terbaik'), 'Admin successfully updated menu item description');

    // POST /api/admin/menu (Create new item)
    const testItemId = 'test_seasonal_matcha_' + Date.now();
    const createItemRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 8080,
      path: '/api/admin/menu',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, {
      id: testItemId,
      name: 'Artisan Uji Matcha Latte',
      category: 'non-kopi',
      price: 32000,
      desc: 'Matcha Uji Kyoto autentik dengan steamed milk lembut.',
      available: true
    });
    assert(createItemRes.status === 201 && createItemRes.body.item.id === testItemId, 'Admin successfully added new seasonal menu item');

    // DELETE /api/admin/menu/:id (Cleanup test item)
    const deleteItemRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 8080,
      path: `/api/admin/menu/${testItemId}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(deleteItemRes.status === 200 && deleteItemRes.body.success, 'Admin successfully deleted test menu item');

    // 4. Toggle 86 Stock Instant Sync
    const toggle86Res = await makeRequest({
      hostname: '127.0.0.1',
      port: 8080,
      path: '/api/admin/menu/iced_latte/toggle-stock',
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, { available: false });
    assert(toggle86Res.status === 200 && toggle86Res.body.item.available === false, 'Admin marked Iced Caffe Latte as 86 (Out of Stock)');

    // Restore to true
    await makeRequest({
      hostname: '127.0.0.1',
      port: 8080,
      path: '/api/admin/menu/iced_latte/toggle-stock',
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, { available: true });

    console.log('\n=============================================================');
    console.log(`📊 TEST SUMMARY: Total: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('=============================================================\n');

    if (failed === 0) {
      console.log('✨ ZERO-HALLUCINATION & ADMIN MANAGEMENT VERIFIED 100% WORKING!\n');
      process.exit(0);
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error('Fatal Test Error:', err);
    process.exit(1);
  }
}

runTests();
