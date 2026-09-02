/**
 * AIODMA — Enterprise Hybrid RAG Engine, Hardened Multi-Origin CORS & AI Intelligence Test Suite
 * Validates BM25+TF-IDF Retrieval, RAG Chat Grounding, Admin RAG CRUD, CORS Preflight, and Promo Validation.
 */

const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:8080';
const ADMIN_TOKEN = 'aiodma2026';

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(options.url || options.path, BASE_URL);
    const reqOptions = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });

    req.on('error', reject);

    if (postData) {
      if (typeof postData === 'object' && !(postData instanceof Buffer)) {
        req.write(JSON.stringify(postData));
      } else {
        req.write(postData);
      }
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Enterprise RAG Engine, Hardened CORS & AI Intelligence Test Suite...\n');
  let testsPassed = 0;

  // =========================================================================
  // TEST 1: Hybrid RAG BM25 Retrieval via Admin Test Query Endpoint
  // =========================================================================
  console.log('[Test 1] Hybrid BM25+TF-IDF Semantic Retrieval Accuracy');
  {
    // 1a. Coffeenity Pizza Dough Query
    const res1 = await request({
      url: '/api/admin/rag/test-query?merchant=coffeenity',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': ADMIN_TOKEN
      }
    }, { query: 'adonan pizza fermentasi oven kayu api', maxK: 3 });

    assert.strictEqual(res1.statusCode, 200, 'Test query status should be 200');
    assert.strictEqual(res1.json.success, true);
    assert(res1.json.results.length >= 1, 'Should return at least 1 matched chunk');
    const top1 = res1.json.results[0];
    assert.strictEqual(top1.id, 'rag_coff_01', 'Top match must be rag_coff_01');
    assert(top1.score > 2.0, `Score should be significant, got ${top1.score}`);
    assert(top1.snippet.includes('48 jam') || top1.snippet.includes('450°C'), 'Snippet should contain factual terms');
    console.log(`  ✔ Pizza dough query top match: "${top1.title}" (Score: ${top1.score})`);

    // 1b. Coffeenity Single Origin & Roasting Query
    const res2 = await request({
      url: '/api/admin/rag/test-query?merchant=coffeenity',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': ADMIN_TOKEN
      }
    }, { query: 'biji kopi ethiopia columbia manual brew v60', maxK: 3 });

    assert.strictEqual(res2.statusCode, 200);
    assert(res2.json.results.length >= 1);
    const top2 = res2.json.results[0];
    assert.strictEqual(top2.id, 'rag_coff_02', 'Top match must be rag_coff_02');
    console.log(`  ✔ Coffee bean query top match: "${top2.title}" (Score: ${top2.score})`);

    // 1c. Facilities & Wi-Fi Query
    const res3 = await request({
      url: '/api/admin/rag/test-query?merchant=coffeenity',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': ADMIN_TOKEN
      }
    }, { query: 'wifi stopkontak musholla parkir', maxK: 3 });

    assert.strictEqual(res3.statusCode, 200);
    assert(res3.json.results.length >= 1);
    const top3 = res3.json.results[0];
    assert.strictEqual(top3.id, 'rag_coff_05', 'Top match must be rag_coff_05');
    console.log(`  ✔ Facilities query top match: "${top3.title}" (Score: ${top3.score})`);

    // 1d. Low Relevance / Out-of-Domain Filtering
    const res4 = await request({
      url: '/api/admin/rag/test-query?merchant=coffeenity',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': ADMIN_TOKEN
      }
    }, { query: 'astronomi galaksi supernova teleskop nebula', maxK: 3 });

    assert.strictEqual(res4.statusCode, 200);
    assert.strictEqual(res4.json.results.length, 0, 'Out-of-domain query should return 0 results due to threshold');
    console.log('  ✔ Irrelevant query correctly returned 0 chunks (Threshold filter active)');

    testsPassed++;
  }

  // =========================================================================
  // TEST 2: AI Sommelier Chat RAG Context Injection & Factual Precision
  // =========================================================================
  console.log('\n[Test 2] AI Sommelier Chat RAG Ground-Truth Context Grounding');
  {
    const resChat = await request({
      url: '/api/ai/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-merchant-id': 'coffeenity'
      }
    }, {
      merchantId: 'coffeenity',
      message: 'Adonan pizza kalian dibuat dari apa dan dipanggang di oven apa?',
      table: 'Meja 3'
    });

    assert.strictEqual(resChat.statusCode, 200, 'Chat status should be 200');
    assert.strictEqual(resChat.json.success, true);
    assert(Array.isArray(resChat.json.ragChunks), 'Response must include ragChunks metadata');
    assert(resChat.json.ragChunks.length >= 1, 'ragChunks must contain matched documents');
    assert.strictEqual(resChat.json.ragChunks[0].id, 'rag_coff_01');

    const reply = resChat.json.text;
    assert(
      reply.includes('48 jam') ||
      reply.includes('cold-fermentation') ||
      reply.includes('450°C') ||
      reply.includes('biga'),
      'AI response must contain grounded facts from RAG chunk'
    );
    console.log(`  ✔ AI Chat grounded response verified with ${resChat.json.ragChunks.length} RAG chunk(s) injected.`);
    testsPassed++;
  }

  // =========================================================================
  // TEST 3: Admin RAG Document CRUD Lifecycle
  // =========================================================================
  console.log('\n[Test 3] Admin RAG Knowledge Base CRUD Lifecycle');
  {
    // 3a. Get Documents
    const resGet = await request({
      url: '/api/admin/rag/documents?merchant=coffeenity',
      headers: { 'x-admin-token': ADMIN_TOKEN }
    });
    assert.strictEqual(resGet.statusCode, 200);
    assert(Array.isArray(resGet.json.documents));
    const initialCount = resGet.json.documents.length;
    console.log(`  ✔ Initial RAG documents count: ${initialCount}`);

    // 3b. Create New Document
    const resCreate = await request({
      url: '/api/admin/rag/documents?merchant=coffeenity',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': ADMIN_TOKEN
      }
    }, {
      title: 'Matcha Uji Grade Ceremonial Kyoto',
      category: 'culinary_craft',
      tags: 'matcha, ceremonial, uji, kyoto, jepang, latte',
      content: 'Coffeenity mendatangkan 100% ceremonial grade matcha langsung dari perkebunan Uji, Kyoto. Digiling dengan batu granit tradisional untuk mempertahankan aroma umami segar dan pigmen klorofil alami.'
    });

    assert.strictEqual(resCreate.statusCode, 201);
    assert.strictEqual(resCreate.json.success, true);
    const newDocId = resCreate.json.document.id;
    assert(newDocId.startsWith('rag_'));
    console.log(`  ✔ Created new RAG document: ${newDocId}`);

    // 3c. Verify New Document Is Queryable via RAG
    const resSearchNew = await request({
      url: '/api/admin/rag/test-query?merchant=coffeenity',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': ADMIN_TOKEN
      }
    }, { query: 'matcha uji kyoto ceremonial umami', maxK: 1 });

    assert.strictEqual(resSearchNew.statusCode, 200);
    assert(resSearchNew.json.results.length >= 1);
    assert.strictEqual(resSearchNew.json.results[0].id, newDocId);
    console.log(`  ✔ New RAG document instantly searchable via BM25 (Score: ${resSearchNew.json.results[0].score})`);

    // 3d. Update Document
    const resUpdate = await request({
      url: `/api/admin/rag/documents/${newDocId}?merchant=coffeenity`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': ADMIN_TOKEN
      }
    }, {
      title: 'Matcha Uji Grade Ceremonial Kyoto (Updated)',
      tags: ['matcha', 'ceremonial', 'kyoto', 'artisan']
    });

    assert.strictEqual(resUpdate.statusCode, 200);
    assert.strictEqual(resUpdate.json.document.title, 'Matcha Uji Grade Ceremonial Kyoto (Updated)');
    console.log('  ✔ RAG document successfully updated');

    // 3e. Delete Document
    const resDelete = await request({
      url: `/api/admin/rag/documents/${newDocId}?merchant=coffeenity`,
      method: 'DELETE',
      headers: { 'x-admin-token': ADMIN_TOKEN }
    });

    assert.strictEqual(resDelete.statusCode, 200);
    assert.strictEqual(resDelete.json.success, true);
    console.log('  ✔ RAG document successfully deleted and removed from index');

    testsPassed++;
  }

  // =========================================================================
  // TEST 4: Hardened Dynamic Multi-Origin CORS Architecture
  // =========================================================================
  console.log('\n[Test 4] Hardened Dynamic Multi-Origin CORS Architecture');
  {
    // 4a. Allowed Origin Preflight OPTIONS with Credentials & Max-Age
    const resOpt = await request({
      url: '/api/ai/chat',
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://thecoffeenityyard.bn',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, x-merchant-id'
      }
    });

    assert.strictEqual(resOpt.statusCode, 204, 'Preflight OPTIONS must return 204 No Content');
    assert.strictEqual(resOpt.headers['access-control-allow-origin'], 'https://thecoffeenityyard.bn');
    assert.strictEqual(resOpt.headers['access-control-allow-credentials'], 'true');
    assert.strictEqual(resOpt.headers['access-control-max-age'], '86400');
    console.log('  ✔ Preflight OPTIONS cached for 24 hours (86400s) with credentials enabled');

    // 4b. Allowed Private LAN Origin
    const resLan = await request({
      url: '/api/merchants',
      method: 'GET',
      headers: {
        'Origin': 'http://192.168.1.150:8080'
      }
    });
    assert.strictEqual(resLan.statusCode, 200);
    assert.strictEqual(resLan.headers['access-control-allow-origin'], 'http://192.168.1.150:8080');
    console.log('  ✔ Private LAN origin (RFC 1918) dynamically whitelisted');

    // 4c. Mobile App WebView Origin
    const resCap = await request({
      url: '/api/merchants',
      method: 'GET',
      headers: {
        'Origin': 'capacitor://localhost'
      }
    });
    assert.strictEqual(resCap.statusCode, 200);
    assert.strictEqual(resCap.headers['access-control-allow-origin'], 'capacitor://localhost');
    console.log('  ✔ Mobile WebView origin (capacitor://) allowed');

    // 4d. Disallowed Rogue Origin
    const resRogue = await request({
      url: '/api/merchants',
      method: 'GET',
      headers: {
        'Origin': 'https://evil-unauthorized-tracker.com'
      }
    });
    assert.strictEqual(resRogue.statusCode, 200);
    assert.strictEqual(
      resRogue.headers['access-control-allow-origin'],
      undefined,
      'Rogue origin must NOT receive Access-Control-Allow-Origin header'
    );
    console.log('  ✔ Rogue origin correctly blocked from CORS access');

    // 4e. Admin CORS CRUD Endpoints
    const resAddCors = await request({
      url: '/api/admin/cors',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': ADMIN_TOKEN
      }
    }, { origin: 'https://staging.outlet-partner.com' });

    assert.strictEqual(resAddCors.statusCode, 201);
    assert.strictEqual(resAddCors.json.success, true);
    console.log('  ✔ Admin successfully added custom origin to dynamic whitelist');

    // Test the newly added origin
    const resTestCors = await request({
      url: '/api/admin/cors/test',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': ADMIN_TOKEN
      }
    }, { origin: 'https://staging.outlet-partner.com' });

    assert.strictEqual(resTestCors.statusCode, 200);
    assert.strictEqual(resTestCors.json.isAllowed, true);
    console.log('  ✔ Dynamic test verification confirmed origin is allowed');

    // Delete custom origin
    const resDelCors = await request({
      url: `/api/admin/cors/${encodeURIComponent('https://staging.outlet-partner.com')}`,
      method: 'DELETE',
      headers: { 'x-admin-token': ADMIN_TOKEN }
    });

    assert.strictEqual(resDelCors.statusCode, 200);
    assert.strictEqual(resDelCors.json.success, true);
    console.log('  ✔ Custom origin successfully removed from whitelist');

    testsPassed++;
  }

  // =========================================================================
  // TEST 5: Client-Side Promo Code Validation Engine
  // =========================================================================
  console.log('\n[Test 5] Client-Side Promo Code Validation Engine');
  {
    // 5a. Valid Promo with Minimum Spend Satisfied
    const resValid = await request({
      url: '/api/promos/validate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-merchant-id': 'senopati_cafe'
      }
    }, {
      code: 'SENOPATIPAGI',
      subtotal: 75000,
      merchantId: 'senopati_cafe'
    });

    assert.strictEqual(resValid.statusCode, 200);
    assert.strictEqual(resValid.json.valid, true);
    assert.strictEqual(resValid.json.discount, 15000, '20% of 75000 is 15000');
    console.log(`  ✔ Valid promo applied: Discount ${resValid.json.discount} on subtotal 75000`);

    // 5b. Promo with Subtotal Below Minimum Spend
    const resBelowMin = await request({
      url: '/api/promos/validate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-merchant-id': 'senopati_cafe'
      }
    }, {
      code: 'SENOPATIPAGI',
      subtotal: 30000,
      merchantId: 'senopati_cafe'
    });

    assert.strictEqual(resBelowMin.statusCode, 400);
    assert.strictEqual(resBelowMin.json.valid, false);
    assert(resBelowMin.json.error.toLowerCase().includes('minimal') && resBelowMin.json.error.toLowerCase().includes('belanja'), 'Error should state minimum spend required');
    console.log('  ✔ Minimum spend requirement strictly enforced');

    // 5c. Invalid / Non-Existent Promo Code
    const resInvalid = await request({
      url: '/api/promos/validate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-merchant-id': 'senopati_cafe'
      }
    }, {
      code: 'KODE_NGASAL_123',
      subtotal: 100000,
      merchantId: 'senopati_cafe'
    });

    assert.strictEqual(resInvalid.statusCode, 404);
    assert.strictEqual(resInvalid.json.valid, false);
    console.log('  ✔ Non-existent promo code correctly rejected with 404');

    testsPassed++;
  }

  console.log(`\n======================================================================`);
  console.log(`🎉 ALL ${testsPassed}/5 ENTERPRISE RAG & CORS SUITE VERIFICATIONS PASSED!`);
  console.log(`======================================================================\n`);
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed with Error:');
  console.error(err);
  process.exit(1);
});
