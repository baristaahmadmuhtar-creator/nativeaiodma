/**
 * AIODMA — Master End-to-End QA/QE Automated Test Suite Runner
 * Executes all 12 specialized test suites in sequence and aggregates results.
 */

const { execSync } = require('child_process');
const path = require('path');

const testSuites = [
  { name: '1. E2E QE Deep Audit (Security, CORS, APIs, SSE)', file: 'e2e_qe_audit.js' },
  { name: '2. Zero Simulation & Production Purity', file: 'verify_zero_simulation_production.js' },
  { name: '3. Multi-Tenant B2B SaaS (Coffeenity & Senopati)', file: 'verify_multi_tenant_coffeenity.js' },
  { name: '4. Real-World E2E Simulation & Stress', file: 'simulation_e2e_deep.js' },
  { name: '5. All 11 Admin Modules & KDS Lifecycle', file: 'verify_all_11_admin_modules.js' },
  { name: '6. Menu Modifiers & Stock 86 Management', file: 'verify_menu_modifiers_admin.js' },
  { name: '7. AI Sommelier Intelligence & WCAG 2.2 a11y', file: 'verify_ai_sommelier_and_a11y.js' },
  { name: '8. Interactive Menu Card Recommendations', file: 'verify_menu_card_recommendations.js' },
  { name: '9. Apple HIG Dark Mode & Liquid Glass Refinement', file: 'verify_apple_dark_mode.js' },
  { name: '10. User Experience & Stepper Ergonomics', file: 'test_user_experience_flow.js' },
  { name: '11. Enterprise Hybrid RAG Engine, CORS & Admin Operations', file: 'verify_enterprise_rag_and_cors.js' },
  { name: '12. Frontend Logic, All-Screen CORS Resilience & Customer Memory', file: 'verify_frontend_logic_cors_and_memory.js' }
];

console.log('\n======================================================================');
console.log('🌟 AIODMA PRODUCTION END-TO-END MASTER QUALITY SUITE');
console.log('======================================================================\n');

let totalSuites = testSuites.length;
let passedSuites = 0;
let failedSuites = 0;
const failures = [];

const startTime = Date.now();

for (const suite of testSuites) {
  const suiteStart = Date.now();
  process.stdout.write(`⏳ Running [${suite.name}] ... `);
  try {
    const fullPath = path.join(__dirname, suite.file);
    execSync(`node "${fullPath}"`, {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30000
    });
    const duration = ((Date.now() - suiteStart) / 1000).toFixed(2);
    console.log(`\x1b[32m✔ PASSED\x1b[0m (${duration}s)`);
    passedSuites++;
  } catch (err) {
    const duration = ((Date.now() - suiteStart) / 1000).toFixed(2);
    console.log(`\x1b[31m✖ FAILED\x1b[0m (${duration}s)`);
    failedSuites++;
    const output = (err.stdout ? err.stdout.toString() : '') + (err.stderr ? err.stderr.toString() : '');
    failures.push({ suite: suite.name, file: suite.file, output });
  }
}

const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('\n======================================================================');
console.log(`📊 MASTER TEST RESULTS: ${passedSuites}/${totalSuites} SUITES PASSED (${totalDuration}s)`);
console.log('======================================================================\n');

if (failedSuites > 0) {
  console.error(`\x1b[31m❌ ${failedSuites} test suite(s) failed!\x1b[0m\n`);
  failures.forEach(f => {
    console.error(`--- Failure in ${f.suite} (${f.file}) ---`);
    console.error(f.output.slice(-800));
    console.error('-----------------------------------------------------\n');
  });
  process.exit(1);
} else {
  console.log('\x1b[32m✨ 100% OF ALL PRODUCTION END-TO-END SUITES PASSED PERFECTLY!\x1b[0m\n');
  process.exit(0);
}
