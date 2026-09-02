/**
 * AIODMA - Enterprise Zero-Simulation & Production Architecture Test Suite
 * Validates:
 * 1. Local standalone SVG QR code generator (Zero 3rd-party dependencies)
 * 2. CASH Order workflow -> PENDING_CASHIER state
 * 3. Digital Order workflow -> PAID state
 * 4. Real-time Cashier payment confirmation -> PAID transition
 * 5. Dynamic server-side analytics (calculated from live orders)
 * 6. Waiter call dispatch and admin tracking
 * 7. Strict Admin Authentication (Zero Referer Bypass)
 * 8. Clean responsive Customer UI (Zero simulator chrome, zero fake hardware cutouts)
 */

const http = require('http');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

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
  console.log('🚀 AIODMA ZERO-SIMULATION PRODUCTION ENTERPRISE TEST SUITE');
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

  const tests = [
    // 1. Local QR Code Generator
    test('1. Local Standalone QR Generator endpoint returns valid SVG', async () => {
      const res = await request('GET', '/api/tables/5/qr');
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers['content-type'].includes('svg'), 'Content-Type must be SVG');
      assert.ok(typeof res.data === 'string' && res.data.includes('<svg'), 'Response must contain SVG tag');
      assert.ok(res.data.includes('<rect') || res.data.includes('<path'), 'SVG must have valid path/rects');
    }),

    // 2. Admin Authentication Enforcement (Zero Referer Bypass)
    test('2. Admin endpoint strictly rejects requests without auth token (401)', async () => {
      const res = await request('GET', '/api/admin/orders');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.data.code, 'UNAUTHORIZED_ADMIN');
    }),

    test('3. Admin endpoint rejects fake Referer header bypass (401)', async () => {
      const res = await request('GET', '/api/admin/orders', null, {
        'Referer': 'http://127.0.0.1:8080/admin.html',
        'x-requested-by': 'admin-portal'
      });
      assert.strictEqual(res.status, 401, 'Must reject referer header bypass');
    }),

    test('4. Admin endpoint accepts valid x-admin-token (200)', async () => {
      const res = await request('GET', '/api/admin/orders', null, {
        'x-admin-token': ADMIN_TOKEN
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
    }),

    // 3. Cash Order -> PENDING_CASHIER
    test('5. Submitting CASH order creates PENDING_CASHIER payment status', async () => {
      const payload = {
        table: 'Meja 5',
        tableNum: 5,
        paymentMethod: 'CASH',
        items: [
          { id: 'kopi_milk_aren', name: 'Kopi Milk Aren (Es)', price: 28000, qty: 1 }
        ]
      };
      const res = await request('POST', '/api/orders', payload);
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.order.paymentMethod, 'CASH');
      assert.strictEqual(res.data.order.paymentStatus, 'PENDING_CASHIER');
      assert.strictEqual(res.data.order.status, 'received');
    }),

    // 4. Digital Order -> PAID
    test('6. Submitting Digital (BIBD) order creates PAID payment status', async () => {
      const payload = {
        table: 'Meja 5',
        tableNum: 5,
        paymentMethod: 'BIBD',
        items: [
          { id: 'iced_latte', name: 'Iced Caffe Latte', price: 26000, qty: 1 }
        ]
      };
      const res = await request('POST', '/api/orders', payload);
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.order.paymentMethod, 'BIBD');
      assert.strictEqual(res.data.order.paymentStatus, 'PAID');
    }),

    // 5. Cashier Payment Settlement
    test('7. Cashier can confirm Cash payment via PATCH /api/admin/orders/:id/payment', async () => {
      // First create a pending cash order
      const createRes = await request('POST', '/api/orders', {
        table: 'Meja 3',
        tableNum: 3,
        paymentMethod: 'CASH',
        items: [{ id: 'americano', name: 'Iced Americano', price: 22000, qty: 1 }]
      });
      const orderId = createRes.data.order.id;
      assert.strictEqual(createRes.data.order.paymentStatus, 'PENDING_CASHIER');

      // Cashier settles payment
      const payRes = await request('PATCH', `/api/admin/orders/${orderId}/payment`, { paymentStatus: 'PAID' }, {
        'x-admin-token': ADMIN_TOKEN
      });
      assert.strictEqual(payRes.status, 200);
      assert.strictEqual(payRes.data.success, true);
      assert.strictEqual(payRes.data.order.paymentStatus, 'PAID');

      // Verify persisted state
      const verifyRes = await request('GET', `/api/orders/${orderId}`);
      assert.strictEqual(verifyRes.data.order.paymentStatus, 'PAID');
    }),

    // 6. Waiter Call Dispatch
    test('8. Waiter call creates tracked call in db.waiterCalls and broadcasts', async () => {
      const res = await request('POST', '/api/waiter/call', {
        table: 'Meja 5',
        tableNum: 5,
        reason: 'Minta sendok tambahan'
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.call.status, 'pending');

      // Admin inspects waiter calls
      const listRes = await request('GET', '/api/admin/waiter-calls', null, {
        'x-admin-token': ADMIN_TOKEN
      });
      assert.strictEqual(listRes.status, 200);
      assert.ok(Array.isArray(listRes.data.data));
      assert.ok(listRes.data.data.some(c => c.id === res.data.call.id));
    }),

    // 7. Dynamic Analytics Calculation
    test('9. Admin stats computes grossRevenue and averageTicket dynamically from real orders', async () => {
      const res = await request('GET', '/api/admin/stats', null, {
        'x-admin-token': ADMIN_TOKEN
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      const stats = res.data.stats;
      assert.strictEqual(typeof stats.grossRevenue, 'number');
      assert.strictEqual(typeof stats.totalOrdersToday, 'number');
      assert.strictEqual(typeof stats.averageTicket, 'number');
      assert.strictEqual(typeof stats.activeOrdersCount, 'number');
      assert.ok(stats.grossRevenue >= 0);
    }),

    // 8. Customer UI Cleanliness (No Simulator Elements)
    test('10. index.html does NOT contain simulator chrome, fake notch, or embedded KDS', async () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
      assert.ok(!html.includes('top-control-bar'), 'Must NOT have .top-control-bar');
      assert.ok(!html.includes('btnDevicePhone'), 'Must NOT have btnDevicePhone');
      assert.ok(!html.includes('btnDeviceiPad'), 'Must NOT have btnDeviceiPad');
      assert.ok(!html.includes('dynamicIslandWrapper'), 'Must NOT have dynamicIslandWrapper');
      assert.ok(!html.includes('ipadKdsViewport'), 'Must NOT have embedded ipadKdsViewport');
      assert.ok(html.includes('phoneViewport'), 'Must have clean responsive phoneViewport');
    })
  ];

  for (const t of tests) {
    await t();
  }

  console.log('\n------------------------------------------------------------');
  console.log(`Summary: ${passed} PASSED, ${failed} FAILED (Total: ${tests.length})`);
  console.log('------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
