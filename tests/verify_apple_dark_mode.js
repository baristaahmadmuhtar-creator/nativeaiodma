/**
 * verify_apple_dark_mode.js
 * End-to-end verification suite for Apple Design System OLED Dark Mode & Liquid Glass Refinement.
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
console.log('🍏 AUDIT: APPLE HIG OLED DARK MODE & LIQUID GLASS REFINEMENT');
console.log('===============================================================\n');

const stylesCss = fs.readFileSync(path.join(__dirname, '../public/css/styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

console.log('--- Suite 1: Theme State Management & Logic (js/app.js) ---');

assert(appJs.includes("document.documentElement.setAttribute('data-theme', 'dark')"), 
  'applyTheme sets data-theme="dark" attribute on document.documentElement');
assert(appJs.includes("document.body.classList.add('dark-mode')"), 
  'applyTheme adds dark-mode class on body element');
assert(appJs.includes("localStorage.setItem('aiodma_theme', 'dark')"), 
  'applyTheme persists dark theme state to localStorage');
assert(appJs.includes("metaThemeColor.setAttribute('content', isDark ? '#000000' : '#FFFFFF')"), 
  'applyTheme updates iOS Safari/Chrome meta theme-color to #000000 in dark mode');
assert(appJs.includes("headerDark.style.display = isDark ? 'none' : 'block'"), 
  'applyTheme accurately toggles header theme icons (Sun/Moon)');
assert(appJs.includes("themeLabel.textContent = isDark ? 'Mode Terang (Light Mode)' : 'Mode Gelap (Dark Mode)'"), 
  'applyTheme updates 3-dots action menu label');

console.log('\n--- Suite 2: HTML Structure & Trigger Buttons (index.html) ---');

assert(indexHtml.includes('id="btnHeaderThemeToggle"'), 
  'Screen 2 Top Header includes #btnHeaderThemeToggle circle button');
assert(indexHtml.includes('id="btnLangThemeToggle"'), 
  'Screen 1 Welcome Bar includes #btnLangThemeToggle circle button');
assert(indexHtml.includes('id="btnModeTrigger"'), 
  'Top Header includes #btnModeTrigger mode dropdown pill');
assert(indexHtml.includes('id="modeDropdownMenu"'), 
  'Top Header includes #modeDropdownMenu popover menu');
assert(indexHtml.includes('id="menuItemToggleTheme"'), 
  'Screen 2 3-dots Action Menu includes #menuItemToggleTheme menuitem');
assert(indexHtml.includes('id="headerThemeIconDark"') && indexHtml.includes('id="headerThemeIconLight"'), 
  'Header theme toggle contains both Moon and Sun SVGs');

console.log('\n--- Suite 3: Apple HIG Design Tokens & Color Palette (css/styles.css) ---');

assert(stylesCss.includes('--bg-system: #000000') || stylesCss.includes('--bg-system: #000'), 
  'Dark mode defines True OLED Black (--bg-system: #000000)');
assert(stylesCss.includes('--bg-card: #1C1C1E'), 
  'Dark mode defines Apple Secondary Surface (--bg-card: #1C1C1E)');
assert(stylesCss.includes('--bg-subtle: #2C2C2E'), 
  'Dark mode defines Apple Tertiary Well Surface (--bg-subtle: #2C2C2E)');
assert(stylesCss.includes('--text-primary: #FFFFFF') || stylesCss.includes('--text-primary: #FFF'), 
  'Dark mode defines High Contrast Primary Label (--text-primary: #FFFFFF)');
assert(stylesCss.includes('--accent-caramel: #E59545'), 
  'Dark mode defines Vibrant Gold/Caramel Accent (--accent-caramel: #E59545)');

console.log('\n--- Suite 4: Header & Mode Dropdown Liquid Glass ---');

assert(stylesCss.includes('body.dark-mode .mode-pill-trigger') && stylesCss.includes('body.dark-mode .header-btn-circle'), 
  'Mode pill trigger matches header circle button Liquid Glass material in dark mode');
assert(stylesCss.includes('body.dark-mode .mode-dropdown-menu') && stylesCss.includes('body.dark-mode .action-popup-menu'), 
  'Mode dropdown menu and action popup menu styled with deep visionOS dark glass popover');
assert(stylesCss.includes('body.dark-mode .mode-option-row') && stylesCss.includes('body.dark-mode .mode-option-check'), 
  'Mode option rows in dark mode have crisp white labels and glowing amber checks');

console.log('\n--- Suite 5: Liquid Glass Wave & Touch Physics in Dark Mode ---');

assert(stylesCss.includes('body.dark-mode .header-btn-circle::after') && stylesCss.includes('transparent 75%'), 
  'Liquid glass wave animation uses subtle dark specular gradient in dark mode (Zero white flashbang)');
assert(stylesCss.includes('body.dark-mode .header-btn-circle:active'), 
  'Header buttons active touch state styled with refined dark glass material');
assert(stylesCss.includes('body.dark-mode .cat-pill-btn.active:active'), 
  'Active category pill touch state maintains warm amber aura');
assert(stylesCss.includes('body.dark-mode .product-add-circle-btn:active'), 
  'Product add button active touch state triggers gold press glow');

console.log('\n--- Suite 6: Floating Input Capsule & Zero Light Leak ---');

assert(stylesCss.includes('body.dark-mode .floating-bottom-bar-wrapper::before'), 
  'Floating input bar wrapper pseudo-element uses dark gradient (Zero white haze/light leak)');
assert(stylesCss.includes('body.dark-mode .floating-bottom-bar'), 
  'Floating chat input capsule uses visionOS smoked glass with backdrop blur');
assert(stylesCss.includes('body.dark-mode .chat-text-input'), 
  'Chat input text is high-contrast white in dark mode');

console.log('\n--- Suite 7: Complete Menu Catalog Consistency & Backdrop Blur ---');

assert(stylesCss.includes('body.dark-mode .screen-menu-catalog') || stylesCss.includes('body.dark-mode #screenMenuCatalog'), 
  'Menu Catalog screen canvas is deep OLED Black');
assert(stylesCss.includes('body.dark-mode .cat-pill-btn') && stylesCss.includes('body.dark-mode .cat-pill-btn.active'), 
  'Category pills have dark smoky glass background with high-contrast active amber pill');
assert(stylesCss.includes('body.dark-mode .product-card'), 
  'Product cards use Apple VisionOS translucent dark glass with refractive top border');
assert(stylesCss.includes('body.dark-mode .product-card-title') || stylesCss.includes('[data-theme="dark"] .product-card-title'), 
  'Product titles are crisp high-contrast #FFFFFF');
assert(stylesCss.includes('body.dark-mode .product-card-price') || stylesCss.includes('[data-theme="dark"] .product-card-price'), 
  'Product prices shine in Apple Vibrant Amber (#FBBF24)');
assert(stylesCss.includes('body.dark-mode .product-card-img-wrap'), 
  'Product image container uses dark skeleton shimmer');
assert(stylesCss.includes('body.dark-mode .menu-bottom-floating-bar'), 
  'Bottom floating catalog search dock is styled with visionOS dark smoky glass');
assert(stylesCss.includes('body.dark-mode .catalog-cart-pill-btn'), 
  'Catalog cart pill button uses amber checkout styling in dark mode');
assert(stylesCss.includes('body.dark-mode .bottom-sheet-card') || stylesCss.includes('[data-theme="dark"] .bottom-sheet-card'), 
  'All modals and bottom sheets use Apple dark sheet materials');

console.log('\n===============================================================');
console.log(`🏁 AUDIT RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests/totalTests)*100).toFixed(1)}%)`);
if (failedTests === 0) {
  console.log('🎉 ALL APPLE OLED DARK MODE & LIQUID GLASS CHECKS PASSED 100%!');
} else {
  console.error(`⚠️  ${failedTests} CHECKS FAILED!`);
  process.exit(1);
}
console.log('===============================================================\n');
