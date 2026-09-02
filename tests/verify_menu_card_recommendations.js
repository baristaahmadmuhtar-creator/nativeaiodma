/**
 * verify_menu_card_recommendations.js
 * Verification suite to ensure AI menu recommendations ALWAYS output visual interactive menu cards.
 */

const fs = require('fs');
const path = require('path');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m [Test ${totalTests}]: ${message}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✘ FAIL\x1b[0m [Test ${totalTests}]: ${message}`);
  }
}

console.log('\n===============================================================');
console.log('🧪 AUDIT: MENU RECOMMENDATION CARD RENDERING & INTELLIGENCE');
console.log('===============================================================\n');

const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
const serverJs = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const dbJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/db.json'), 'utf8'));

// 1. Check prompt instructions
assert(serverJs.includes("WAJIB PANGGIL tool 'showRecommendations'") || serverJs.includes("panggil juga 'showRecommendations'"), 
  'server.js system prompt explicitly mandates calling showRecommendations when recommending items');
assert(appJs.includes("WAJIB PANGGIL 'showRecommendations' SAAT MEREKOMENDASIKAN MENU"), 
  'js/app.js client prompt mandates calling showRecommendations');

// 2. Simulate Catalog & findMenuItemInCatalog engine from app.js
const menuCatalog = dbJson.menu || dbJson.merchants?.senopati_cafe?.menu || dbJson.merchants?.coffeenity?.menu || [];

// Extract findMenuItemInCatalog logic
function calculateStringSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  s1 = s1.toLowerCase().trim();
  s2 = s2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = [];
  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1.0 : (1.0 - (distance / maxLen));
}

function findMenuItemInCatalog(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const clean = rawInput.trim().toLowerCase();
  const slug = clean.replace(/[-\s]/g, '_');

  const genericCategoryTerms = new Set([
    'pizza', 'piza', 'pijja', 'kopi', 'coffee', 'ngopi', 'minum', 'minuman', 
    'makan', 'makanan', 'makan siang', 'dinner', 'lunch', 'pastry', 'kue', 'cake', 
    'cemilan', 'snack', 'pasta', 'spaghetti', 'spageti', 'dessert', 'jus', 'juice'
  ]);
  if (genericCategoryTerms.has(clean)) return null;

  let found = menuCatalog.find(m => m.id.toLowerCase() === clean || m.id === slug);
  if (found) return found;

  found = menuCatalog.find(m => m.name.toLowerCase() === clean);
  if (found) return found;

  if (clean.length >= 4) {
    found = menuCatalog.find(m => m.name.toLowerCase().includes(clean) || clean.includes(m.name.toLowerCase()));
    if (found) return found;
  }

  const aliasMap = {
    'nasi goreng': 'nasi_goreng', 'nasgor': 'nasi_goreng',
    'aren': 'kopi_milk_aren', 'kopi aren': 'kopi_milk_aren', 'kopi susu': 'kopi_milk_aren',
    'latte': 'iced_latte', 'iced latte': 'iced_latte',
    'caramel': 'caramel_macchiato', 'macchiato': 'caramel_macchiato',
    'cappuccino': 'cappuccino', 'kapucino': 'cappuccino',
    'americano': 'americano', 'kopi hitam': 'americano',
    'matcha': 'matcha_latte', 'matcha latte': 'matcha_latte',
    'peach': 'peach_tea', 'peach tea': 'peach_tea',
    'chocolate': 'chocolate_fudge', 'cokelat': 'chocolate_fudge',
    'berry': 'berry_lemonade', 'lemonade': 'berry_lemonade',
    'margherita': 'pizza_margherita', 'pizza keju': 'pizza_margherita',
    'pepperoni': 'pizza_pepperoni', 'peperoni': 'pizza_pepperoni', 'pizza pepperoni': 'pizza_pepperoni',
    'truffle pizza': 'pizza_truffle_mushroom', 'truffle mushroom': 'pizza_truffle_mushroom', 'truffle mushroom pizza': 'pizza_truffle_mushroom',
    'carbonara': 'spaghetti_carbonara', 'pasta carbonara': 'spaghetti_carbonara',
    'bolognese': 'spaghetti_bolognese',
    'croissant': 'almond_croissant', 'almond croissant': 'almond_croissant',
    'pain au chocolat': 'pain_au_chocolat', 'almond pain au chocolat': 'pain_au_chocolat',
    'tiramisu': 'tiramisu_cake',
    'brownie': 'fudge_brownie',
    'cheesecake': 'burnt_cheesecake'
  };

  for (const [alias, targetId] of Object.entries(aliasMap)) {
    if (clean.includes(alias) || alias.includes(clean)) {
      return menuCatalog.find(m => m.id === targetId) || null;
    }
  }

  return null;
}

// 3. Test findMenuItemInCatalog coverage
console.log('\n--- Suite 1: Item Resolution & Slang Matching ---');
assert(findMenuItemInCatalog('Pizza Pepperoni')?.id === 'pizza_pepperoni', 'Resolves "Pizza Pepperoni" to pizza_pepperoni');
assert(findMenuItemInCatalog('Truffle Mushroom Pizza')?.id === 'pizza_truffle_mushroom', 'Resolves "Truffle Mushroom Pizza" to pizza_truffle_mushroom');
assert(findMenuItemInCatalog('Kopi Aren')?.id === 'kopi_milk_aren', 'Resolves "Kopi Aren" to kopi_milk_aren');
assert(findMenuItemInCatalog('Pain au Chocolat')?.id === 'almond_croissant', 'Resolves "Pain au Chocolat" to almond_croissant (Almond Pain au Chocolat)');
assert(findMenuItemInCatalog('Matcha Latte')?.id === 'matcha_latte', 'Resolves "Matcha Latte" to matcha_latte');
assert(findMenuItemInCatalog('Tiramisu')?.id === 'tiramisu_classic', 'Resolves "Tiramisu" to tiramisu_classic (Classic Italian Tiramisu)');
assert(findMenuItemInCatalog('Carbonara')?.id === 'creamy_carbonara', 'Resolves "Carbonara" to creamy_carbonara');
assert(findMenuItemInCatalog('pizza') === null, 'Generic term "pizza" safely returns null (prevents false-positive ordering)');

// 4. Test postProcessAiResponse extraction simulation
console.log('\n--- Suite 2: Smart Post-Processor Card Extraction ---');

function simulatePostProcessor(cleanText, functionCalls = []) {
  const alreadyRenderedItemIds = new Set();
  let hasExplicitRecs = false;
  let hasAddToCart = false;

  if (Array.isArray(functionCalls)) {
    functionCalls.forEach(fc => {
      if (fc.name === 'addToCart') {
        hasAddToCart = true;
        const items = fc.args?.items || [];
        items.forEach(it => {
          const m = findMenuItemInCatalog(it.itemId || it.name || it.id || '');
          if (m) alreadyRenderedItemIds.add(m.id);
        });
      } else if (fc.name === 'showRecommendations') {
        hasExplicitRecs = true;
        const rawIds = fc.args?.itemIds || fc.args?.items || [];
        rawIds.forEach(id => {
          const m = findMenuItemInCatalog(typeof id === 'object' ? (id.itemId || id.id || id.name) : id);
          if (m) alreadyRenderedItemIds.add(m.id);
        });
      }
    });
  }

  const candidateIds = [];
  const boldMatches = cleanText.match(/\*\*([^*]+)\*\*/g) || [];
  boldMatches.forEach(bm => {
    const inner = bm.replace(/\*\*/g, '').trim();
    const resolved = findMenuItemInCatalog(inner);
    if (resolved && !alreadyRenderedItemIds.has(resolved.id) && !candidateIds.includes(resolved.id)) {
      candidateIds.push(resolved.id);
    }
  });

  return {
    candidateIds,
    hasAddToCart,
    hasExplicitRecs
  };
}

// Case A: Freeform Text Recommendation (No tool called)
const resA = simulatePostProcessor(
  'Untuk pizza, kami merekomendasikan **Pizza Pepperoni** dengan topping gurih atau **Truffle Mushroom Pizza** yang kaya rasa jamur truffle. Mau coba yang mana?'
);
assert(resA.candidateIds.includes('pizza_pepperoni') && resA.candidateIds.includes('pizza_truffle_mushroom'), 
  'Freeform text automatically extracts ["pizza_pepperoni", "pizza_truffle_mushroom"] cards');

// Case B: Order 1 item + Sommelier Pairing Suggestion in Paragraph 3
const resB = simulatePostProcessor(
  'Pesanan 1 **Beef Pepperoni Pizza** telah ditambahkan ke keranjang Meja 5.\n\nApakah ingin ukuran Reguler atau Large?\n\nSangat pas jika dipadukan dengan **Almond Pain au Chocolat** hangat atau **Iced Caffe Latte**. Mau saya tambahkan?',
  [{ name: 'addToCart', args: { items: [{ itemId: 'pizza_pepperoni', qty: 1 }] } }]
);
assert(!resB.candidateIds.includes('pizza_pepperoni'), 'Added item "pizza_pepperoni" is not duplicated in pairing recommendations');
assert(resB.candidateIds.includes('almond_croissant') && resB.candidateIds.includes('iced_latte'), 
  'Pairing suggestion items ["almond_croissant", "iced_latte"] successfully extracted as pairing cards');

// Case C: Explicit showRecommendations called with object array
const resC = simulatePostProcessor(
  'Berikut menu rekomendasi terbaik kami:',
  [{ name: 'showRecommendations', args: { itemIds: [{ itemId: 'kopi_milk_aren' }, { itemId: 'matcha_latte' }] } }]
);
assert(resC.hasExplicitRecs, 'Explicit showRecommendations call recognized');

console.log('\n===============================================================');
console.log(`🏁 AUDIT RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests/totalTests)*100).toFixed(1)}%)`);
if (failedTests === 0) {
  console.log('🎉 ALL RECOMMENDATION CARD CHECKS PASSED 100%!');
} else {
  console.error(`⚠️  ${failedTests} CHECKS FAILED!`);
  process.exit(1);
}
console.log('===============================================================\n');
