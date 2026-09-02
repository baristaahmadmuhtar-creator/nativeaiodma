/* AIODMA — Native iOS & SwiftUI Engine v2.0 */

(function () {
  'use strict';

  // --- STATE MANAGEMENT ---
  const urlParams = typeof window !== 'undefined' && window.location ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const initialMerchantId = (urlParams.get('merchant') || 'coffeenity').toLowerCase().trim();
  const initialTableId = parseInt(urlParams.get('table') || urlParams.get('meja') || '5', 10) || 5;

  const state = {
    merchantId: initialMerchantId,
    merchant: null,
    selectedLang: 'id-ID',
    currentScreen: 'screenSelectLanguage',
    currentMode: 'chat', // 'chat' or 'menu'
    activeCategory: 'all',
    searchQuery: '',
    soundEnabled: true,
    tableId: initialTableId,
    orderId: null,
    orderTrackingActive: false,
    activeOrder: null,
    receiptOrderId: null,
    selectedPaymentMethod: 'BIBD',
    favorites: new Set(['kopi_milk_aren', 'iced_latte']),
    cart: [],
    kdsOrders: [],
    aiChatHistory: []
  };

  // --- MENU CATALOG DATA ---
  // --- MENU CATALOG DATA (36 Curated Items across 6 Categories) ---
  let menuCatalog = [
    // 1. KOPI (COFFEE - 8 Items)
    {
      id: 'kopi_milk_aren',
      name: 'Kopi Milk Aren (Es)',
      category: 'kopi',
      price: 28000,
      badge: 'Best Seller',
      badgeClass: 'bestseller',
      desc: 'Espresso bold, fresh milk creamy, dan lelehan gula aren asli nusantara.',
      image: 'assets/products/kopi_milk_aren.jpg',
      available: true
    },
    {
      id: 'iced_latte',
      name: 'Iced Caffe Latte',
      category: 'kopi',
      price: 26000,
      badge: 'Popular',
      badgeClass: 'popular',
      desc: 'Double shot espresso blend dengan fresh milk dingin dan es batu segar.',
      image: 'assets/products/iced_latte.jpg',
      available: true
    },
    {
      id: 'hot_latte',
      name: 'Hot Caffe Latte',
      category: 'kopi',
      price: 26000,
      badge: 'Barista Choice',
      badgeClass: 'bestseller',
      desc: 'Espresso arabica dengan steamed milk halus serta seni latte art indah.',
      image: 'assets/products/hot_latte.jpg',
      available: true
    },
    {
      id: 'caramel_macchiato',
      name: 'Iced Caramel Macchiato',
      category: 'kopi',
      price: 32000,
      badge: 'Best Seller',
      badgeClass: 'bestseller',
      desc: 'Vanilla milk lembut, double espresso floating, saus karamel drizzle mewah.',
      image: 'assets/products/caramel_macchiato.jpg',
      available: true
    },
    {
      id: 'cappuccino',
      name: 'Artisan Cappuccino',
      category: 'kopi',
      price: 28000,
      badge: 'Favorite',
      badgeClass: 'popular',
      desc: 'Espresso seimbang dengan microfoam susu tebal dan taburan dark cocoa.',
      image: 'assets/products/cappuccino.jpg',
      available: true
    },
    {
      id: 'americano',
      name: 'Iced Americano',
      category: 'kopi',
      price: 22000,
      badge: 'Clean & Fresh',
      badgeClass: 'popular',
      desc: 'Double shot espresso murni dipadu air dingin, rasa segar dan clean.',
      image: 'assets/products/americano.jpg',
      available: true
    },
    {
      id: 'espresso_single',
      name: 'Single Espresso Shot',
      category: 'kopi',
      price: 18000,
      badge: 'Strong',
      badgeClass: 'new',
      desc: 'Ekstrak biji kopi single origin dengan lapisan crema emas pekat aromatik.',
      image: 'assets/products/espresso_single.jpg',
      available: true
    },
    {
      id: 'mocha',
      name: 'Iced Mocha Delight',
      category: 'kopi',
      price: 30000,
      badge: 'Rich Choco',
      badgeClass: 'bestseller',
      desc: 'Paduan dark chocolate Belgia, double shot espresso, dan susu segar.',
      image: 'assets/products/mocha.jpg',
      available: true
    },

    // 2. NON-KOPI & REFRESHERS (6 Items)
    {
      id: 'matcha_latte',
      name: 'Kyoto Uji Matcha Latte',
      category: 'non-kopi',
      price: 32000,
      badge: 'Best Seller',
      badgeClass: 'bestseller',
      desc: 'Bubuk matcha murni impor Kyoto dipadukan dengan fresh milk lembut.',
      image: 'assets/products/matcha_latte.jpg',
      available: true
    },
    {
      id: 'peach_tea',
      name: 'Sparkling Peach Tea',
      category: 'non-kopi',
      price: 24000,
      badge: 'Menyegarkan',
      badgeClass: 'popular',
      desc: 'Teh persik dingin dengan irisan buah peach asli dan daun mint segar.',
      image: 'assets/products/peach_tea.jpg',
      available: true
    },
    {
      id: 'chocolate_fudge',
      name: 'Belgian Dark Chocolate',
      category: 'non-kopi',
      price: 28000,
      badge: 'Rich',
      badgeClass: 'popular',
      desc: 'Cokelat hitam Belgia kental dengan susu dingin yang creamy dan nikmat.',
      image: 'assets/products/chocolate_fudge.jpg',
      available: true
    },
    {
      id: 'berry_lemonade',
      name: 'Wild Berry Lemonade',
      category: 'non-kopi',
      price: 26000,
      badge: 'Fresh Soda',
      badgeClass: 'new',
      desc: 'Sensasi asam manis segar buah berry asli dengan sparkling soda dingin.',
      image: 'assets/products/berry_lemonade.jpg',
      available: true
    },
    {
      id: 'taro_milk',
      name: 'Velvet Taro Milk',
      category: 'non-kopi',
      price: 26000,
      badge: 'Sweet & Creamy',
      badgeClass: 'popular',
      desc: 'Taro wangi manis lembut dengan susu segar dan tekstur velvety lembut.',
      image: 'assets/products/taro_milk.jpg',
      available: true
    },
    {
      id: 'mango_smoothie',
      name: 'Mango Coconut Smoothie',
      category: 'non-kopi',
      price: 30000,
      badge: 'Tropical',
      badgeClass: 'new',
      desc: 'Mangga manis tropis diblend halus dengan santan kelapa segar creamy.',
      image: 'assets/products/mango_smoothie.jpg',
      available: true
    },

    // 3. PIZZA ARTISAN STONE-BAKED (6 Items)
    {
      id: 'pizza_margherita',
      name: 'Pizza Margherita Classic',
      category: 'pizza',
      price: 58000,
      badge: 'Chef Choice',
      badgeClass: 'bestseller',
      desc: 'Saus tomat San Marzano, keju mozzarella leleh, basil segar & olive oil.',
      image: 'assets/products/pizza_margherita.jpg',
      available: true
    },
    {
      id: 'pizza_pepperoni',
      name: 'Beef Pepperoni Pizza',
      category: 'pizza',
      price: 68000,
      badge: 'Best Seller',
      badgeClass: 'bestseller',
      desc: 'Topping melimpah beef pepperoni renyah dengan keju mozzarella gurih.',
      image: 'assets/products/pizza_pepperoni.jpg',
      available: true
    },
    {
      id: 'pizza_truffle_mushroom',
      name: 'Truffle Mushroom Pizza',
      category: 'pizza',
      price: 72000,
      badge: 'Premium',
      badgeClass: 'bestseller',
      desc: 'White garlic cream sauce, jamur champignon tumis, dan aroma minyak truffle mewah.',
      image: 'assets/products/pizza_truffle_mushroom.jpg',
      available: true
    },
    {
      id: 'pizza_bbq_chicken',
      name: 'BBQ Smoked Chicken Pizza',
      category: 'pizza',
      price: 65000,
      badge: 'Popular',
      badgeClass: 'popular',
      desc: 'Ayam panggang asap saus BBQ gurih manis dengan bombay & mozzarella.',
      image: 'assets/products/pizza_bbq_chicken.jpg',
      available: true
    },
    {
      id: 'pizza_quattro_formaggi',
      name: '4 Cheese Quattro Formaggi',
      category: 'pizza',
      price: 70000,
      badge: 'Cheese Lovers',
      badgeClass: 'new',
      desc: 'Kombinasi 4 keju istimewa: Mozzarella, Parmesan, Cheddar, & Ricotta.',
      image: 'assets/products/pizza_quattro_formaggi.jpg',
      available: true
    },
    {
      id: 'pizza_smoked_beef',
      name: 'Smoked Beef & Mozza Pizza',
      category: 'pizza',
      price: 68000,
      badge: 'Favorite',
      badgeClass: 'popular',
      desc: 'Daging sapi asap pilihan, lelehan keju mozarella melimpah & oregano.',
      image: 'assets/products/pizza_smoked_beef.jpg',
      available: true
    },

    // 4. MAKANAN HANGAT / MAIN COURSE (6 Items)
    {
      id: 'nasi_goreng',
      name: 'Nasi Goreng Spesial Barista',
      category: 'makanan',
      price: 35000,
      badge: 'Best Seller',
      badgeClass: 'bestseller',
      desc: 'Nasi goreng rempah aromatik, suwiran ayam, telur mata sapi, acar & kerupuk.',
      image: 'assets/products/nasi_goreng.jpg',
      available: true
    },
    {
      id: 'chicken_rice_bowl',
      name: 'Teriyaki Chicken Rice Bowl',
      category: 'makanan',
      price: 34000,
      badge: 'Popular',
      badgeClass: 'popular',
      desc: 'Nasi pulen hangat dengan paha ayam glaze teriyaki manis gurih dan wijen sangrai.',
      image: 'assets/products/chicken_rice_bowl.jpg',
      available: true
    },
    {
      id: 'chicken_katsu_curry',
      name: 'Crispy Chicken Katsu Curry',
      category: 'makanan',
      price: 40000,
      badge: 'Recommended',
      badgeClass: 'bestseller',
      desc: 'Ayam katsu krispi tebal dengan kuah kari Jepang kental berempah lezat.',
      image: 'assets/products/chicken_katsu_curry.jpg',
      available: true
    },
    {
      id: 'creamy_carbonara',
      name: 'Fettuccine Creamy Carbonara',
      category: 'makanan',
      price: 42000,
      badge: 'Favorite',
      badgeClass: 'popular',
      desc: 'Pasta fettuccine al dente dengan saus cream gurih, smoked beef, dan parmesan.',
      image: 'assets/products/creamy_carbonara.jpg',
      available: true
    },
    {
      id: 'beef_burger',
      name: 'Double Smash Beef Burger',
      category: 'makanan',
      price: 45000,
      badge: 'Juicy',
      badgeClass: 'bestseller',
      desc: 'Patty daging sapi panggang juicy, keju cheddar leleh, selada segar & saus rahasia.',
      image: 'assets/products/beef_burger.jpg',
      available: true
    },
    {
      id: 'spaghetti_bolognese',
      name: 'Spaghetti Bolognese Classic',
      category: 'makanan',
      price: 38000,
      badge: 'Classic',
      badgeClass: 'popular',
      desc: 'Spaghetti saus tomat daging cincang sapi perlahan dimasak dengan rempah Italia.',
      image: 'assets/products/spaghetti_bolognese.jpg',
      available: true
    },

    // 5. CAKE & PASTRY (6 Items)
    {
      id: 'burnt_cheesecake',
      name: 'Basque Burnt Cheesecake',
      category: 'pastry',
      price: 35000,
      badge: 'Best Seller',
      badgeClass: 'bestseller',
      desc: 'Cheesecake panggang khas Basque Spanyol dengan bagian atas karamel & lumer di tengah.',
      image: 'assets/products/burnt_cheesecake.jpg',
      available: true
    },
    {
      id: 'tiramisu_classic',
      name: 'Classic Italian Tiramisu',
      category: 'pastry',
      price: 38000,
      badge: 'Must Try',
      badgeClass: 'bestseller',
      desc: 'Ladyfinger celup espresso, krim mascarpone lembut, ditaburi cokelat murni.',
      image: 'assets/products/tiramisu_classic.jpg',
      available: true
    },
    {
      id: 'chocolate_lava',
      name: 'Molten Chocolate Lava Cake',
      category: 'pastry',
      price: 34000,
      badge: 'Sweet Tooth',
      badgeClass: 'popular',
      desc: 'Kue cokelat hangat lembut dengan lelehan lava cokelat pekat di bagian dalam.',
      image: 'assets/products/chocolate_lava.jpg',
      available: true
    },
    {
      id: 'butter_croissant',
      name: 'Golden Butter Croissant',
      category: 'pastry',
      price: 22000,
      badge: 'Flaky',
      badgeClass: 'popular',
      desc: 'Pastry Prancis renyah berlapis dengan mentega murni berkualitas tinggi.',
      image: 'assets/products/butter_croissant.jpg',
      available: true
    },
    {
      id: 'almond_croissant',
      name: 'Almond Pain au Chocolat',
      category: 'pastry',
      price: 28000,
      badge: 'Bakery Special',
      badgeClass: 'new',
      desc: 'Croissant cokelat berbalut krim almond manis dan taburan almond panggang.',
      image: 'assets/products/almond_croissant.jpg',
      available: true
    },
    {
      id: 'red_velvet_cake',
      name: 'Red Velvet Cream Cheese',
      category: 'pastry',
      price: 36000,
      badge: 'New',
      badgeClass: 'new',
      desc: 'Bolu red velvet beludru berpadu dengan frosting cream cheese asam segar.',
      image: 'assets/products/red_velvet_cake.jpg',
      available: true
    },

    // 6. CEMILAN & SNACKS (4 Items)
    {
      id: 'truffle_fries',
      name: 'Truffle Parmesan Fries',
      category: 'cemilan',
      price: 26000,
      badge: 'Best Seller',
      badgeClass: 'bestseller',
      desc: 'Kentang goreng renyah wangi minyak truffle bertabur keju parmesan & mayo.',
      image: 'assets/products/truffle_fries.jpg',
      available: true
    },
    {
      id: 'crispy_calamari',
      name: 'Crispy Calamari Rings',
      category: 'cemilan',
      price: 32000,
      badge: 'Crispy',
      badgeClass: 'popular',
      desc: 'Cumi goreng tepung keemasan renyah disajikan dengan saus tartar gurih segar.',
      image: 'assets/products/crispy_calamari.jpg',
      available: true
    },
    {
      id: 'chicken_wings',
      name: 'Spicy BBQ Chicken Wings',
      category: 'cemilan',
      price: 32000,
      badge: 'Spicy',
      badgeClass: 'popular',
      desc: 'Sayap ayam panggang glaze bumbu BBQ pedas gurih meresap sampai ke dalam.',
      image: 'assets/products/chicken_wings.jpg',
      available: true
    },
    {
      id: 'cinnamon_churros',
      name: 'Spanish Cinnamon Churros',
      category: 'cemilan',
      price: 25000,
      badge: 'Sweet',
      badgeClass: 'new',
      desc: 'Churros renyah bertabur gula kayu manis hangat dengan cocolan dark chocolate.',
      image: 'assets/products/cinnamon_churros.jpg',
      available: true
    }
  ];

  // --- AUDIO / TAPTIC ENGINE SIMULATION ---
  const audioCtx = (function () {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      return AudioContext ? new AudioContext() : null;
    } catch (e) {
      return null;
    }
  })();

  function playHaptic(type) {
    if (!state.soundEnabled || !audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'tap') {
      // Soft light impact (120Hz click)
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.03);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.start(now);
      osc.stop(now + 0.03);
    } else if (type === 'medium') {
      // Medium haptic impact for add to cart
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'rigid') {
      // Stepper click (+ / -)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'success') {
      // Harmonic chime for order success
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      freqs.forEach((freq, idx) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now + idx * 0.06);
        g.gain.setValueAtTime(0, now + idx * 0.06);
        g.gain.linearRampToValueAtTime(0.2, now + idx * 0.06 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.5);
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start(now + idx * 0.06);
        o.stop(now + idx * 0.06 + 0.55);
      });
    } else if (type === 'kitchen-chime') {
      // Kitchen order received alert bell
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    }
  }

  // --- FORMATTING UTILS ---
  function formatCurrency(amount) {
    const num = Number(amount) || 0;
    const isBnd = (state.merchant && state.merchant.currency === 'BND') || state.merchantId === 'coffeenity';
    if (isBnd) {
      const sym = state.merchant?.currencySymbol || '$';
      return `${sym}${num.toFixed(2)}`;
    }
    const sym = state.merchant?.currencySymbol || 'Rp';
    return `${sym} ${Math.round(num).toLocaleString('id-ID')}`;
  }
  const formatRupiah = formatCurrency;

  function updateClock() {
    const clockEl = document.getElementById('iosClock');
    if (!clockEl) return;
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    clockEl.textContent = `${h}:${m}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // --- NAVIGATION & SCREEN ROUTER ---
  function showScreen(screenId) {
    playHaptic('tap');
    document.querySelectorAll('.screen').forEach(el => {
      el.classList.remove('active');
    });

    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      target.scrollTop = 0;
      state.currentScreen = screenId;
    }

    const header = document.getElementById('mainHeaderBar');
    if (screenId === 'screenSelectLanguage' || screenId === 'screenOrderSuccess' || screenId === 'screenThermalReceipt') {
      if (header) {
        header.style.display = 'none';
        header.classList.add('hidden');
      }
      if (screenId === 'screenSelectLanguage') {
        if (window.location.hash !== '#language' && window.location.hash !== '') {
          history.replaceState(null, '', '#language');
        }
      } else if (screenId === 'screenOrderSuccess') {
        if (window.location.hash !== '#success') history.replaceState(null, '', '#success');
      } else if (screenId === 'screenThermalReceipt') {
        if (window.location.hash !== '#receipt') history.replaceState(null, '', '#receipt');
      }
    } else {
      if (header) {
        header.style.display = 'flex';
        header.classList.remove('hidden');
      }
      if (screenId === 'screenChatCashier' && window.location.hash !== '#chat' && window.location.hash !== '#photo') {
        history.replaceState(null, '', '#chat');
      } else if (screenId === 'screenMenuCatalog' && window.location.hash !== '#menu') {
        history.replaceState(null, '', '#menu');
      }
    }    // Close any open popups and bottom sheets
    closeAllPopups(true);
  }

  function handleHashRoute() {
    const hash = (window.location.hash || '').replace('#', '').toLowerCase();
    if (hash === 'chat') {
      switchToMode('chat');
    } else if (hash === 'menu') {
      switchToMode('menu');
    } else if (hash.startsWith('mod-')) {
      switchToMode('menu');
      const prodId = hash.replace('mod-', '');
      const item = menuCatalog.find(m => m.id === prodId) || menuCatalog[0];
      setTimeout(() => openModifierModal(item), 150);
    } else if (hash === 'cart') {
      setTimeout(() => openCartSheet(), 150);
    } else if (hash === 'payment') {
      setTimeout(() => openPaymentSheet(), 150);
    } else if (hash === 'success') {
      showScreen('screenOrderSuccess');
    } else if (hash === 'receipt') {
      showScreen('screenThermalReceipt');
    } else if (hash === 'photo') {
      switchToMode('chat');
      setTimeout(() => {
        const modal = document.getElementById('notesBackdrop');
        if (modal) openAccessibleModal(modal);
      }, 200);
    } else if (hash === 'test-photo') {
      switchToMode('chat');
      setTimeout(() => {
        sendUserImageMessage('assets/products/pizza_truffle_mushroom.jpg', 'Truffle Mushroom Pizza');
      }, 300);
    } else if (hash === 'kds') {
      openKDS();
    } else {
      showScreen('screenSelectLanguage');
    }
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'ios-toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: max(54px, calc(env(safe-area-inset-top) + 20px));
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      background: rgba(17, 17, 17, 0.9);
      color: #FFF;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 18px;
      border-radius: 9999px;
      z-index: 9999;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      pointer-events: none;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // --- NETWORK RESILIENCE MONITOR ---
  window.addEventListener('online', () => {
    showToast('Koneksi internet terhubung kembali.');
  });
  window.addEventListener('offline', () => {
    showToast('Anda sedang offline. Beberapa fitur mungkin terbatas.');
  });

  // --- ACCESSIBILITY & MODAL FOCUS MANAGEMENT (WCAG 2.1 AA) ---
  let lastFocusedElementBeforeModal = null;

  function trapFocusInDialog(dialogElement) {
    if (!dialogElement) return;
    const focusableElements = dialogElement.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [role="button"]:not([disabled]), [role="radio"]:not([disabled])'
    );
    if (!focusableElements.length) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    dialogElement.onkeydown = function(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else { // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    setTimeout(() => {
      if (typeof firstElement.focus === 'function') firstElement.focus();
    }, 60);
  }

  function openAccessibleModal(element) {
    if (!element) return;
    if (document.activeElement && document.activeElement !== document.body) {
      lastFocusedElementBeforeModal = document.activeElement;
    }
    element.classList.add('open');
    element.setAttribute('aria-hidden', 'false');
    const card = element.querySelector('.bottom-sheet-card');
    if (card) {
      card.style.transform = '';
      card.style.transition = '';
    }
    trapFocusInDialog(element);
  }

  function closeAccessibleModal(element) {
    if (!element) return;
    element.classList.remove('open');
    element.classList.remove('active');
    element.setAttribute('aria-hidden', 'true');
    element.onkeydown = null;
    const card = element.querySelector('.bottom-sheet-card');
    if (card) {
      card.style.transform = '';
      card.style.transition = '';
    }
    if (lastFocusedElementBeforeModal && typeof lastFocusedElementBeforeModal.focus === 'function') {
      lastFocusedElementBeforeModal.focus();
      lastFocusedElementBeforeModal = null;
    }
  }

  function closeAllPopups(closeSheets = false) {
    const modeMenu = document.getElementById('modeDropdownMenu');
    const actionMenu = document.getElementById('actionPopupMenu');
    if (modeMenu) modeMenu.classList.remove('open');
    if (actionMenu) actionMenu.classList.remove('open');
    const btnMode = document.getElementById('btnModeTrigger');
    if (btnMode) btnMode.setAttribute('aria-expanded', 'false');
    const btnOpts = document.getElementById('btnHeaderOptions');
    if (btnOpts) btnOpts.setAttribute('aria-expanded', 'false');

    if (closeSheets) {
      document.querySelectorAll('.bottom-sheet-backdrop, .mobile-qr-backdrop-modal').forEach(b => {
        b.classList.remove('open');
        b.classList.remove('active');
        b.setAttribute('aria-hidden', 'true');
        b.onkeydown = null;
        const card = b.querySelector('.bottom-sheet-card');
        if (card) {
          card.style.transform = '';
          card.style.transition = '';
        }
      });
      if (lastFocusedElementBeforeModal && typeof lastFocusedElementBeforeModal.focus === 'function') {
        lastFocusedElementBeforeModal.focus();
        lastFocusedElementBeforeModal = null;
      }
    }
  }

  // Global Keyboard Navigation System (WCAG 2.1 AA Compliance)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openSheet = document.querySelector('.bottom-sheet-backdrop.open, .mobile-qr-backdrop-modal.open');
      const modeMenu = document.getElementById('modeDropdownMenu');
      const actionMenu = document.getElementById('actionPopupMenu');
      if (openSheet) {
        closeAccessibleModal(openSheet);
      } else if (modeMenu?.classList.contains('open') || actionMenu?.classList.contains('open')) {
        closeAllPopups(false);
      }
    }
  });

  // --- CART CALCULATIONS & RENDERING ---
  function getCartSubtotal() {
    return state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }

  function getCartTax(subtotal) {
    const isBnd = (state.merchant && state.merchant.currency === 'BND') || state.merchantId === 'coffeenity';
    const rate = typeof state.merchant?.taxRate === 'number' 
      ? state.merchant.taxRate 
      : (isBnd ? 0.0 : 0.1);
    return isBnd ? Number((subtotal * rate).toFixed(2)) : Math.round(subtotal * rate);
  }

  function getCartTotal() {
    const sub = getCartSubtotal();
    const isBnd = (state.merchant && state.merchant.currency === 'BND') || state.merchantId === 'coffeenity';
    return isBnd ? Number((sub + getCartTax(sub)).toFixed(2)) : (sub + getCartTax(sub));
  }

  function getCartItemCount() {
    return state.cart.reduce((sum, item) => sum + item.qty, 0);
  }

  function updateCartBadgesAndTotals() {
    const count = getCartItemCount();
    const totalFormatted = formatRupiah(getCartSubtotal());
    const grandTotalFormatted = formatRupiah(getCartTotal());

    // Badges
    const floatingBadge = document.getElementById('chatCartBadge');
    const catalogBadge = document.getElementById('catalogCartBadge');
    const catalogTotal = document.getElementById('catalogCartTotal');

    if (floatingBadge) {
      floatingBadge.textContent = count;
      floatingBadge.style.display = count > 0 ? 'flex' : 'none';
    }
    if (catalogBadge) catalogBadge.textContent = count;
    if (catalogTotal) catalogTotal.textContent = totalFormatted;

    // Cart Sheet
    const cartSub = document.getElementById('cartSheetSubtotal');
    const cartTax = document.getElementById('cartSheetTax');
    const cartTot = document.getElementById('cartSheetTotal');
    if (cartSub) cartSub.textContent = totalFormatted;
    if (cartTax) cartTax.textContent = formatRupiah(getCartTax(getCartSubtotal()));
    if (cartTot) cartTot.textContent = grandTotalFormatted;

    // Payment Sheet
    const paySub = document.getElementById('paySheetSubtotal');
    const payTax = document.getElementById('paySheetTax');
    const payTot = document.getElementById('paySheetTotal');
    if (paySub) paySub.textContent = totalFormatted;
    if (payTax) payTax.textContent = formatRupiah(getCartTax(getCartSubtotal()));
    if (payTot) payTot.textContent = grandTotalFormatted;

    // Receipt
    const recSub = document.getElementById('receiptSubtotal');
    const recTax = document.getElementById('receiptTax');
    const recTot = document.getElementById('receiptTotal');
    if (recSub) recSub.textContent = totalFormatted;
    if (recTax) recTax.textContent = formatRupiah(getCartTax(getCartSubtotal()));
    if (recTot) recTot.textContent = grandTotalFormatted;
  }

  function renderCartSheetItems() {
    const container = document.getElementById('cartSheetItemsList');
    const previewContainer = document.getElementById('paymentItemsPreviewList');
    const receiptContainer = document.getElementById('receiptItemsContainer');
    if (!container) return;

    container.innerHTML = '';
    if (previewContainer) previewContainer.innerHTML = '';
    if (receiptContainer) receiptContainer.innerHTML = '';

    if (!state.cart || state.cart.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 32px 16px; color: #9CA3AF; font-size: 14px; font-weight: 600;">Keranjang pesanan masih kosong.<br><span style="font-size: 12px; color: #CBD5E1; font-weight: 400;">Silakan pilih menu favorit Anda di katalog atau ketik pesanan Anda.</span></div>';
      if (previewContainer) {
        previewContainer.innerHTML = '<div style="text-align: center; padding: 20px 0; color: #9CA3AF; font-size: 13px;">Belum ada item pesanan</div>';
      }
      return;
    }

    state.cart.forEach(item => {
      // Cart Sheet Item Row (Home 11.JPG)
      const row = document.createElement('div');
      row.className = 'cart-item-row';
      row.dataset.cartId = item.id;
      row.innerHTML = `
        <img class="cart-item-thumb" src="${item.image}" alt="${item.name}" />
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-sub" style="font-size: 11.5px; color: #64748B; font-weight: 550; margin: 2px 0 3px;">${item.subtext || 'Standar'}</div>
          <div class="cart-item-price">${formatRupiah(item.price * item.qty)}</div>
        </div>
        <div class="cart-stepper-control">
          <button class="stepper-btn btn-stepper-minus" data-id="${item.id}">−</button>
          <span class="stepper-qty-val">${item.qty}</span>
          <button class="stepper-btn btn-stepper-plus" data-id="${item.id}">+</button>
        </div>
      `;
      const cartImg = row.querySelector('.cart-item-thumb');
      if (cartImg) {
        if (cartImg.complete) cartImg.classList.add('loaded');
        else {
          cartImg.addEventListener('load', () => cartImg.classList.add('loaded'));
          cartImg.addEventListener('error', () => cartImg.classList.add('loaded'));
        }
      }
      container.appendChild(row);

      // Payment Sheet Summary Row (Home 12.JPG)
      if (previewContainer) {
        const pRow = document.createElement('div');
        pRow.className = 'payment-item-preview-row';
        pRow.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
            <span class="pay-preview-qty">${item.qty}x</span>
            <img src="${item.image}" style="width: 44px; height: 44px; border-radius: 12px; object-fit: cover;" />
            <div style="display: flex; flex-direction: column;">
              <span class="pay-preview-title">${item.name}</span>
              <span class="pay-preview-sub">${item.subtext || 'Normal'}</span>
            </div>
          </div>
          <span class="pay-preview-price">${formatRupiah(item.price * item.qty)}</span>
        `;
        previewContainer.appendChild(pRow);
      }

      // Receipt Item Row (Home 15.JPG)
      if (receiptContainer) {
        const rRow = document.createElement('div');
        rRow.className = 'receipt-item-row';
        rRow.innerHTML = `
          <span style="font-size: 13px; font-weight: 700; color: #111; min-width: 20px;">${item.qty}x</span>
          <img class="receipt-item-thumb" src="${item.image}" alt="${item.name}" />
          <div class="receipt-item-details">
            <div class="receipt-item-title">${item.name}</div>
            <div class="receipt-item-sub">${item.subtext || 'Es'}</div>
          </div>
          <div class="receipt-item-price">${formatRupiah(item.price * item.qty)}</div>
        `;
        receiptContainer.appendChild(rRow);
      }
    });

    // Wire stepper buttons via dispatchCartAction
    container.querySelectorAll('.btn-stepper-plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        playHaptic('rigid');
        const id = btn.dataset.id;
        dispatchCartAction('UPDATE_QTY', { id, delta: 1 });
      });
    });

    container.querySelectorAll('.btn-stepper-minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        playHaptic('rigid');
        const id = btn.dataset.id;
        dispatchCartAction('UPDATE_QTY', { id, delta: -1 });
      });
    });
  }

  // Unified Cart Service with Monotonic Versioning & Persistence (PRD Bab 7.1)
  function dispatchCartAction(actionType, payload = {}) {
    state.sessionLastActive = Date.now();
    let handledInPlace = false;

    if (actionType === 'ADD_ITEM') {
      let item = payload.item;
      if (!item) {
        const idToFind = payload.menuId || payload.id;
        item = menuCatalog.find(m => m.id === idToFind) || findMenuItemInCatalog(payload.name || idToFind);
        if (!item && payload.name && payload.price) {
          item = { id: idToFind || 'item_' + Date.now(), name: payload.name, price: payload.price, image: payload.image || '' };
        }
      }
      if (!item) {
        console.warn('[CART] Could not resolve item for payload:', payload);
        return;
      }
      const qty = payload.qty || 1;
      const sub = payload.subtext || (payload.modifier ? `1x ${payload.modifier.name}` : (item.category === 'kopi' ? 'Es' : 'Standar'));
      const existing = state.cart.find(c => (c.menuId === item.id || c.id === item.id) && c.subtext === sub);
      if (existing) {
        existing.qty += qty;
      } else {
        state.cart.push({
          id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          menuId: item.id,
          name: item.name,
          price: item.price,
          qty: qty,
          image: item.image || '',
          subtext: sub,
          modifiers: payload.modifier ? [payload.modifier] : []
        });
      }
    } else if (actionType === 'UPDATE_QTY') {
      const { id, delta } = payload;
      const index = state.cart.findIndex(c => c.id === id);
      if (index !== -1) {
        state.cart[index].qty += delta;
        const currentItem = state.cart[index];
        const newQty = currentItem.qty;
        const newPrice = currentItem.price * newQty;

        if (newQty <= 0) {
          state.cart.splice(index, 1);
        }

        const row = document.querySelector(`.cart-item-row[data-cart-id="${id}"]`);
        if (row) {
          handledInPlace = true;
          if (newQty <= 0) {
            row.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            row.style.opacity = '0';
            row.style.transform = 'scale(0.94) translateY(-8px)';
            setTimeout(() => {
              row.remove();
              const container = document.getElementById('cartItemsList');
              if (container && (!state.cart || state.cart.length === 0)) {
                renderCartSheetItems();
              }
            }, 200);
          } else {
            const qtySpan = row.querySelector('.stepper-qty-val');
            if (qtySpan) {
              qtySpan.textContent = newQty;
              qtySpan.style.transform = 'scale(1.28)';
              setTimeout(() => { qtySpan.style.transform = 'scale(1)'; }, 140);
            }
            const priceDiv = row.querySelector('.cart-item-price');
            if (priceDiv) {
              priceDiv.textContent = formatRupiah(newPrice);
            }
          }
        }
      }
    } else if (actionType === 'REMOVE_ITEM') {
      const { id } = payload;
      state.cart = state.cart.filter(c => c.id !== id);
    } else if (actionType === 'REMOVE_BY_MENUID') {
      const { menuId } = payload;
      state.cart = state.cart.filter(c => c.menuId !== menuId && !c.name.toLowerCase().includes(menuId.toLowerCase()));
    } else if (actionType === 'CLEAR_CART') {
      state.cart = [];
    }

    // Monotonic state version bump & snapshot persistence
    state.cartVersion = (state.cartVersion || 1) + 1;
    try {
      localStorage.setItem('aiodma_cart_snapshot', JSON.stringify({
        version: state.cartVersion,
        timestamp: Date.now(),
        cart: state.cart
      }));
    } catch (e) {
      console.debug('Failed to write cart snapshot to localStorage:', e);
    }

    if (!handledInPlace) {
      renderCartSheetItems();
    }
    updateCartBadgesAndTotals();
    triggerCartBadgeBounce();
  }

  function triggerCartBadgeBounce() {
    const badges = [
      document.getElementById('chatCartBadge'),
      document.getElementById('catalogCartBadge')
    ];
    badges.forEach(badge => {
      if (badge && badge.style.display !== 'none') {
        badge.classList.remove('cart-badge-bounce');
        void badge.offsetWidth; // Trigger reflow
        badge.classList.add('cart-badge-bounce');
      }
    });
  }

  function addItemToCart(menuItem, modifier = null) {
    playHaptic('medium');
    dispatchCartAction('ADD_ITEM', { item: menuItem, qty: 1, modifier });
  }

  // --- RENDER 2-COLUMN MENU CATALOG (Home 2.JPG) ---
  let catalogRenderTimer = null;

  function renderMenuCatalog(animateCascade = true) {
    const grid = document.getElementById('menuGridContainer');
    if (!grid) return;

    if (catalogRenderTimer) clearTimeout(catalogRenderTimer);

    const filtered = menuCatalog.filter(item => {
      const matchCat = state.activeCategory === 'all' || item.category === state.activeCategory;
      const matchSearch = !state.searchQuery || item.name.toLowerCase().includes(state.searchQuery.toLowerCase()) || item.desc.toLowerCase().includes(state.searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    if (animateCascade) {
      grid.innerHTML = `
        <div class="skeleton-box" style="height: 230px; border-radius: 24px;"></div>
        <div class="skeleton-box" style="height: 230px; border-radius: 24px;"></div>
        <div class="skeleton-box" style="height: 230px; border-radius: 24px;"></div>
        <div class="skeleton-box" style="height: 230px; border-radius: 24px;"></div>
      `;

      catalogRenderTimer = setTimeout(() => {
        populateGrid(filtered);
      }, 80);
    } else {
      populateGrid(filtered);
    }

    function populateGrid(items) {
      grid.innerHTML = '';
      if (items.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: #8E8E93;">
            <div style="font-size: 32px; margin-bottom: 8px;">🍽️</div>
            <div style="font-size: 15px; font-weight: 700; color: #111;">Menu Tidak Ditemukan</div>
            <div style="font-size: 13px; margin-top: 4px;">Coba gunakan kata kunci lain atau pilih kategori Semua.</div>
          </div>
        `;
        return;
      }

      items.forEach((item, index) => {
        const isFav = state.favorites.has(item.id);
        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.animationDelay = `${Math.min(index * 35, 280)}ms`;
        card.innerHTML = `
          <div class="product-card-img-wrap">
            ${item.badge ? `<span class="product-card-badge ${item.badgeClass || ''}">${item.badge}</span>` : ''}
            <button class="product-heart-btn ${isFav ? 'liked' : ''}" data-id="${item.id}" aria-label="Favorit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? '#EF4444' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </button>
            <img class="product-card-img" src="${item.image}" alt="${item.name}" loading="lazy" />
          </div>
          <div class="product-card-body">
            <div>
              <div class="product-card-title">${item.name}</div>
              <div class="product-card-desc">${item.desc}</div>
            </div>
            <div class="product-card-bottom-row">
              <span class="product-card-price">${formatRupiah(item.price)}</span>
              <button class="product-add-circle-btn btn-add-product" data-id="${item.id}">+</button>
            </div>
          </div>
        `;

        const img = card.querySelector('.product-card-img');
        if (img) {
          if (img.complete) {
            img.classList.add('loaded');
          } else {
            img.addEventListener('load', () => img.classList.add('loaded'));
            img.addEventListener('error', () => {
              img.classList.add('loaded');
              img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23CBD5E1" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
            });
          }
        }

        // Open modifier modal on card body click
        card.querySelector('.product-card-body').addEventListener('click', () => {
          openModifierModal(item);
        });
        card.querySelector('.product-card-img').addEventListener('click', () => {
          openModifierModal(item);
        });

        // Heart favorite listener
        const heartBtn = card.querySelector('.product-heart-btn');
        heartBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          playHaptic('tap');
          if (state.favorites.has(item.id)) {
            state.favorites.delete(item.id);
            heartBtn.classList.remove('liked');
            heartBtn.querySelector('svg').setAttribute('fill', 'none');
          } else {
            state.favorites.add(item.id);
            heartBtn.classList.add('liked');
            heartBtn.querySelector('svg').setAttribute('fill', '#EF4444');
          }
        });

        // Add to cart / customizer listener
        const addBtn = card.querySelector('.btn-add-product');
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModifierModal(item);
        });

        grid.appendChild(card);
      });
    }
  }

  // --- AI CASHIER CONVERSATION ENGINE (Home 3-7, 10.JPG) ---
  const chatThread = document.getElementById('chatMessageThread');
  const chatEmptyState = document.getElementById('chatEmptyState');

  function scrollChatToBottom(smooth = true) {
    requestAnimationFrame(() => {
      const container = document.getElementById('chatScrollArea') || (chatThread ? chatThread.parentElement : null);
      if (!container) return;
      if (smooth) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    });
  }

  // --- AI TOKEN METERING STATE ---
  function recordAiUsage(inputTokens, outputTokens, tier) {
    if (tier === undefined) tier = 1;
    let stats = JSON.parse(localStorage.getItem('aiodma_token_stats') || '{"totalTokens": 18450, "inputTokens": 11200, "outputTokens": 7250, "totalCalls": 48, "tier0": 18, "tier1": 22, "tier2": 8, "costUsd": 0.042, "remainingCredits": 48155}');
    stats.totalTokens += (inputTokens + outputTokens);
    stats.inputTokens += inputTokens;
    stats.outputTokens += outputTokens;
    stats.totalCalls += 1;
    if (tier === 0) stats.tier0 += 1;
    else if (tier === 1) stats.tier1 += 1;
    else stats.tier2 += 1;
    
    // Estimate cost ($0.0008 per 1k tokens)
    const cost = ((inputTokens * 0.0005) + (outputTokens * 0.0015)) / 1000;
    stats.costUsd += cost;
    stats.remainingCredits = Math.max(0, stats.remainingCredits - (inputTokens + outputTokens));
    localStorage.setItem('aiodma_token_stats', JSON.stringify(stats));

    // Dispatch custom event for real-time admin sync
    window.dispatchEvent(new CustomEvent('aiodma_credits_updated', { detail: stats }));
  }

  // --- GEMINI BARISTA SYSTEM PROMPT & TOOLS DEFINITION ---
  function buildGeminiSystemPrompt() {
    const tone = localStorage.getItem('aiodma_gemini_tone') || 'warm';
    const toneDesc = tone === 'formal' 
      ? 'Formal, sopan tinggi, tata bahasa baku dan elegan' 
      : (tone === 'fast' ? 'Ringkas, efisien, to the point' : 'Ramah, santun, hangat, seperti Master Barista & Sommelier kafe artisan kelas dunia');

    // Dynamic Time-of-Day Context
    const nowHour = new Date().getHours();
    let timeMealCategory = 'Sore (Coffee Break & Santai)';
    if (nowHour >= 5 && nowHour < 11) timeMealCategory = 'Pagi (Sarapan & Fresh Coffee Boost)';
    else if (nowHour >= 11 && nowHour < 15) timeMealCategory = 'Siang (Makan Siang & Refreshing Drink)';
    else if (nowHour >= 15 && nowHour < 18) timeMealCategory = 'Sore (Afternoon Tea, Artisan Coffee & Pastry)';
    else timeMealCategory = 'Malam (Dinner, Gourmet Pizza & Soothing Drink)';

    const menuLines = menuCatalog.map(m => {
      const pairText = m.pairings && m.pairings.length > 0 ? ` | Pairing Ideal: [${m.pairings.join(', ')}]` : '';
      const flavorText = m.flavorProfile ? ` | Karakter: "${m.flavorProfile}"` : '';
      const hookText = m.upsellHook ? ` | Saran Harmonis: "${m.upsellHook}"` : '';
      return `- ${m.id} | ${m.name} (${m.category}) | Rp ${m.price} | "${m.desc}"${flavorText}${pairText}${hookText} [${m.available !== false ? 'Tersedia' : 'HABIS 86'}]`;
    }).join('\n');

    const cartSummary = state.cart.length > 0
      ? state.cart.map(c => `- ${c.qty}x ${c.name} (Rp ${c.price * c.qty}) [${c.subtext || 'Standar'}]`).join('\n')
      : 'Keranjang saat ini kosong.';

    return `Anda adalah "Master Barista, Kasir Presisi & Sommelier Gastronomi AIODMA" untuk Meja 5.
Gaya Bahasa: ${toneDesc}.
Waktu Operasional Saat Ini: ${timeMealCategory}.
Bahasa: Sesuaikan dengan bahasa pelanggan secara natural.

PRINSIP KOMUNIKASI & KECERDASAN (GENIUS AI BARISTA):
1. ZERO-EMOJI POLICY: DILARANG KERAS menggunakan karakter emoji apa pun di seluruh respon. Gunakan bahasa yang santun, presisi, dan berkelas.
2. PRINSIP SINGKAT & PADAT (ANTI-VERBOSE):
   - Jawablah dengan RINGKAS (maksimal 2-3 kalimat per respon), KECUALI jika pelanggan secara eksplisit meminta penjelasan mendalam, sejarah kopi, atau detail bahan.
   - Hindari bertele-tele atau mengulang kalimat basa-basi yang panjang.
3. PROTOKOL GUARDRAILS & PERCAKAPAN CERDAS (CONVERSATIONAL PIVOTING):
   - TOPIK DI LUAR KAFE (Coding, Pemrograman, Matematika Rumit, Politik, Teknis Luar): Dilarang menulis kode program atau beralih menjadi chatbot umum. Tolak dengan santun dalam 1 kalimat dan alihkan kembali dengan hangat ke suasana kafe atau sajian minuman/makanan.
   - OBROLAN SANTAI / MOOD / CURHAT RINGAN (Lelah, Bosan, Menunggu Teman, Cuaca): Sambut dengan empati tulus (1 kalimat), lalu tawarkan rekomendasi minuman atau makanan penenang suasana yang cocok secara natural (1 kalimat).
4. MEJA TETAP: Seluruh pesanan terikat khusus untuk Meja 5.
5. KASIR CERDAS MULTI-ITEM:
   - Tangkap pesanan multi-item dan kustomisasi yang disebutkan dalam kalimat kompleks secara presisi (contoh: "1 kopi milk aren less sugar, 2 americano extra shot, 1 pizza truffle").
   - Panggil tool 'addToCart' dengan array item, kuantiti, dan catatan modifier lengkap.
6. SENI UPSELLING & PAIRING GASTRONOMI (NON-INTRUSIF):
   - Jangan pernah memaksa atau berjualan secara agresif.
   - Pahami harmoni rasa:
     * Kopi Susu/Aren -> Pastry hangat (Almond Croissant / Cinnamon Roll / Pain au Chocolat).
     * Makanan Gurih/Pizza/Pasta -> Minuman buah segar (Peach Blossom Iced Tea / Wild Berry Lemonade / Cold Brew).
     * Kopi Hitam/Americano -> Fudge Brownie / Tiramisu / Burnt Cheesecake.
   - Maksimal 1 saran pairing per giliran agar tetap nyaman dan natural.
7. WAJIB PANGGIL 'showRecommendations' SAAT MEREKOMENDASIKAN MENU:
   - Kapan pun Anda merekomendasikan menu, menyebutkan pilihan varian, atau menyarankan pairing di respon Anda:
     * Panggil tool 'showRecommendations' dengan array ID menu resmi terkait (contoh: itemIds: ['pizza_pepperoni', 'pizza_truffle_mushroom']).
     * Selalu tebalkan nama menu di teks dengan format markdown **Nama Menu**.
8. MANAJEMEN BUDGET & KONSULTASI MENU:
   - Jika pelanggan bertanya paket dengan budget tertentu (contoh: "Ada menu dengan budget 50 ribu?"), racikkan kombinasi makanan & minuman terbaik yang pas atau di bawah budget dan sebutkan rincian harganya.
   - Pahami kebutuhan: Aman lambung (Cold Brew, Tea), Rendah Gula (Americano, Tea, opsi Less Sugar), Tanpa Kopi (Matcha, Chocolate, Smoothie), Vegetarian (Pizza Margherita, Truffle Mushroom, Caesar Salad).
9. INFORMASI FASILITAS KAFE (CONCIERGE):
   - Wi-Fi: SSID 'AIODMA_Guest' (Password: 'kopienak123').
   - Stopkontak/Colokan: Tersedia di bawah setiap meja dan dinding sofa Meja 5.
   - Toilet/Wastafel: Lorong sebelah kanan dekat bar barista.
   - Musholla: Tersedia di Lantai 2 (lengkap dengan sarana wudhu).
   - Jam Buka Kafe: Buka setiap hari pukul 07:00 - 23:00.
10. TOOLS TERSEDIA:
   - addToCart: Menambahkan pesanan ke keranjang Meja 5.
   - removeFromCart: Menghapus item atau mengosongkan keranjang.
   - showRecommendations: Menampilkan kartu rekomendasi produk visual dengan tombol tambah.
   - openMenuCatalog: Membuka katalog menu.
   - proceedToPayment: Membuka layar pembayaran checkout.
   - callWaiter: Memanggil staf pelayan ke meja.

KATALOG RESMI 36 MENU DENGAN PAIRING MATRIX:
${menuLines}

STATUS KERANJANG MEJA 5:
${cartSummary}`;
  }

  const GEMINI_FUNCTION_DECLARATIONS = [
    {
      name: "addToCart",
      description: "Menambahkan satu atau beberapa menu ke keranjang pesanan pelanggan di Meja 5",
      parameters: {
        type: "OBJECT",
        properties: {
          items: {
            type: "ARRAY",
            description: "Daftar item yang dipesan",
            items: {
              type: "OBJECT",
              properties: {
                itemId: { type: "STRING", description: "ID menu persis di katalog (contoh: kopi_milk_aren, pizza_pepperoni, nasi_goreng, burnt_cheesecake)" },
                qty: { type: "INTEGER", description: "Jumlah pesanan (default: 1)" },
                modifiers: { type: "STRING", description: "Catatan kustomisasi (contoh: Less Sugar, Es Normal, Stuffed Crust, dll)" }
              },
              required: ["itemId"]
            }
          }
        },
        required: ["items"]
      }
    },
    {
      name: "removeFromCart",
      description: "Menghapus item tertentu atau mengosongkan keranjang pesanan",
      parameters: {
        type: "OBJECT",
        properties: {
          itemId: { type: "STRING", description: "ID menu yang ingin dihapus" },
          all: { type: "BOOLEAN", description: "Set true untuk menghapus seluruh isi keranjang" }
        }
      }
    },
    {
      name: "showRecommendations",
      description: "Menampilkan kartu visual rekomendasi menu yang cocok dipadukan",
      parameters: {
        type: "OBJECT",
        properties: {
          itemIds: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Daftar ID menu yang direkomendasikan"
          },
          reason: { type: "STRING", description: "Alasan pairing yang menarik dan sopan" }
        },
        required: ["itemIds"]
      }
    },
    {
      name: "openMenuCatalog",
      description: "Membuka katalog visual menu lengkap",
      parameters: {
        type: "OBJECT",
        properties: {
          category: { type: "STRING", description: "Filter kategori: all, kopi, non-kopi, pizza, makanan, pastry, cemilan" }
        }
      }
    },
    {
      name: "proceedToPayment",
      description: "Membuka lembar pembayaran pesanan (Checkout)",
      parameters: {
        type: "OBJECT",
        properties: {}
      }
    },
    {
      name: "callWaiter",
      description: "Memanggil staf pelayan ke Meja 5",
      parameters: {
        type: "OBJECT",
        properties: {
          reason: { type: "STRING", description: "Keperluan pelanggan" }
        }
      }
    },
    {
      name: "checkOrderStatus",
      description: "Memeriksa status pelacakan pesanan terkini di KDS dapur untuk Meja 5",
      parameters: {
        type: "OBJECT",
        properties: {
          orderNumber: { type: "STRING", description: "Nomor pesanan yang ingin diperiksa (opsional)" }
        }
      }
    }
  ];

  // Markdown formatter for elegant, readable AI messages
  function formatAiMessageMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function appendAiBubble(rawContent, isHtml = false) {
    if (!rawContent || !rawContent.trim()) return null;

    // Auto-detect multiple paragraphs separated by \n\n for dynamic multi-bubble cadence
    const paragraphs = rawContent.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length > 1 && !isHtml) {
      let lastBubble = null;
      paragraphs.forEach((para, idx) => {
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble-ai';
        if (idx > 0) bubble.style.marginTop = '6px';
        bubble.innerHTML = `<div class="chat-bubble-ai-text">${formatAiMessageMarkdown(para)}</div>`;
        chatThread.appendChild(bubble);
        lastBubble = bubble;
      });
      scrollChatToBottom();
      return lastBubble;
    }

    const aiBubble = document.createElement('div');
    aiBubble.className = 'chat-bubble-ai';
    const textHtml = isHtml ? rawContent : formatAiMessageMarkdown(rawContent);
    aiBubble.innerHTML = `<div class="chat-bubble-ai-text">${textHtml}</div>`;
    chatThread.appendChild(aiBubble);
    scrollChatToBottom();
    return aiBubble;
  }

  function appendAiBubbles(bubblesArray, onDone = null) {
    if (!Array.isArray(bubblesArray) || bubblesArray.length === 0) return null;
    const validBubbles = bubblesArray.filter(b => b && b.trim());
    if (validBubbles.length === 0) return null;

    let lastBubble = null;
    validBubbles.forEach((text, idx) => {
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble-ai';
      if (idx > 0) bubble.style.marginTop = '6px';
      bubble.innerHTML = `<div class="chat-bubble-ai-text">${formatAiMessageMarkdown(text)}</div>`;
      chatThread.appendChild(bubble);
      lastBubble = bubble;
    });

    scrollChatToBottom();
    if (typeof onDone === 'function') onDone(lastBubble);
    return lastBubble;
  }

  function appendAiBubblePair(bubble1Text, bubble2Text, onDone = null) {
    return appendAiBubbles([bubble1Text, bubble2Text], onDone);
  }

  // Helper UI Renders in Chat
  function renderChatAddedCard(item, qty, modifiers) {
    if (!item) return;
    const addedCard = document.createElement('div');
    addedCard.className = 'chat-added-card';
    addedCard.style.cursor = 'pointer';
    const subNote = modifiers ? `<div style="font-size: 11px; color: #64748B;">${modifiers}</div>` : '';
    addedCard.innerHTML = `
      <div class="added-header-label">Ditambahkan ke keranjang (Meja 5)</div>
      <div class="added-item-body">
        <img class="added-item-thumb" src="${item.image}" alt="${item.name}" />
        <div class="added-item-info" style="flex: 1;">
          <div class="added-item-title">${qty || 1}x ${item.name}</div>
          <div class="added-item-price">${formatRupiah(item.price * (qty || 1))}</div>
          ${subNote}
        </div>
        <svg class="added-check-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      </div>
    `;
    addedCard.addEventListener('click', () => {
      playHaptic('tap');
      openCartSheet();
    });
    chatThread.appendChild(addedCard);
  }

  // --- ELEGANT AI MARKDOWN FORMATTER (Crisp Typography & Hierarchy) ---
  function formatAiMessageContent(rawText) {
    if (!rawText) return '';
    let text = String(rawText);

    // 1. Remove unwanted raw emojis if any
    text = text.replace(/[\u{1F600}-\u{1F6FF}|[\u{2600}-\u{26FF}]/gu, '');

    // 2. Bold: **text** -> <strong class="chat-highlight">text</strong>
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="chat-highlight">$1</strong>');

    // 3. Italic: *text* or _text_
    text = text.replace(/\*([^\*]+?)\*/g, '<em class="chat-italic">$1</em>');

    // 4. Clean paragraphs and bullet lines
    const lines = text.split('\n');
    let inList = false;
    let formattedHtml = '';

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList) {
          formattedHtml += '<ul class="chat-bullet-list">';
          inList = true;
        }
        formattedHtml += `<li class="chat-bullet-item">${trimmed.substring(2)}</li>`;
      } else {
        if (inList) {
          formattedHtml += '</ul>';
          inList = false;
        }
        formattedHtml += `<p class="chat-p">${trimmed}</p>`;
      }
    });

    if (inList) {
      formattedHtml += '</ul>';
    }

    return formattedHtml || `<p class="chat-p">${text}</p>`;
  }

  function createAiBubble(contentHtmlOrText) {
    const aiBubble = document.createElement('div');
    aiBubble.className = 'chat-bubble-ai';
    const parsed = formatAiMessageContent(contentHtmlOrText);
    aiBubble.innerHTML = `<div class="chat-bubble-ai-text">${parsed}</div>`;
    return aiBubble;
  }

  function renderChatRecommendationBlock(itemIds, reason) {
    if (!itemIds) return;
    const rawList = Array.isArray(itemIds) ? itemIds : [itemIds];
    const validItems = [];
    const seen = new Set();

    rawList.forEach(raw => {
      const key = typeof raw === 'object' && raw !== null ? (raw.itemId || raw.id || raw.name || '') : String(raw || '');
      const item = findMenuItemInCatalog(key) || menuCatalog.find(m => m.id === key);
      if (item && !seen.has(item.id)) {
        seen.add(item.id);
        validItems.push(item);
      }
    });

    if (validItems.length === 0) return;

    const block = document.createElement('div');
    block.className = 'chat-recommendation-block';
    
    let cardsHtml = '';
    validItems.forEach(item => {
      const catLabel = (item.category || 'MENU').toUpperCase();
      cardsHtml += `
        <div class="chat-rec-card">
          <div class="chat-rec-card-top">
            <img class="chat-rec-thumb" src="${item.image}" alt="${item.name}" />
            <div class="chat-rec-info">
              <span class="chat-rec-badge-pill">${catLabel}</span>
              <div class="chat-rec-name">${item.name}</div>
              <div class="chat-rec-price">${formatRupiah(item.price)}</div>
            </div>
          </div>
          <button class="chat-rec-btn-add btn-rec-card-add" data-id="${item.id}">
            + Tambah
          </button>
        </div>
      `;
    });

    block.innerHTML = `
      <div class="chat-rec-title">${reason || 'Rekomendasi Pilihan Untuk Anda'}</div>
      <div class="chat-rec-cards-scroll">
        ${cardsHtml}
      </div>
    `;
    chatThread.appendChild(block);

    block.querySelectorAll('.chat-rec-thumb').forEach(img => {
      if (img.complete) {
        img.classList.add('loaded');
      } else {
        img.addEventListener('load', () => img.classList.add('loaded'));
        img.addEventListener('error', () => {
          img.src = 'assets/products/kopi_milk_aren.jpg';
          img.classList.add('loaded');
        });
      }
    });

    block.querySelectorAll('.btn-rec-card-add').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = menuCatalog.find(m => m.id === btn.dataset.id);
        if (target) {
          playHaptic('medium');
          btn.classList.add('added-success');
          btn.innerHTML = '✓ Ditambahkan';
          setTimeout(() => {
            btn.classList.remove('added-success');
            btn.innerHTML = '+ Tambah';
          }, 1800);
          openModifierModal(target);
        }
      });
    });
  }

  // --- LEVENSHTEIN FUZZY SIMILARITY ENGINE ---
  function calculateStringSimilarity(s1, s2) {
    if (!s1 || !s2) return 0;
    s1 = s1.toLowerCase().trim();
    s2 = s2.toLowerCase().trim();
    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.85;

    const len1 = s1.length;
    const len2 = s2.length;
    const matrix = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1.0 : (1.0 - (distance / maxLen));
  }

  // --- TYPO-TOLERANT FUZZY MENU ITEM RESOLVER ---
  function findMenuItemInCatalog(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') return null;
    const clean = rawInput.trim().toLowerCase();
    const slug = clean.replace(/[-\s]/g, '_');

    // 0. Guard against generic category words (prevent false-positive order matching)
    const genericCategoryTerms = new Set([
      'pizza', 'piza', 'pijja', 'kopi', 'coffee', 'ngopi', 'minum', 'minuman', 
      'makan', 'makanan', 'makan siang', 'dinner', 'lunch', 'pastry', 'kue', 'cake', 
      'cemilan', 'snack', 'pasta', 'spaghetti', 'spageti', 'dessert', 'jus', 'juice'
    ]);
    if (genericCategoryTerms.has(clean)) {
      return null;
    }

    // 1. Direct ID / Slug Match
    let found = menuCatalog.find(m => m.id.toLowerCase() === clean || m.id === slug);
    if (found) return found;

    // 2. Direct Name Exact Match
    found = menuCatalog.find(m => m.name.toLowerCase() === clean);
    if (found) return found;

    // 3. Substring Name Match (only if search token has meaningful specificity >= 4 chars and not a broad category)
    if (clean.length >= 4) {
      found = menuCatalog.find(m => m.name.toLowerCase().includes(clean) || clean.includes(m.name.toLowerCase()));
      if (found) return found;
    }

    // 4. Comprehensive Typo, Phonetic & Slang Alias Map (All 36 Catalog Items)
    const aliasMap = {
      // 1. Kopi
      'aren': 'kopi_milk_aren', 'kopi aren': 'kopi_milk_aren', 'kopi susu': 'kopi_milk_aren', 'kp aren': 'kopi_milk_aren', 'kopi arn': 'kopi_milk_aren', 'kopsus': 'kopi_milk_aren', 'milk aren': 'kopi_milk_aren',
      'latte': 'iced_latte', 'iced latte': 'iced_latte', 'caffe latte': 'iced_latte', 'late': 'iced_latte', 'es latte': 'iced_latte',
      'hot latte': 'hot_latte', 'latte panas': 'hot_latte', 'kopi panas': 'hot_latte',
      'caramel': 'caramel_macchiato', 'macchiato': 'caramel_macchiato', 'karamel': 'caramel_macchiato', 'makiato': 'caramel_macchiato', 'caramel macchiato': 'caramel_macchiato',
      'cappuccino': 'cappuccino', 'kapucino': 'cappuccino', 'capucino': 'cappuccino', 'kapusino': 'cappuccino', 'artisan cappuccino': 'cappuccino',
      'americano': 'americano', 'kopi hitam': 'americano', 'amerikano': 'americano', 'amricano': 'americano', 'iced americano': 'americano',
      'espresso': 'espresso_single', 'single espresso': 'espresso_single', 'espreso': 'espresso_single', 'espresso shot': 'espresso_single',
      'mocha': 'mocha', 'moka': 'mocha', 'iced mocha': 'mocha', 'mocha delight': 'mocha',

      // 2. Non-Kopi
      'matcha': 'matcha_latte', 'uji matcha': 'matcha_latte', 'matca': 'matcha_latte', 'maca': 'matcha_latte', 'matcha latte': 'matcha_latte', 'green tea': 'matcha_latte',
      'peach': 'peach_tea', 'peach tea': 'peach_tea', 'pich tea': 'peach_tea', 'pech tea': 'peach_tea', 'teh peach': 'peach_tea', 'sparkling peach': 'peach_tea',
      'chocolate': 'chocolate_fudge', 'cokelat': 'chocolate_fudge', 'dark chocolate': 'chocolate_fudge', 'coklat': 'chocolate_fudge', 'belgian chocolate': 'chocolate_fudge',
      'berry': 'berry_lemonade', 'lemonade': 'berry_lemonade', 'beri': 'berry_lemonade', 'wild berry': 'berry_lemonade', 'wild berry lemonade': 'berry_lemonade',
      'taro': 'taro_milk', 'talas': 'taro_milk', 'velvet taro': 'taro_milk', 'taro milk': 'taro_milk',
      'mango': 'mango_smoothie', 'smoothie': 'mango_smoothie', 'mangga': 'mango_smoothie', 'smuti': 'mango_smoothie', 'mango coconut': 'mango_smoothie',

      // 3. Pizza
      'margherita': 'pizza_margherita', 'margarita': 'pizza_margherita', 'pizza margherita': 'pizza_margherita',
      'pepperoni': 'pizza_pepperoni', 'peperoni': 'pizza_pepperoni', 'pizza pepperoni': 'pizza_pepperoni', 'beef pepperoni': 'pizza_pepperoni', 'pisa peperoni': 'pizza_pepperoni',
      'truffle pizza': 'pizza_truffle_mushroom', 'truffle mushroom': 'pizza_truffle_mushroom', 'pizza jamur': 'pizza_truffle_mushroom', 'truffle mushroom pizza': 'pizza_truffle_mushroom', 'pijja trufel': 'pizza_truffle_mushroom', 'trufle piza': 'pizza_truffle_mushroom',
      'bbq chicken': 'pizza_bbq_chicken', 'pizza ayam': 'pizza_bbq_chicken', 'bbq chicken pizza': 'pizza_bbq_chicken', 'bbq smoked chicken': 'pizza_bbq_chicken',
      'quattro formaggi': 'pizza_quattro_formaggi', '4 cheese': 'pizza_quattro_formaggi', 'four cheese': 'pizza_quattro_formaggi', 'pizza keju': 'pizza_quattro_formaggi', 'formaggi': 'pizza_quattro_formaggi',
      'smoked beef': 'pizza_smoked_beef', 'smoked beef pizza': 'pizza_smoked_beef', 'mozza pizza': 'pizza_smoked_beef', 'daging asap': 'pizza_smoked_beef',

      // 4. Makanan Berat
      'nasi goreng': 'nasi_goreng', 'nasgor': 'nasi_goreng', 'nsgor': 'nasi_goreng', 'nasigoreng': 'nasi_goreng', 'nasi goreng spesial': 'nasi_goreng',
      'rice bowl': 'chicken_rice_bowl', 'teriyaki': 'chicken_rice_bowl', 'chicken teriyaki': 'chicken_rice_bowl', 'chicken rice bowl': 'chicken_rice_bowl',
      'katsu': 'chicken_katsu_curry', 'curry': 'chicken_katsu_curry', 'kari': 'chicken_katsu_curry', 'katsu curry': 'chicken_katsu_curry', 'chicken katsu': 'chicken_katsu_curry',
      'carbonara': 'creamy_carbonara', 'pasta carbonara': 'creamy_carbonara', 'karbonara': 'creamy_carbonara', 'spaghetti carbonara': 'creamy_carbonara', 'fettuccine carbonara': 'creamy_carbonara', 'creamy carbonara': 'creamy_carbonara',
      'burger': 'beef_burger', 'beef burger': 'beef_burger', 'double smash burger': 'beef_burger', 'smash burger': 'beef_burger', 'hamburger': 'beef_burger',
      'bolognese': 'spaghetti_bolognese', 'pasta bolognese': 'spaghetti_bolognese', 'spaghetti bolognese': 'spaghetti_bolognese', 'bolognes': 'spaghetti_bolognese',

      // 5. Pastry & Cakes
      'cheesecake': 'burnt_cheesecake', 'burnt cheesecake': 'burnt_cheesecake', 'basque cheesecake': 'burnt_cheesecake', 'ciscek': 'burnt_cheesecake', 'chesecak': 'burnt_cheesecake',
      'tiramisu': 'tiramisu_classic', 'tiramisu cake': 'tiramisu_classic', 'italian tiramisu': 'tiramisu_classic', 'classic tiramisu': 'tiramisu_classic',
      'lava cake': 'chocolate_lava', 'chocolate lava': 'chocolate_lava', 'molten cake': 'chocolate_lava', 'molten chocolate': 'chocolate_lava',
      'butter croissant': 'butter_croissant', 'croissant': 'butter_croissant', 'kroisan': 'butter_croissant', 'croisant': 'butter_croissant',
      'pain au chocolat': 'almond_croissant', 'almond croissant': 'almond_croissant', 'almond pain au chocolat': 'almond_croissant', 'pastry cokelat': 'almond_croissant',
      'red velvet': 'red_velvet_cake', 'red velvet cake': 'red_velvet_cake', 'red velvet cream cheese': 'red_velvet_cake',

      // 6. Cemilan / Snacks
      'truffle fries': 'truffle_fries', 'kentang': 'truffle_fries', 'fries': 'truffle_fries', 'kentang truffle': 'truffle_fries', 'parmesan fries': 'truffle_fries',
      'calamari': 'crispy_calamari', 'cumi': 'crispy_calamari', 'crispy calamari': 'crispy_calamari', 'calamari rings': 'crispy_calamari',
      'wings': 'chicken_wings', 'chicken wings': 'chicken_wings', 'bbq wings': 'chicken_wings', 'sayap ayam': 'chicken_wings', 'spicy wings': 'chicken_wings',
      'churros': 'cinnamon_churros', 'cinnamon churros': 'cinnamon_churros', 'spanish churros': 'cinnamon_churros', 'curos': 'cinnamon_churros'
    };

    for (const [alias, targetId] of Object.entries(aliasMap)) {
      if (clean.includes(alias) || alias.includes(clean)) {
        return menuCatalog.find(m => m.id === targetId) || null;
      }
    }

    // 4. Levenshtein Fuzzy Scoring Fallback across all items and aliases (Threshold >= 0.60)
    let bestMatch = null;
    let highestScore = 0;

    for (const [alias, targetId] of Object.entries(aliasMap)) {
      const score = calculateStringSimilarity(clean, alias);
      if (score > highestScore && score >= 0.60) {
        highestScore = score;
        bestMatch = menuCatalog.find(m => m.id === targetId);
      }
    }

    if (!bestMatch) {
      menuCatalog.forEach(m => {
        const scoreName = calculateStringSimilarity(clean, m.name);
        const scoreId = calculateStringSimilarity(clean, m.id.replace(/_/g, ' '));
        const maxScore = Math.max(scoreName, scoreId);
        if (maxScore > highestScore && maxScore >= 0.60) {
          highestScore = maxScore;
          bestMatch = m;
        }
      });
    }

    return bestMatch;
  }

  // --- AUTOMATIC TEXT-TO-CARD & SOMMELIER PAIRING POST-PROCESSOR ---
  function postProcessAiResponse(cleanText, functionCalls = []) {
    if (!cleanText || !cleanText.trim()) return;

    // 1. Identify items already rendered via tool calling in this turn
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

    // 2. Extract potential menu mentions from AI text
    const candidateIds = [];

    // Strategy A: All Markdown Bold phrases: **[Text]**
    const boldMatches = cleanText.match(/\*\*([^*]+)\*\*/g) || [];
    boldMatches.forEach(bm => {
      const inner = bm.replace(/\*\*/g, '').trim();
      const resolved = findMenuItemInCatalog(inner);
      if (resolved && !alreadyRenderedItemIds.has(resolved.id) && !candidateIds.includes(resolved.id)) {
        candidateIds.push(resolved.id);
      }
    });

    // Strategy B: Scan full catalog names & aliases in text
    const lower = cleanText.toLowerCase();
    menuCatalog.forEach(m => {
      if (alreadyRenderedItemIds.has(m.id) || candidateIds.includes(m.id)) return;
      
      const mNameLower = m.name.toLowerCase();
      if (lower.includes(mNameLower)) {
        candidateIds.push(m.id);
        return;
      }

      // Check specific core keywords
      const words = mNameLower.split(' ').filter(w => w.length >= 5);
      for (const w of words) {
        if (['pizza', 'classic', 'iced', 'artis', 'crispy', 'spaghetti', 'french', 'toast'].includes(w)) continue;
        if (lower.includes(w)) {
          candidateIds.push(m.id);
          break;
        }
      }
    });

    // 3. Render cards if there are unrendered recommended/pairing items mentioned
    if (candidateIds.length > 0) {
      const recTitle = hasAddToCart 
        ? 'Saran Pasangan Harmonis (Pairing):' 
        : (hasExplicitRecs ? 'Pilihan Pendamping Lainnya:' : 'Rekomendasi Menu Terkait:');

      renderChatRecommendationBlock(candidateIds.slice(0, 3), recTitle);
      renderChatQuickChips([
        { label: 'Lihat Keranjang', action: 'cart' },
        { label: 'Buka Katalog Menu', action: 'menu' }
      ]);
    }
  }

  function renderChatQuickChips(chips) {
    if (!chips || chips.length === 0) return;
    // Remove ALL existing quick reply chip rows to prevent duplicates
    chatThread.querySelectorAll('.quick-reply-chips-row').forEach(row => row.remove());

    const chipsRow = document.createElement('div');
    chipsRow.className = 'quick-reply-chips-row';
    chips.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'quick-reply-chip';
      btn.textContent = c.label;
      btn.addEventListener('click', () => {
        if (c.action === 'cart') openCartSheet();
        else if (c.action === 'payment') openPaymentSheet();
        else if (c.action === 'menu') switchToMode('menu');
        else if (c.prompt) triggerAIResponse(c.prompt);
      });
      chipsRow.appendChild(btn);
    });
    chatThread.appendChild(chipsRow);
  }

  // --- CHAT SESSION PERSISTENCE & RESTORATION ---
  function saveChatSession() {
    try {
      sessionStorage.setItem('aiodma_chat_history', JSON.stringify(state.aiChatHistory || []));
      sessionStorage.setItem('aiodma_chat_html', chatThread ? chatThread.innerHTML : '');
    } catch (e) {}
  }

  function restoreChatSession() {
    try {
      const savedHistory = sessionStorage.getItem('aiodma_chat_history');
      const savedHtml = sessionStorage.getItem('aiodma_chat_html');
      if (savedHistory) {
        state.aiChatHistory = JSON.parse(savedHistory);
      }
      if (savedHtml && savedHtml.trim().length > 0 && chatThread) {
        chatThread.innerHTML = savedHtml;
        chatThread.style.display = 'flex';
        if (chatEmptyState) chatEmptyState.style.display = 'none';

        // Re-attach interactive listeners in restored elements
        chatThread.querySelectorAll('.btn-rec-card-add').forEach(btn => {
          btn.addEventListener('click', () => {
            const target = menuCatalog.find(m => m.id === btn.dataset.id);
            if (target) {
              playHaptic('medium');
              openModifierModal(target);
            }
          });
        });
        chatThread.querySelectorAll('.quick-reply-chip').forEach(btn => {
          btn.addEventListener('click', () => {
            const txt = btn.textContent;
            if (txt.includes('Keranjang')) openCartSheet();
            else if (txt.includes('Bayar') || txt.includes('Pembayaran')) openPaymentSheet();
            else if (txt.includes('Menu') || txt.includes('Katalog')) switchToMode('menu');
          });
        });
        chatThread.querySelectorAll('.added-item-body').forEach(el => {
          el.addEventListener('click', () => openCartSheet());
        });
      }
    } catch (e) {
      console.debug('Failed to restore chat session:', e);
    }
  }

  // --- GEMINI LIVE DISPATCHER & EXECUTOR ---
  if (!state.aiChatHistory) state.aiChatHistory = [];
  let _aiRequestInFlight = false;

  async function triggerAIResponse(userText) {
    // Concurrency guard: prevent duplicate requests from rapid input
    if (_aiRequestInFlight) return;
    _aiRequestInFlight = true;

    if (chatEmptyState) chatEmptyState.style.display = 'none';
    if (chatThread) chatThread.style.display = 'flex';

    // 1. Append User Bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble-user';
    userBubble.textContent = userText;
    chatThread.appendChild(userBubble);
    scrollChatToBottom();

    // 2. Append Thinking Indicator
    const thinkingBubble = document.createElement('div');
    thinkingBubble.className = 'chat-bubble-ai thinking';
    thinkingBubble.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    chatThread.appendChild(thinkingBubble);
    scrollChatToBottom();

    const apiKey = (localStorage.getItem('aiodma_gemini_api_key') || '').trim();
    const model = localStorage.getItem('aiodma_gemini_model') || 'gemini-3.7-flash';
    const temp = parseFloat(localStorage.getItem('aiodma_gemini_temperature') || '0.7');

    if (!apiKey) {
      // 1. Try Server-Side AI Barista Proxy (Uses central cafe API Key)
      (async () => {
        try {
          const sRes = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-merchant-id': state.merchantId || 'coffeenity'
            },
            body: JSON.stringify({
              merchantId: state.merchantId || 'coffeenity',
              message: userText,
              history: state.aiChatHistory.slice(-8),
              table: `Meja ${state.tableId || 5}`,
              cart: state.cart.map(c => ({ name: c.name, qty: c.qty, subtext: c.subtext }))
            })
          });

          if (sRes.ok) {
            const sData = await sRes.json();
            if (sData.success && (sData.text || sData.functionCalls?.length > 0)) {
              if (thinkingBubble.parentNode) thinkingBubble.parentNode.removeChild(thinkingBubble);
              if (sData.usage) recordAiUsage(sData.usage.inTokens, sData.usage.outTokens, 2);

              // 1. Generate text output
              let textOutput = sData.text || '';
              if (!textOutput.trim() && sData.functionCalls?.length > 0) {
                const firstFn = sData.functionCalls[0]?.name;
                if (firstFn === 'addToCart') textOutput = `Pesanan telah ditambahkan ke keranjang Meja ${state.tableId || 5}. Ada menu lain yang ingin dipesan?`;
                else if (firstFn === 'showRecommendations') textOutput = 'Berikut beberapa menu rekomendasi terbaik kami:';
                else if (firstFn === 'proceedToPayment') textOutput = 'Silakan periksa kembali keranjang dan pilih metode pembayaran.';
                else if (firstFn === 'openMenuCatalog') textOutput = 'Silakan pilih menu favorit Anda di katalog:';
                else textOutput = 'Baik, permintaan Anda sedang diproses.';
              }
              // Clean literal \n escape sequences that AI may output
              textOutput = textOutput.replace(/\\n/g, '\n');
              const cleanText = textOutput.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
              appendAiBubble(cleanText);

              // 2. Execute Function Calls (renders card UNDER the text)
              if (sData.functionCalls && sData.functionCalls.length > 0) {
                executeAiFunctionCalls(sData.functionCalls);
              }

              // 3. Post-process freeform mentions
              postProcessAiResponse(cleanText, sData.functionCalls);
              scrollChatToBottom();

              // 4. Save Session History
              state.aiChatHistory.push({ role: "user", parts: [{ text: userText }] });
              state.aiChatHistory.push({ role: "model", parts: [{ text: cleanText }] });
              saveChatSession();
              _aiRequestInFlight = false;
              return;
            }
          }
        } catch (e) {
          console.debug('Server AI proxy unavailable, using smart local rule fallback:', e);
        }

        // 2. Direct Menu Redirection when AI service is unavailable
        if (thinkingBubble.parentNode) thinkingBubble.parentNode.removeChild(thinkingBubble);
        appendAiBubble('Mohon maaf, layanan percakapan sedang tidak tersedia saat ini. Silakan melihat pilihan hidangan dan memesan langsung melalui menu kami.');
        renderChatQuickChips([
          { label: 'Buka Menu', action: 'menu' }
        ]);
        saveChatSession();
        scrollChatToBottom();
        _aiRequestInFlight = false;
        return;
      })();
      return;
    }

    try {
      // Append user turn to history
      state.aiChatHistory.push({
        role: "user",
        parts: [{ text: userText }]
      });

      // Keep sliding window of last 10 turns to save tokens
      if (state.aiChatHistory.length > 10) {
        state.aiChatHistory = state.aiChatHistory.slice(-10);
      }

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: buildGeminiSystemPrompt() }]
          },
          contents: state.aiChatHistory,
          generationConfig: {
            temperature: temp,
            maxOutputTokens: 600,
            thinking_config: { thinking_budget: 512 }
          },
          tools: [{
            function_declarations: GEMINI_FUNCTION_DECLARATIONS
          }]
        })
      });

      if (thinkingBubble.parentNode) thinkingBubble.parentNode.removeChild(thinkingBubble);

      if (!res.ok) {
        const errDetail = await res.json().catch(() => ({}));
        console.warn('Gemini API returned error:', res.status, errDetail);
        appendAiBubble('Mohon maaf, layanan percakapan sedang mengalami kendala. Silakan melihat dan memesan langsung melalui menu kami.');
        renderChatQuickChips([
          { label: 'Buka Menu', action: 'menu' }
        ]);
        saveChatSession();
        scrollChatToBottom();
        return;
      }

      const data = await res.json();
      const candidate = data?.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // Record real token usage
      const inTokens = data?.usageMetadata?.promptTokenCount || Math.round(userText.length / 3.5);
      const outTokens = data?.usageMetadata?.candidatesTokenCount || 40;
      recordAiUsage(inTokens, outTokens, 2);

      let textOutput = '';
      const functionCalls = [];

      parts.forEach(p => {
        // Filter out internal thinking/reasoning parts from Gemini models
        if (p.thought) return;
        if (p.text) textOutput += p.text;
        if (p.functionCall) functionCalls.push(p.functionCall);
      });

      // If function called but text is empty, generate conversational reply
      if (!textOutput || !textOutput.trim()) {
        const firstFn = functionCalls[0]?.name;
        if (firstFn === 'addToCart') {
          textOutput = `Pesanan telah ditambahkan ke keranjang Meja ${state.tableId || 5}. Ada menu lain yang ingin dipesan?`;
        } else if (firstFn === 'showRecommendations') {
          textOutput = 'Berikut beberapa menu rekomendasi terbaik kami:';
        } else if (firstFn === 'proceedToPayment') {
          textOutput = 'Silakan periksa kembali keranjang dan pilih metode pembayaran.';
        } else if (firstFn === 'openMenuCatalog') {
          textOutput = 'Silakan pilih menu favorit Anda di katalog:';
        } else {
          textOutput = 'Baik, permintaan Anda sedang diproses.';
        }
      }

      // Clean literal \n escape sequences that AI may output as text
      textOutput = textOutput.replace(/\\n/g, '\n');
      const cleanText = textOutput.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
      appendAiBubble(cleanText);

      // Execute Function Calls (renders cards UNDER text)
      if (functionCalls.length > 0) {
        executeAiFunctionCalls(functionCalls);
      }

      postProcessAiResponse(cleanText, functionCalls);
      chatThread.parentElement.scrollTop = chatThread.parentElement.scrollHeight;

      state.aiChatHistory.push({
        role: "model",
        parts: [{ text: cleanText }]
      });
      saveChatSession();
      _aiRequestInFlight = false;

    } catch (err) {
      console.warn('Gemini API Exception:', err);
      if (thinkingBubble.parentNode) thinkingBubble.parentNode.removeChild(thinkingBubble);
      appendAiBubble('Mohon maaf, layanan percakapan sedang mengalami kendala. Silakan melihat dan memesan langsung melalui menu kami.');
      renderChatQuickChips([
        { label: 'Buka Menu', action: 'menu' }
      ]);
      saveChatSession();
      scrollChatToBottom();
      _aiRequestInFlight = false;
    }
  }

  function executeAiFunctionCalls(functionCalls) {
    if (!Array.isArray(functionCalls) || functionCalls.length === 0) return;

    for (const fc of functionCalls) {
      const fnName = fc.name;
      const args = fc.args || {};

      if (fnName === 'addToCart') {
        const items = args.items || [];
        items.forEach(it => {
          const itemKey = it.itemId || it.name || it.id || '';
          const catalogItem = findMenuItemInCatalog(itemKey);
          if (catalogItem) {
            const qty = it.qty || 1;
            const sub = it.modifiers || 'Standar';
            dispatchCartAction('ADD_ITEM', {
              item: catalogItem,
              qty: qty,
              subtext: sub
            });
            renderChatAddedCard(catalogItem, qty, sub);
          }
        });
        playHaptic('success');
        
        renderChatQuickChips([
          { label: 'Lihat Keranjang', action: 'cart' },
          { label: 'Lanjut ke Pembayaran', action: 'payment' },
          { label: 'Lihat Menu Lain', action: 'menu' }
        ]);
      } 
      else if (fnName === 'removeFromCart') {
        if (args.all) {
          dispatchCartAction('CLEAR_CART');
        } else if (args.itemId) {
          const matched = findMenuItemInCatalog(args.itemId);
          dispatchCartAction('REMOVE_BY_MENUID', { menuId: matched ? matched.id : args.itemId });
        }
        playHaptic('rigid');
      }
      else if (fnName === 'showRecommendations') {
        const rawList = args.itemIds || args.items || args.item_ids || (args.itemId ? [args.itemId] : []);
        renderChatRecommendationBlock(rawList, args.reason || 'Rekomendasi Pilihan Untuk Anda:');
      }
      else if (fnName === 'openMenuCatalog') {
        if (args.category && args.category !== 'all') {
          state.activeCategory = args.category;
          document.querySelectorAll('.cat-pill-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.cat === args.category);
          });
          renderMenuCatalog();
        }
        switchToMode('menu');
      }
      else if (fnName === 'proceedToPayment') {
        openPaymentSheet();
      }
      else if (fnName === 'callWaiter') {
        showToast(`Pelayan telah dipanggil ke Meja ${state.tableId || 5}`);
        playHaptic('success');
      }
      else if (fnName === 'checkOrderStatus') {
        const modal = document.getElementById('orderTrackerBackdrop');
        if (modal) {
          modal.classList.add('open');
          playHaptic('medium');
        }
      }
    }
  }

  async function getImageBase64Data(src) {
    if (!src) return null;
    if (src.startsWith('data:')) {
      const match = src.match(/^data:([^;]+);base64,(.+)$/);
      if (match) return { mimeType: match[1], data: match[2] };
    }
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const resStr = reader.result;
          if (typeof resStr === 'string') {
            const match = resStr.match(/^data:([^;]+);base64,(.+)$/);
            if (match) resolve({ mimeType: match[1], data: match[2] });
            else resolve(null);
          } else {
            resolve(null);
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Cannot convert image to base64:', e);
      return null;
    }
  }

  async function sendUserImageMessage(imageSrc, itemNameHint) {
    if (chatEmptyState) chatEmptyState.style.display = 'none';
    if (chatThread) chatThread.style.display = 'flex';

    // Switch to chat mode if currently viewing catalog
    if (state.currentMode !== 'chat') {
      switchToMode('chat');
    }

    // 1. Create User Message Bubble with Attached Image
    const userBubbleWrap = document.createElement('div');
    userBubbleWrap.className = 'chat-bubble-user has-image';
    userBubbleWrap.innerHTML = `
      <img src="${imageSrc}" class="chat-attached-image" alt="Foto menu yang ditanyakan" />
      <div style="font-size: 14px; font-weight: 500;">Ini menu apa ya dan harganya berapa?</div>
    `;
    chatThread.appendChild(userBubbleWrap);
    chatThread.parentElement.scrollTop = chatThread.parentElement.scrollHeight;

    // 2. Show AI thinking indicator
    const thinkingBubble = document.createElement('div');
    thinkingBubble.className = 'chat-bubble-ai thinking';
    thinkingBubble.innerHTML = `
      <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
    `;
    chatThread.appendChild(thinkingBubble);
    chatThread.parentElement.scrollTop = chatThread.parentElement.scrollHeight;

    const apiKey = (localStorage.getItem('aiodma_gemini_api_key') || '').trim();
    const model = localStorage.getItem('aiodma_gemini_model') || 'gemini-3.7-flash';

    // Helper fallback
    const fallbackLocalMatch = () => {
      if (thinkingBubble.parentNode) thinkingBubble.parentNode.removeChild(thinkingBubble);
      let targetItem = null;
      if (itemNameHint) {
        targetItem = menuCatalog.find(m => m.name.toLowerCase().includes(itemNameHint.toLowerCase()) || itemNameHint.toLowerCase().includes(m.name.toLowerCase()) || m.id.toLowerCase().includes(itemNameHint.toLowerCase()));
      }
      if (!targetItem) {
        targetItem = menuCatalog.find(m => imageSrc.includes(m.id)) || menuCatalog[0];
      }
      appendAiBubble(`Foto yang Anda kirim adalah **${targetItem.name}** seharga **${formatRupiah(targetItem.price)}**. ${targetItem.desc}. Mau saya tambahkan ke keranjang Meja 5?`);
      renderChatRecommendationBlock([targetItem.id], 'Menu sesuai foto yang Anda tanyakan:');
      state.aiChatHistory.push({
        role: "user",
        parts: [{ text: `[Pengguna mengirim foto menu: ${targetItem.name}] Ini menu apa ya dan harganya berapa?` }]
      });
      state.aiChatHistory.push({
        role: "model",
        parts: [{ text: `Foto ini adalah ${targetItem.name} seharga ${formatRupiah(targetItem.price)}. ${targetItem.desc}.` }]
      });
      recordAiUsage(32, 45, 2);
      playHaptic('tap');
      scrollChatToBottom();
    };

    if (!apiKey) {
      // 1. Try Server-Side Vision Proxy
      (async () => {
        try {
          const imgData = await getImageBase64Data(imageSrc);
          if (imgData) {
            const sRes = await fetch('/api/ai/vision', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageBase64: imgData.data,
                mimeType: imgData.mimeType
              })
            });

            if (sRes.ok) {
              const sData = await sRes.json();
              if (sData.success && sData.text) {
                if (thinkingBubble.parentNode) thinkingBubble.parentNode.removeChild(thinkingBubble);
                recordAiUsage(250, 60, 2);

                let matchedItem = menuCatalog.find(m => sData.text.toLowerCase().includes(m.name.toLowerCase()));
                if (!matchedItem && itemNameHint) {
                  matchedItem = menuCatalog.find(m => m.name.toLowerCase().includes(itemNameHint.toLowerCase()));
                }
                if (!matchedItem) {
                  matchedItem = menuCatalog.find(m => imageSrc.includes(m.id)) || menuCatalog[0];
                }

                appendAiBubble(sData.text);
                if (matchedItem) {
                  renderChatRecommendationBlock([matchedItem.id], 'Menu Terdeteksi:');
                }
                scrollChatToBottom();

                state.aiChatHistory.push({ role: "user", parts: [{ text: `[Foto: ${matchedItem ? matchedItem.name : 'Menu'}] Ini menu apa?` }] });
                state.aiChatHistory.push({ role: "model", parts: [{ text: sData.text }] });
                return;
              }
            }
          }
        } catch (e) {
          console.debug('Server Vision proxy unavailable, using local fallback:', e);
        }

        // 2. Local Fallback
        fallbackLocalMatch();
      })();
      return;
    }

    try {
      const imgData = await getImageBase64Data(imageSrc);
      if (!imgData) {
        fallbackLocalMatch();
        return;
      }

      const menuListStr = menuCatalog.map(m => `${m.id}: ${m.name} (${formatRupiah(m.price)}) - ${m.desc}`).join('\n');
      const visionPrompt = `Anda adalah AI Barista AIODMA untuk Meja 5. Analisis foto makanan/minuman ini dan cocokkan dengan salah satu dari 36 menu resmi kami berikut:\n${menuListStr}\n\nInstruksi:\n1. Sebutkan nama menu yang paling cocok dan harganya.\n2. Berikan deskripsi rasa ringkas (1-2 kalimat) dan tanyakan apakah ingin dipesan ke Meja 5.\n3. ZERO-EMOJI POLICY: Dilarang keras menggunakan emoji apapun.\n4. Format respon santun dan profesional.`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              {
                inline_data: {
                  mime_type: imgData.mimeType,
                  data: imgData.data
                }
              },
              { text: visionPrompt }
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 400
          }
        })
      });

      if (thinkingBubble.parentNode) thinkingBubble.parentNode.removeChild(thinkingBubble);

      if (!res.ok) {
        console.warn('Gemini Vision API error:', res.status);
        fallbackLocalMatch();
        return;
      }

      const data = await res.json();
      const rawReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanReply = rawReply.replace(/[\u{1F600}-\u{1F6FF}|[\u{2600}-\u{26FF}]/gu, '').trim();

      if (!cleanReply) {
        fallbackLocalMatch();
        return;
      }

      // Record token usage
      recordAiUsage(250, 60, 2);

      // Find matched item in catalog based on name mentions
      let matchedItem = menuCatalog.find(m => cleanReply.toLowerCase().includes(m.name.toLowerCase()));
      if (!matchedItem && itemNameHint) {
        matchedItem = menuCatalog.find(m => m.name.toLowerCase().includes(itemNameHint.toLowerCase()));
      }
      if (!matchedItem) {
        matchedItem = menuCatalog.find(m => imageSrc.includes(m.id)) || menuCatalog[0];
      }

      appendAiBubble(cleanReply);

      if (matchedItem) {
        renderChatRecommendationBlock([matchedItem.id], 'Menu terdeteksi oleh AI Vision:');
      }

      playHaptic('tap');
      chatThread.parentElement.scrollTop = chatThread.parentElement.scrollHeight;

      state.aiChatHistory.push({
        role: "user",
        parts: [{ text: `[Pengguna mengirim foto menu: ${matchedItem ? matchedItem.name : 'Foto'}] Ini menu apa ya dan harganya berapa?` }]
      });
      state.aiChatHistory.push({
        role: "model",
        parts: [{ text: cleanReply }]
      });

    } catch (err) {
      console.error('Gemini Vision exception:', err);
      fallbackLocalMatch();
    }
  }

  // --- MODE SWITCHER (Chat ↔ Menu) ---
  function switchToMode(mode) {
    playHaptic('tap');
    state.currentMode = mode;
    const trigger = document.getElementById('btnModeTrigger');
    const optChat = document.getElementById('optModeChat');
    const optMenu = document.getElementById('optModeMenu');

    if (mode === 'chat') {
      showScreen('screenChatCashier');
      if (optChat) optChat.querySelector('.mode-option-check').style.opacity = '1';
      if (optMenu) optMenu.querySelector('.mode-option-check').style.opacity = '0';
      if (trigger) trigger.querySelector('span').textContent = 'CHAT';
    } else {
      showScreen('screenMenuCatalog');
      if (optChat) optChat.querySelector('.mode-option-check').style.opacity = '0';
      if (optMenu) optMenu.querySelector('.mode-option-check').style.opacity = '1';
      if (trigger) trigger.querySelector('span').textContent = 'MENU';
      renderMenuCatalog();
    }
    closeAllPopups();
  }

  // --- MODAL SHEETS CONTROLLER ---
  function openCartSheet() {
    playHaptic('tap');
    renderCartSheetItems();
    updateCartBadgesAndTotals();
    const sheet = document.getElementById('cartBackdrop');
    if (sheet) openAccessibleModal(sheet);
  }

  function closeCartSheet() {
    const sheet = document.getElementById('cartBackdrop');
    if (sheet) closeAccessibleModal(sheet);
  }

  function openPaymentSheet() {
    playHaptic('tap');
    closeCartSheet();
    renderCartSheetItems();
    updateCartBadgesAndTotals();
    const sheet = document.getElementById('paymentBackdrop');
    if (sheet) openAccessibleModal(sheet);
  }

  function closePaymentSheet() {
    const sheet = document.getElementById('paymentBackdrop');
    if (sheet) closeAccessibleModal(sheet);
  }

  // --- THERMAL RECEIPT POPULATOR ---
  function updateThermalReceiptWithOrder(order) {
    if (!order) return;
    const idEl = document.getElementById('receiptOrderId');
    const dtEl = document.getElementById('receiptDateTime');
    const itemsEl = document.getElementById('receiptItemsContainer');
    const subEl = document.getElementById('receiptSubtotal');
    const taxEl = document.getElementById('receiptTax');
    const totEl = document.getElementById('receiptTotal');
    const pmEl = document.getElementById('receiptPaymentName');

    if (idEl) idEl.textContent = order.orderNumber || '#1K04';
    if (dtEl) {
      const d = new Date(order.createdAt || Date.now());
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      dtEl.innerHTML = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}<br>${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    if (subEl) subEl.textContent = formatRupiah(order.subtotal);
    if (taxEl) taxEl.textContent = formatRupiah(order.tax);
    if (totEl) totEl.textContent = formatRupiah(order.total);
    if (pmEl) pmEl.textContent = order.paymentMethod || 'BIBD';

    if (itemsEl && Array.isArray(order.items)) {
      itemsEl.innerHTML = order.items.map(item => {
        const itemImg = item.image || (menuCatalog.find(m => m.id === item.itemId)?.image) || 'assets/products/kopi_milk_aren.jpg';
        const subtextHtml = item.subtext ? `<div class="receipt-item-meta">${item.subtext}</div>` : '';
        return `
          <div class="receipt-item-row">
            <span class="receipt-item-qty">${item.qty || 1}x</span>
            <img class="receipt-item-thumb" src="${itemImg}" alt="${item.name}">
            <div class="receipt-item-details">
              <div class="receipt-item-name">${item.name}</div>
              ${subtextHtml}
            </div>
            <span class="receipt-item-price">${formatRupiah(item.price * (item.qty || 1))}</span>
          </div>
        `;
      }).join('');
    }
  }

  // --- CHECKOUT & ORDER DISPATCH PROCESS (Spec Bab 3.6 - Backend MVO & Idempotency) ---
  async function startPaymentProcessing() {
    if (state.isProcessingPayment) return; // Prevent double submit from rapid taps
    state.isProcessingPayment = true;
    state.currentIdempotencyKey = 'IDEMP_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);

    playHaptic('medium');
    closePaymentSheet();

    // Visually and functionally disable submit button
    const btnPay = document.getElementById('btnProcessPayment');
    if (btnPay) {
      btnPay.disabled = true;
      btnPay.style.opacity = '0.6';
      btnPay.style.pointerEvents = 'none';
      btnPay.textContent = 'Memproses Transaksi...';
    }

    // Show Processing Spinner Sheet (Home 13.JPG)
    const procModal = document.getElementById('processingModal');
    if (procModal) procModal.classList.add('active');

    const subtotal = getCartSubtotal();
    const tax = getCartTax(subtotal);
    const total = subtotal + tax;

    const payload = {
      table: `Meja ${state.tableId || 5}`,
      tableNum: state.tableId || 5,
      items: state.cart.map(c => ({
        id: c.id || c.menuId,
        itemId: c.menuId || c.id,
        name: c.name,
        price: c.price,
        qty: c.qty,
        subtext: c.subtext,
        image: c.image
      })),
      subtotal: subtotal,
      tax: tax,
      total: total,
      paymentMethod: state.selectedPaymentMethod || 'BIBD',
      merchantId: state.merchantId || 'coffeenity',
      idempotencyKey: state.currentIdempotencyKey
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-id': state.merchantId || 'coffeenity'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      const serverOrder = data.order || {
        id: 'ORD-' + Math.floor(100 + Math.random() * 900),
        orderNumber: '#1K04',
        table: `Meja ${state.tableId || 5}`,
        items: payload.items,
        total: total,
        createdAt: new Date().toISOString()
      };

      state.orderId = serverOrder.orderNumber;
      state.lastPlacedOrder = serverOrder;

      // Update Order Success Screen subtitle with real orderNumber
      const successSubtitle = document.querySelector('#screenOrderSuccess .order-success-subtitle');
      if (successSubtitle) {
        successSubtitle.textContent = `Pesanan ${serverOrder.orderNumber} sedang diproses. Mohon tunggu.`;
      }

      // Update Thermal Receipt Screen
      updateThermalReceiptWithOrder(serverOrder);

      // Add to local state KDS
      state.kdsOrders.unshift({
        id: serverOrder.id,
        orderNumber: serverOrder.orderNumber,
        table: serverOrder.table,
        status: serverOrder.status || 'received',
        time: 'Baru saja',
        items: serverOrder.items.map(i => ({ name: i.name, qty: i.qty, note: i.subtext })),
        total: serverOrder.total
      });
      renderKDS();

      // Record user active order in state & localStorage
      state.orderId = serverOrder.orderNumber;
      state.activeOrder = serverOrder;
      state.orderTrackingActive = true;
      try {
        localStorage.setItem('aiodma_my_order', JSON.stringify({
          id: serverOrder.id,
          orderNumber: serverOrder.orderNumber,
          tableNum: serverOrder.tableNum || (state.tableId || 5),
          createdAt: Date.now()
        }));
        sessionStorage.removeItem('aiodma_dismissed_banner_' + serverOrder.orderNumber);
      } catch(e) {}

      // Clear Cart
      dispatchCartAction('CLEAR_CART');

      setTimeout(() => {
        if (procModal) procModal.classList.remove('active');
        playHaptic('success');
        state.isProcessingPayment = false;

        if (btnPay) {
          btnPay.disabled = false;
          btnPay.style.opacity = '';
          btnPay.style.pointerEvents = '';
          btnPay.textContent = 'Proses Pembayaran';
        }

        // Show Order Success Screen (Home 14.JPG)
        showScreen('screenOrderSuccess');

        // Render Device-Adaptive Order Tracking UI (Dynamic Island or Live Banner)
        renderOrderTrackingUI(serverOrder, 'received', false);

        // Confetti burst
        triggerConfetti();
      }, 1200);

    } catch (err) {
      console.warn('Backend order submit error, using local fallback:', err);
      setTimeout(() => {
        if (procModal) procModal.classList.remove('active');
        playHaptic('success');
        state.isProcessingPayment = false;

        if (btnPay) {
          btnPay.disabled = false;
          btnPay.style.opacity = '';
          btnPay.style.pointerEvents = '';
          btnPay.textContent = 'Proses Pembayaran';
        }

        showScreen('screenOrderSuccess');
        triggerConfetti();
      }, 1200);
    }
  }

  // --- CONFETTI ANIMATION ---
  function triggerConfetti() {
    const count = 30;
    const colors = ['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6'];
    const container = document.getElementById('screenOrderSuccess');
    if (!container) return;

    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.style.cssText = `
        position: absolute;
        top: 20%;
        left: ${40 + (Math.random() * 20)}%;
        width: ${6 + Math.random() * 6}px;
        height: ${6 + Math.random() * 10}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: 2px;
        pointer-events: none;
        z-index: 1000;
        transform: rotate(${Math.random() * 360}deg);
        transition: all ${1 + Math.random() * 1.5}s cubic-bezier(0.2, 0.8, 0.2, 1);
      `;
      container.appendChild(piece);

      setTimeout(() => {
        piece.style.top = `${60 + Math.random() * 30}%`;
        piece.style.left = `${Math.random() * 90}%`;
        piece.style.opacity = '0';
        piece.style.transform = `rotate(${Math.random() * 720}deg) scale(0.5)`;
      }, 50);

      setTimeout(() => {
        piece.remove();
      }, 2500);
    }
  }

  // --- KITCHEN POS KDS LOGIC ---
  function renderKDS() {
    const listRec = document.getElementById('kdsColReceivedList');
    const listPrep = document.getElementById('kdsColPreparingList');
    const listRdy = document.getElementById('kdsColReadyList');

    if (!listRec || !listPrep || !listRdy) return;

    listRec.innerHTML = '';
    listPrep.innerHTML = '';
    listRdy.innerHTML = '';

    let cRec = 0, cPrep = 0, cRdy = 0;

    state.kdsOrders.forEach(order => {
      const card = document.createElement('div');
      card.className = `kds-order-card ${order.status}`;
      card.innerHTML = `
        <div class="kds-order-meta-row">
          <span class="kds-table-badge">${order.table}</span>
          <span style="font-size: 13px; font-weight: 800; color: #fff;">${order.orderNumber}</span>
          <span class="kds-timer-text">${order.time}</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 4px; margin: 4px 0;">
          ${order.items.map(it => `
            <div class="kds-item-line">
              <span>${it.qty}x ${it.name}</span>
              <span style="font-size: 11px; color: #9CA3AF;">${it.note || ''}</span>
            </div>
          `).join('')}
        </div>

        <div class="kds-card-actions">
          ${order.status === 'received' ? `
            <button class="kds-action-btn primary btn-kds-prep" data-id="${order.id}">Racik Pesanan</button>
          ` : order.status === 'preparing' ? `
            <button class="kds-action-btn primary btn-kds-ready" data-id="${order.id}">Siap Saji</button>
          ` : `
            <button class="kds-action-btn btn-kds-done" data-id="${order.id}">Selesai / Antar</button>
          `}
        </div>
      `;

      if (order.status === 'received') {
        listRec.appendChild(card);
        cRec++;
      } else if (order.status === 'preparing') {
        listPrep.appendChild(card);
        cPrep++;
      } else {
        listRdy.appendChild(card);
        cRdy++;
      }
    });

    document.getElementById('kdsCountReceived').textContent = cRec;
    document.getElementById('kdsCountPreparing').textContent = cPrep;
    document.getElementById('kdsCountReady').textContent = cRdy;
    document.getElementById('kdsActiveCount').textContent = cRec + cPrep;

    // Button actions
    document.querySelectorAll('.btn-kds-prep').forEach(b => {
      b.addEventListener('click', () => {
        playHaptic('tap');
        const o = state.kdsOrders.find(x => x.id === b.dataset.id);
        if (o) {
          o.status = 'preparing';
          renderKDS();
        }
      });
    });

    document.querySelectorAll('.btn-kds-ready').forEach(b => {
      b.addEventListener('click', () => {
        playHaptic('success');
        const o = state.kdsOrders.find(x => x.id === b.dataset.id);
        if (o) {
          o.status = 'ready';
          renderKDS();
        }
      });
    });

    document.querySelectorAll('.btn-kds-done').forEach(b => {
      b.addEventListener('click', () => {
        playHaptic('tap');
        state.kdsOrders = state.kdsOrders.filter(x => x.id !== b.dataset.id);
        renderKDS();
      });
    });
  }

  // --- DYNAMIC CATEGORY-SPECIFIC MODIFIERS CONFIGURATION ---
  const MODIFIERS_BY_CATEGORY = {
    'kopi': [
      {
        id: 'sugar',
        title: 'Level Manis (Sugar)',
        type: 'radio',
        defaultIdx: 2,
        options: [
          { label: '0% Less', val: '0% Gula', price: 0 },
          { label: '50% Medium', val: '50% Gula', price: 0 },
          { label: 'Normal (100%)', val: 'Normal Gula', price: 0 }
        ]
      },
      {
        id: 'ice',
        title: 'Pilihan Suhu & Es',
        type: 'radio',
        defaultIdx: 2,
        options: [
          { label: 'Panas (Hot)', val: 'Panas (Hot)', price: 0 },
          { label: 'Sedikit Es', val: 'Less Ice', price: 0 },
          { label: 'Es Normal', val: 'Es Normal', price: 0 }
        ]
      },
      {
        id: 'addons',
        title: 'Topping & Ekstra (Opsional)',
        type: 'checkbox',
        options: [
          { name: 'Extra Espresso Shot', price: 4000 },
          { name: 'Ganti Oat Milk Premium', price: 6000 },
          { name: 'Topping Boba Kenyal', price: 5000 },
          { name: 'Whipped Cream', price: 4000 }
        ]
      }
    ],
    'non-kopi': [
      {
        id: 'sugar',
        title: 'Level Manis (Sugar)',
        type: 'radio',
        defaultIdx: 2,
        options: [
          { label: '0% Less', val: '0% Gula', price: 0 },
          { label: '50% Medium', val: '50% Gula', price: 0 },
          { label: 'Normal (100%)', val: 'Normal Gula', price: 0 }
        ]
      },
      {
        id: 'ice',
        title: 'Pilihan Suhu & Es',
        type: 'radio',
        defaultIdx: 2,
        options: [
          { label: 'Panas (Hot)', val: 'Panas (Hot)', price: 0 },
          { label: 'Sedikit Es', val: 'Less Ice', price: 0 },
          { label: 'Es Normal', val: 'Es Normal', price: 0 }
        ]
      },
      {
        id: 'addons',
        title: 'Topping & Ekstra (Opsional)',
        type: 'checkbox',
        options: [
          { name: 'Topping Boba Kenyal', price: 5000 },
          { name: 'Ganti Oat Milk Premium', price: 6000 },
          { name: 'Whipped Cream', price: 4000 }
        ]
      }
    ],
    'pizza': [
      {
        id: 'crust',
        title: 'Ukuran & Pinggiran (Crust)',
        type: 'radio',
        defaultIdx: 0,
        options: [
          { label: 'Reguler (6 Slice)', val: 'Reguler 6-Slice', price: 0 },
          { label: 'Large (+Rp 25rb)', val: 'Large 8-Slice', price: 25000 },
          { label: 'Stuffed Cheese (+Rp 15rb)', val: 'Stuffed Crust', price: 15000 }
        ]
      },
      {
        id: 'spicy',
        title: 'Tingkat Kepedasan',
        type: 'radio',
        defaultIdx: 0,
        options: [
          { label: 'Tidak Pedas', val: 'Non-Spicy', price: 0 },
          { label: 'Sedang (Mild)', val: 'Mild Spicy', price: 0 },
          { label: 'Ekstra Pedas (+Chili)', val: 'Extra Spicy', price: 0 }
        ]
      },
      {
        id: 'addons',
        title: 'Ekstra Topping Pizza (Opsional)',
        type: 'checkbox',
        options: [
          { name: 'Ekstra Mozzarella Cheese', price: 10000 },
          { name: 'Ekstra Beef Pepperoni', price: 12000 },
          { name: 'Ekstra Jamur Champignon', price: 6000 },
          { name: 'Dipping Sauce Garlic Mayo', price: 4000 }
        ]
      }
    ],
    'makanan': [
      {
        id: 'carb',
        title: 'Pilihan Karbo / Nasi',
        type: 'radio',
        defaultIdx: 0,
        options: [
          { label: 'Nasi Putih', val: 'Nasi Putih', price: 0 },
          { label: 'Nasi Butter (+Rp 5rb)', val: 'Nasi Butter', price: 5000 },
          { label: 'French Fries (+Rp 8rb)', val: 'French Fries', price: 8000 }
        ]
      },
      {
        id: 'spicy',
        title: 'Tingkat Kepedasan',
        type: 'radio',
        defaultIdx: 1,
        options: [
          { label: 'Tidak Pedas', val: 'Tidak Pedas', price: 0 },
          { label: 'Sedang (Mild)', val: 'Pedas Sedang', price: 0 },
          { label: 'Pedas Gurih', val: 'Pedas Gurih', price: 0 }
        ]
      },
      {
        id: 'addons',
        title: 'Topping Tambahan (Opsional)',
        type: 'checkbox',
        options: [
          { name: 'Telur Mata Sapi (Sunny Side)', price: 5000 },
          { name: 'Ekstra Daging / Ayam', price: 12000 },
          { name: 'Sambal Bawang Spesial', price: 4000 },
          { name: 'Kerupuk Renyah', price: 3000 }
        ]
      }
    ],
    'pastry': [
      {
        id: 'serving',
        title: 'Pilihan Penyajian',
        type: 'radio',
        defaultIdx: 0,
        options: [
          { label: 'Suhu Ruang', val: 'Suhu Ruang', price: 0 },
          { label: 'Hangatkan (Warmed)', val: 'Hangatkan (Warmed)', price: 0 }
        ]
      },
      {
        id: 'addons',
        title: 'Topping & Pelengkap (Opsional)',
        type: 'checkbox',
        options: [
          { name: '1 Scoop Vanilla Ice Cream', price: 8000 },
          { name: 'Belgian Chocolate Drizzle', price: 5000 },
          { name: 'Whipped Cream', price: 4000 }
        ]
      }
    ],
    'cemilan': [
      {
        id: 'sauce',
        title: 'Pilihan Saus Cocolan (Dip)',
        type: 'radio',
        defaultIdx: 0,
        options: [
          { label: 'Garlic Mayo', val: 'Garlic Mayo Dip', price: 0 },
          { label: 'BBQ Spicy', val: 'BBQ Spicy Dip', price: 0 },
          { label: 'Tartar Sauce', val: 'Tartar Dip', price: 0 }
        ]
      },
      {
        id: 'addons',
        title: 'Ekstra Bumbu & Saus',
        type: 'checkbox',
        options: [
          { name: 'Cheese Melt Sauce Dip', price: 4000 },
          { name: 'Truffle Oil Drizzle', price: 6000 },
          { name: 'Ekstra Keju Parmesan Parut', price: 5000 }
        ]
      }
    ]
  };

  // --- MODIFIER / PRODUCT CUSTOMIZER ENGINE ---
  let activeCustomizer = {
    item: null,
    options: {},
    addons: [],
    note: '',
    qty: 1
  };

  function openModifierModal(item) {
    if (!item) return;
    playHaptic('tap');
    activeCustomizer.item = item;
    activeCustomizer.options = {};
    activeCustomizer.addons = [];
    activeCustomizer.note = '';
    activeCustomizer.qty = 1;

    const img = document.getElementById('modProductImg');
    const title = document.getElementById('modProductTitle');
    const desc = document.getElementById('modProductDesc');
    const basePrice = document.getElementById('modProductBasePrice');
    const qtyText = document.getElementById('modQtyNumber');
    const noteInput = document.getElementById('modSpecialNote');
    const groupsContainer = document.getElementById('modDynamicGroups');

    if (img) {
      img.classList.remove('loaded');
      img.src = item.image;
      if (img.complete) {
        img.classList.add('loaded');
      } else {
        img.onload = () => img.classList.add('loaded');
        img.onerror = () => img.classList.add('loaded');
      }
    }
    if (title) title.textContent = item.name;
    if (desc) desc.textContent = item.desc;
    if (basePrice) basePrice.textContent = formatRupiah(item.price);
    if (qtyText) qtyText.textContent = '1';
    if (noteInput) noteInput.value = '';

    // Dynamically render category-specific options
    if (groupsContainer) {
      groupsContainer.innerHTML = '';
      const categoryKey = item.category in MODIFIERS_BY_CATEGORY ? item.category : 'kopi';
      const groups = MODIFIERS_BY_CATEGORY[categoryKey] || [];

      groups.forEach(grp => {
        const groupEl = document.createElement('div');
        groupEl.className = 'modifier-group';

        const titleEl = document.createElement('div');
        titleEl.className = 'mod-group-title';
        titleEl.textContent = grp.title;
        groupEl.appendChild(titleEl);

        if (grp.type === 'radio') {
          const pillGrid = document.createElement('div');
          pillGrid.className = 'modifier-pill-grid';

          // Set default option
          const defaultOpt = grp.options[grp.defaultIdx || 0] || grp.options[0];
          activeCustomizer.options[grp.id] = { ...defaultOpt };

          grp.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = `mod-pill-opt ${(idx === (grp.defaultIdx || 0)) ? 'active' : ''}`;
            btn.textContent = opt.label;
            btn.dataset.groupId = grp.id;
            btn.dataset.optIdx = idx;

            btn.addEventListener('click', () => {
              playHaptic('tap');
              pillGrid.querySelectorAll('.mod-pill-opt').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              activeCustomizer.options[grp.id] = { ...opt };
              recalcModifierPrice();
            });

            pillGrid.appendChild(btn);
          });
          groupEl.appendChild(pillGrid);
        } else if (grp.type === 'checkbox') {
          const addonList = document.createElement('div');
          addonList.className = 'mod-addons-list';

          grp.options.forEach(ad => {
            const label = document.createElement('label');
            label.className = 'mod-addon-row';
            label.innerHTML = `
              <div class="mod-addon-left">
                <input type="checkbox" class="mod-addon-check" data-name="${ad.name}" data-price="${ad.price}" />
                <span>${ad.name}</span>
              </div>
              <span class="mod-addon-price">+${formatRupiah(ad.price)}</span>
            `;

            const chk = label.querySelector('.mod-addon-check');
            chk.addEventListener('change', () => {
              playHaptic('tap');
              if (chk.checked) {
                activeCustomizer.addons.push({ name: ad.name, price: ad.price });
              } else {
                activeCustomizer.addons = activeCustomizer.addons.filter(a => a.name !== ad.name);
              }
              recalcModifierPrice();
            });

            addonList.appendChild(label);
          });
          groupEl.appendChild(addonList);
        }

        groupsContainer.appendChild(groupEl);
      });
    }

    recalcModifierPrice();
    const sheet = document.getElementById('modifierModalBackdrop');
    if (sheet) openAccessibleModal(sheet);
  }

  function closeModifierModal() {
    const sheet = document.getElementById('modifierModalBackdrop');
    if (sheet) closeAccessibleModal(sheet);
  }

  function recalcModifierPrice() {
    if (!activeCustomizer.item) return;
    let unitPrice = activeCustomizer.item.price;

    // Add radio option surcharges
    Object.values(activeCustomizer.options).forEach(opt => {
      if (opt && opt.price) unitPrice += opt.price;
    });

    // Add checkbox addon surcharges
    activeCustomizer.addons.forEach(ad => {
      unitPrice += ad.price;
    });

    const total = unitPrice * activeCustomizer.qty;
    const btnText = document.getElementById('modBtnAddText');
    if (btnText) btnText.textContent = `Tambahkan — ${formatRupiah(total)}`;
  }

  function addCustomizedItemToCart() {
    if (!activeCustomizer.item) return;
    playHaptic('medium');
    
    let unitPrice = activeCustomizer.item.price;
    const modifierNotes = [];

    // Radio options notes
    Object.values(activeCustomizer.options).forEach(opt => {
      if (opt) {
        if (opt.price) unitPrice += opt.price;
        if (opt.val) modifierNotes.push(opt.val);
      }
    });

    // Addon checkboxes
    activeCustomizer.addons.forEach(ad => {
      unitPrice += ad.price;
      modifierNotes.push(`+${ad.name}`);
    });

    // Special note
    if (activeCustomizer.note && activeCustomizer.note.trim()) {
      modifierNotes.push(`"${activeCustomizer.note.trim()}"`);
    }

    state.cart.push({
      id: 'c_' + Date.now() + Math.random().toString(36).substr(2, 4),
      menuId: activeCustomizer.item.id,
      name: activeCustomizer.item.name,
      price: unitPrice,
      qty: activeCustomizer.qty,
      image: activeCustomizer.item.image,
      subtext: modifierNotes.join(', ') || 'Standar',
      modifiers: [...activeCustomizer.addons]
    });

    renderCartSheetItems();
    updateCartBadgesAndTotals();
    closeModifierModal();
    showToast(`${activeCustomizer.item.name} (${activeCustomizer.qty}x) ditambahkan`);
  }



  // --- INITIALIZATION & EVENT BINDINGS ---
  function init() {
    renderMenuCatalog();
    renderCartSheetItems();
    renderKDS();
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('lang')) {
      state.selectedLang = urlParams.get('lang') === 'en' ? 'en-US' : (urlParams.get('lang') === 'ms' ? 'ms-BN' : 'id-ID');
      localStorage.setItem('aiodma_user_lang', state.selectedLang);
    }
    
    window.addEventListener('hashchange', handleHashRoute);
    if (window.location.hash && window.location.hash !== '#language') {
      handleHashRoute();
    } else if (urlParams.get('lang') || localStorage.getItem('aiodma_user_lang')) {
      state.selectedLang = localStorage.getItem('aiodma_user_lang') || 'id-ID';
      switchToMode('chat');
    } else {
      showScreen('screenSelectLanguage');
    }

    // 1. Language Cards Onboarding
    document.querySelectorAll('.lang-card-pill').forEach(card => {
      card.addEventListener('click', () => {
        state.selectedLang = card.dataset.lang;
        localStorage.setItem('aiodma_user_lang', state.selectedLang);
        playHaptic('tap');
        // Smooth spring transition to Main Chat
        switchToMode('chat');
      });
    });

    // 2. Navigation & Header
    const btnHeaderBack = document.getElementById('btnHeaderBack');
    if (btnHeaderBack) {
      btnHeaderBack.addEventListener('click', () => {
        if (state.currentScreen === 'screenMenuCatalog') {
          switchToMode('chat');
        } else if (state.currentScreen === 'screenThermalReceipt' || state.currentScreen === 'screenOrderSuccess') {
          switchToMode('chat');
        } else {
          showScreen('screenSelectLanguage');
        }
      });
    }

    const btnLangBack = document.getElementById('btnLangBack');
    if (btnLangBack) {
      btnLangBack.addEventListener('click', () => {
        playHaptic('tap');
        switchToMode('chat');
      });
    }

    // Mode Trigger & Dropdown
    const btnModeTrigger = document.getElementById('btnModeTrigger');
    const modeDropdown = document.getElementById('modeDropdownMenu');
    if (btnModeTrigger && modeDropdown) {
      btnModeTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        playHaptic('tap');
        modeDropdown.classList.toggle('open');
        document.getElementById('actionPopupMenu')?.classList.remove('open');
      });
    }

    document.getElementById('optModeChat')?.addEventListener('click', () => {
      switchToMode('chat');
    });

    document.getElementById('optModeMenu')?.addEventListener('click', () => {
      switchToMode('menu');
    });

    // Header Ellipsis Menu
    const btnHeaderOptions = document.getElementById('btnHeaderOptions');
    const actionPopup = document.getElementById('actionPopupMenu');
    if (btnHeaderOptions && actionPopup) {
      btnHeaderOptions.addEventListener('click', (e) => {
        e.stopPropagation();
        playHaptic('tap');
        actionPopup.classList.toggle('open');
        modeDropdown?.classList.remove('open');
      });
    }

    // --- THEME MANAGEMENT (Apple Dark Mode & Liquid Glass) ---
    function initTheme() {
      const savedTheme = localStorage.getItem('aiodma_theme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
      applyTheme(isDark);

      const btnHeaderTheme = document.getElementById('btnHeaderThemeToggle');
      const btnLangTheme = document.getElementById('btnLangThemeToggle');
      const menuItemTheme = document.getElementById('menuItemToggleTheme');

      const handleToggle = () => {
        playHaptic('tap');
        const currentlyDark = document.body.classList.contains('dark-mode');
        applyTheme(!currentlyDark);
      };

      if (btnHeaderTheme) btnHeaderTheme.addEventListener('click', handleToggle);
      if (btnLangTheme) btnLangTheme.addEventListener('click', handleToggle);
      if (menuItemTheme) menuItemTheme.addEventListener('click', () => {
        closeAllPopups();
        handleToggle();
      });
    }

    function applyTheme(isDark) {
      if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.classList.add('dark-mode');
        localStorage.setItem('aiodma_theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        document.body.classList.remove('dark-mode');
        localStorage.setItem('aiodma_theme', 'light');
      }

      // Update iOS Safari / Chrome theme-color meta tag
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', isDark ? '#000000' : '#FFFFFF');
      }

      const headerDark = document.getElementById('headerThemeIconDark');
      const headerLight = document.getElementById('headerThemeIconLight');
      const langDark = document.getElementById('langThemeIconDark');
      const langLight = document.getElementById('langThemeIconLight');
      const themeLabel = document.getElementById('themeMenuLabel');

      if (headerDark && headerLight) {
        headerDark.style.display = isDark ? 'none' : 'block';
        headerLight.style.display = isDark ? 'block' : 'none';
      }
      if (langDark && langLight) {
        langDark.style.display = isDark ? 'none' : 'block';
        langLight.style.display = isDark ? 'block' : 'none';
      }
      if (themeLabel) {
        themeLabel.textContent = isDark ? 'Mode Terang (Light Mode)' : 'Mode Gelap (Dark Mode)';
      }
    }

    // Action Items
    const tableInfoBackdrop = document.getElementById('tableInfoBackdrop');
    const btnCloseTableInfo = document.getElementById('btnCloseTableInfo');

    document.getElementById('menuItemTableStatus')?.addEventListener('click', () => {
      closeAllPopups();
      if (tableInfoBackdrop) openAccessibleModal(tableInfoBackdrop);
    });

    if (btnCloseTableInfo && tableInfoBackdrop) {
      btnCloseTableInfo.addEventListener('click', () => {
        playHaptic('tap');
        closeAccessibleModal(tableInfoBackdrop);
      });
    }

    if (tableInfoBackdrop) {
      tableInfoBackdrop.addEventListener('click', (e) => {
        if (e.target === tableInfoBackdrop) closeAccessibleModal(tableInfoBackdrop);
      });
    }

    // Global Outside Click to Close Popups
    document.addEventListener('click', (e) => {
      const modeDropdown = document.getElementById('modeDropdownMenu');
      const actionPopup = document.getElementById('actionPopupMenu');
      const btnModeTrigger = document.getElementById('btnModeTrigger');
      const btnHeaderOptions = document.getElementById('btnHeaderOptions');

      if (!modeDropdown?.contains(e.target) && !btnModeTrigger?.contains(e.target) &&
          !actionPopup?.contains(e.target) && !btnHeaderOptions?.contains(e.target)) {
        closeAllPopups();
      }
    });

    document.getElementById('menuItemCallWaiter')?.addEventListener('click', async () => {
      closeAllPopups();
      playHaptic('success');
      showToast(`Pelayan telah dipanggil ke Meja ${state.tableId || 5}. Staf segera menuju meja Anda.`);
      try {
        await fetch('/api/waiter/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: `Meja ${state.tableId || 5}`,
            reason: 'Bantuan Pelayan di Meja'
          })
        });
      } catch (e) {
        console.warn('Call waiter network error:', e);
      }
    });

    // Close Modals
    document.getElementById('btnCloseTableInfo')?.addEventListener('click', () => {
      document.getElementById('tableInfoBackdrop')?.classList.remove('open');
    });

    // Modifier Customizer Modal Backdrop Click & Notes
    document.getElementById('modifierModalBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'modifierModalBackdrop') closeModifierModal();
    });

    document.getElementById('modSpecialNote')?.addEventListener('input', (e) => {
      activeCustomizer.note = e.target.value;
    });

    document.getElementById('btnModMinus')?.addEventListener('click', () => {
      if (activeCustomizer.qty > 1) {
        playHaptic('rigid');
        activeCustomizer.qty -= 1;
        document.getElementById('modQtyNumber').textContent = activeCustomizer.qty;
        recalcModifierPrice();
      }
    });

    document.getElementById('btnModPlus')?.addEventListener('click', () => {
      playHaptic('rigid');
      activeCustomizer.qty += 1;
      document.getElementById('modQtyNumber').textContent = activeCustomizer.qty;
      recalcModifierPrice();
    });

    document.getElementById('btnAddCustomizedToCart')?.addEventListener('click', () => {
      addCustomizedItemToCart();
    });

    document.getElementById('modifierModalBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'modifierModalBackdrop') closeModifierModal();
    });

    // 3. Dynamic Island vs Live Activity Hardware Capability Detection
    function isDynamicIslandDevice() {
      // URL Parameter override for testing (?dynamic=1 / ?dynamic=0 or ?di=1 / ?di=0)
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('dynamic') === '1' || urlParams.get('di') === '1') return true;
      if (urlParams.get('dynamic') === '0' || urlParams.get('di') === '0') return false;

      // Screen Dimension & iOS Detection (iPhone 14 Pro, 15 series, 16 series)
      const w = window.screen.width;
      const h = window.screen.height;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      const isDynamicScreen = (
        (w === 393 && h === 852) || (w === 852 && h === 393) ||
        (w === 430 && h === 932) || (w === 932 && h === 430) ||
        (w === 402 && h === 874) || (w === 874 && h === 402) ||
        (w === 440 && h === 956) || (w === 956 && h === 440)
      );

      return isIOS && isDynamicScreen;
    }

    function renderOrderTrackingUI(order, status = 'received', isDismissed = false) {
      const liveBanner = document.getElementById('liveOrderActivityBanner');
      const headerOrdersBtn = document.getElementById('btnHeaderLiveOrders');
      const headerBadge = document.getElementById('headerOrdersBadge');

      const tableText = `Meja ${order?.tableNum || state.tableId || 5}`;
      const orderNum = order?.orderNumber || state.orderId || '#5K9DU';
      const items = order?.items || [];
      const totalVal = order?.total || 0;

      let statusLabel = 'Diterima';
      let iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>';
      let subDesc = 'Pesanan diterima & masuk antrean dapur';

      if (status === 'preparing') {
        statusLabel = 'Sedang Diracik';
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>';
        subDesc = 'Sedang diracik oleh Barista di dapur';
      } else if (status === 'ready') {
        statusLabel = 'Siap Disajikan';
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
        subDesc = 'Siap disajikan! Tunggu pelayan / ambil di bar';
      } else if (status === 'completed') {
        statusLabel = 'Selesai';
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
        subDesc = 'Pesanan selesai dinikmati. Terima kasih!';
      }

      // 1. Update 3-Dot Action Item (Always active when order exists)
      const menuItemOpenTracker = document.getElementById('menuItemOpenTracker');
      if (menuItemOpenTracker) {
        if (status === 'completed' || status === 'cancelled') {
          menuItemOpenTracker.style.display = 'none';
        } else {
          menuItemOpenTracker.style.display = 'flex';
          const textSpan = menuItemOpenTracker.querySelector('span');
          if (textSpan) textSpan.textContent = `Lacak Pesanan Saya (${orderNum})`;
        }
      }

      // 2. Update Live Activity Floating Banner (respect manual dismissal)
      if (liveBanner) {
        if (status === 'completed') {
          // Show completed briefly, then slide up into notch and disappear
          const bannerTitle = document.getElementById('activityBannerTitle');
          const bannerSub = document.getElementById('activityBannerSub');
          const bannerBadge = document.getElementById('activityBannerBadge');
          const bannerIcon = document.getElementById('activityBannerIcon');

          if (bannerTitle) bannerTitle.textContent = `${tableText} • Order ${orderNum}`;
          if (bannerSub) bannerSub.textContent = subDesc;
          if (bannerIcon) bannerIcon.innerHTML = iconSvg;
          if (bannerBadge) {
            bannerBadge.textContent = statusLabel;
            bannerBadge.className = 'activity-status-pill ' + status;
          }

          clearTimeout(window._orderDismissTimer);
          window._orderDismissTimer = setTimeout(() => {
            liveBanner.classList.add('dismissing');
            setTimeout(() => {
              liveBanner.style.display = 'none';
              liveBanner.classList.remove('dismissing');
              try { localStorage.removeItem('aiodma_my_order'); } catch(e) {}
              if (menuItemOpenTracker) menuItemOpenTracker.style.display = 'none';
            }, 520);
          }, 3500);
        } else if (isDismissed) {
          liveBanner.style.display = 'none';
        } else {
          liveBanner.classList.remove('dismissing');
          liveBanner.style.display = 'block';
          const bannerTitle = document.getElementById('activityBannerTitle');
          const bannerSub = document.getElementById('activityBannerSub');
          const bannerBadge = document.getElementById('activityBannerBadge');
          const bannerIcon = document.getElementById('activityBannerIcon');

          if (bannerTitle) bannerTitle.textContent = `${tableText} • Order ${orderNum}`;
          if (bannerSub) bannerSub.textContent = subDesc;
          if (bannerIcon) bannerIcon.innerHTML = iconSvg;
          if (bannerBadge) {
            bannerBadge.textContent = statusLabel;
            bannerBadge.className = 'activity-status-pill ' + status;
          }
        }
      }

      // 2. Update Tracker Sheet Header & Status
      const trackerLabel = document.getElementById('trackerOrderNumberLabel');
      const trackerStatusBadge = document.getElementById('trackerStatusBadge');
      const trackerHeaderIcon = document.getElementById('trackerHeaderIcon');
      const trackerPayLabel = document.getElementById('trackerPaymentStatusLabel');
      const trackerTotal = document.getElementById('trackerOrderTotalVal');

      if (trackerLabel) trackerLabel.textContent = `Order ${orderNum} • ${tableText}`;
      if (trackerHeaderIcon) trackerHeaderIcon.innerHTML = iconSvg;
      if (trackerStatusBadge) {
        trackerStatusBadge.textContent = statusLabel;
        trackerStatusBadge.className = 'tracker-status-pill ' + status;
      }
      if (trackerPayLabel) {
        trackerPayLabel.textContent = `${order?.paymentStatus || 'LUNAS'} • ${order?.paymentMethod || 'BIBD'}`;
      }
      if (trackerTotal) {
        trackerTotal.textContent = totalVal > 0 ? formatRupiah(totalVal) : (state.cart ? formatRupiah(getCartTotal()) : 'Rp 0');
      }

      // 4. Update 4-Step Interactive Timeline
      const stepRec = document.getElementById('trackerStepReceived');
      const stepPrep = document.getElementById('trackerStepPreparing');
      const stepRdy = document.getElementById('trackerStepReady');
      const stepComp = document.getElementById('trackerStepCompleted');

      if (stepRec) stepRec.className = 'tracker-step-item';
      if (stepPrep) stepPrep.className = 'tracker-step-item';
      if (stepRdy) stepRdy.className = 'tracker-step-item';
      if (stepComp) stepComp.className = 'tracker-step-item';

      if (status === 'received') {
        if (stepRec) stepRec.classList.add('active');
      } else if (status === 'preparing') {
        if (stepRec) stepRec.classList.add('active');
        if (stepPrep) stepPrep.classList.add('active');
      } else if (status === 'ready') {
        if (stepRec) stepRec.classList.add('active');
        if (stepPrep) stepPrep.classList.add('active');
        if (stepRdy) stepRdy.classList.add('active');
      } else if (status === 'completed') {
        if (stepRec) stepRec.classList.add('active');
        if (stepPrep) stepPrep.classList.add('active');
        if (stepRdy) stepRdy.classList.add('active');
        if (stepComp) stepComp.classList.add('active');
      }

      // 5. Populate Items Breakdown in Tracker Sheet
      const itemsList = document.getElementById('trackerItemsList');
      if (itemsList) {
        itemsList.innerHTML = '';
        const displayItems = items.length > 0 ? items : state.cart;
        if (displayItems && displayItems.length > 0) {
          displayItems.forEach(it => {
            const row = document.createElement('div');
            row.className = 'tracker-item-row';
            const sub = it.subtext ? `<div style="font-size: 11px; color: #64748B;">${it.subtext}</div>` : '';
            row.innerHTML = `
              <div>
                <strong>${it.qty || 1}x ${it.name}</strong>
                ${sub}
              </div>
              <span style="font-weight: 600;">${formatRupiah((it.price || 25000) * (it.qty || 1))}</span>
            `;
            itemsList.appendChild(row);
          });
        } else {
          itemsList.innerHTML = '<div style="color: #64748B; font-size: 12px; text-align: center; padding: 6px 0;">Menu sedang diracik di bar.</div>';
        }
      }
    }

    // Connect Order Tracker Action Buttons
    const btnHeaderLiveOrders = document.getElementById('btnHeaderLiveOrders');
    const btnBannerTracker = document.getElementById('btnOpenOrderTrackerFromBanner');
    const menuItemOpenTracker = document.getElementById('menuItemOpenTracker');
    const btnCloseTrackerSheet = document.getElementById('btnCloseTrackerSheet');
    const btnTrackerCallWaiter = document.getElementById('btnTrackerCallWaiter');
    const btnTrackerOrderMore = document.getElementById('btnTrackerOrderMore');
    const trackerBackdrop = document.getElementById('orderTrackerBackdrop');

    function openLiveOrderTracker() {
      if (trackerBackdrop) {
        playHaptic('medium');
        openAccessibleModal(trackerBackdrop);
      }
    }

    if (btnHeaderLiveOrders) btnHeaderLiveOrders.addEventListener('click', openLiveOrderTracker);
    if (menuItemOpenTracker) menuItemOpenTracker.addEventListener('click', openLiveOrderTracker);

    // Setup Native iOS Swipe-to-Dismiss Gesture System on Dynamic Island Banner
    if (btnBannerTracker) {
      let startX = 0, startY = 0, currentX = 0, currentY = 0;
      let isDragging = false;
      const liveBanner = document.getElementById('liveOrderActivityBanner');

      function onTouchStart(e) {
        const touch = e.touches ? e.touches[0] : e;
        startX = touch.clientX;
        startY = touch.clientY;
        currentX = startX;
        currentY = startY;
        isDragging = true;
        btnBannerTracker.style.transition = 'none';
      }

      function onTouchMove(e) {
        if (!isDragging) return;
        const touch = e.touches ? e.touches[0] : e;
        currentX = touch.clientX;
        currentY = touch.clientY;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        // Visual drag feedback with spring resistance
        if (deltaY < 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
          // Dragging upwards towards notch
          btnBannerTracker.style.transform = `translateY(${deltaY * 0.7}px) scale(${Math.max(0.75, 1 + deltaY / 300)})`;
          btnBannerTracker.style.opacity = `${Math.max(0.3, 1 + deltaY / 120)}`;
        } else if (Math.abs(deltaX) > 10) {
          // Dragging left or right
          btnBannerTracker.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.04}deg)`;
          btnBannerTracker.style.opacity = `${Math.max(0.3, 1 - Math.abs(deltaX) / 200)}`;
        }
      }

      function onTouchEnd() {
        if (!isDragging) return;
        isDragging = false;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        if (deltaY < -35) {
          // Swipe Up -> Dismiss into notch
          playHaptic('light');
          try { sessionStorage.setItem('aiodma_dismissed_banner_' + (state.orderId || 'current'), 'true'); } catch(e) {}
          if (liveBanner) {
            liveBanner.classList.add('dismissing-up');
            setTimeout(() => {
              liveBanner.style.display = 'none';
              liveBanner.classList.remove('dismissing-up');
              btnBannerTracker.style.transform = '';
              btnBannerTracker.style.opacity = '';
            }, 380);
          }
        } else if (deltaX < -45) {
          // Swipe Left -> Dismiss to left
          playHaptic('light');
          try { sessionStorage.setItem('aiodma_dismissed_banner_' + (state.orderId || 'current'), 'true'); } catch(e) {}
          if (liveBanner) {
            liveBanner.classList.add('dismissing-left');
            setTimeout(() => {
              liveBanner.style.display = 'none';
              liveBanner.classList.remove('dismissing-left');
              btnBannerTracker.style.transform = '';
              btnBannerTracker.style.opacity = '';
            }, 350);
          }
        } else if (deltaX > 45) {
          // Swipe Right -> Dismiss to right
          playHaptic('light');
          try { sessionStorage.setItem('aiodma_dismissed_banner_' + (state.orderId || 'current'), 'true'); } catch(e) {}
          if (liveBanner) {
            liveBanner.classList.add('dismissing-right');
            setTimeout(() => {
              liveBanner.style.display = 'none';
              liveBanner.classList.remove('dismissing-right');
              btnBannerTracker.style.transform = '';
              btnBannerTracker.style.opacity = '';
            }, 350);
          }
        } else {
          // Snap back with spring
          btnBannerTracker.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease';
          btnBannerTracker.style.transform = '';
          btnBannerTracker.style.opacity = '';

          // If minimal movement (< 8px), treat as tap to open sheet
          if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) {
            openLiveOrderTracker();
          }
        }
      }

      btnBannerTracker.addEventListener('touchstart', onTouchStart, { passive: true });
      btnBannerTracker.addEventListener('touchmove', onTouchMove, { passive: true });
      btnBannerTracker.addEventListener('touchend', onTouchEnd);

      btnBannerTracker.addEventListener('mousedown', onTouchStart);
      window.addEventListener('mousemove', onTouchMove);
      window.addEventListener('mouseup', onTouchEnd);
    }

    if (btnCloseTrackerSheet) {
      btnCloseTrackerSheet.addEventListener('click', () => {
        playHaptic('tap');
        if (trackerBackdrop) trackerBackdrop.classList.remove('open');
      });
    }

    if (btnTrackerCallWaiter) {
      btnTrackerCallWaiter.addEventListener('click', () => {
        playHaptic('success');
        showToast('Pelayan sedang menuju ke Meja 5.');
        fetch('/api/waiter/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: 'Meja 5', reason: 'Bantuan dari Pelacak Pesanan' })
        }).catch(() => {});
      });
    }

    if (btnTrackerOrderMore) {
      btnTrackerOrderMore.addEventListener('click', () => {
        playHaptic('tap');
        if (trackerBackdrop) trackerBackdrop.classList.remove('open');
        switchToMode('menu');
      });
    }

    // Dynamic Island Expand/Collapse
    const dynamicIsland = document.getElementById('dynamicIsland');
    if (dynamicIsland) {
      dynamicIsland.addEventListener('click', () => {
        playHaptic('tap');
        dynamicIsland.classList.toggle('expanded');
      });
    }

    // 4. Quick Prompts in Empty Chat
    document.querySelectorAll('.quick-prompt-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const text = pill.dataset.prompt;
        if (text === 'Lihat semua menu' || pill.id === 'qpLihatSemuaMenu') {
          switchToMode('menu');
        } else {
          triggerAIResponse(text);
        }
      });
    });

    // 5. Chat Input & Send Button Toggle
    const chatInput = document.getElementById('chatInputText');
    const btnChatSend = document.getElementById('btnChatSend');
    const btnFloatingCart = document.getElementById('btnFloatingCart');

    if (chatInput) {
      chatInput.addEventListener('input', () => {
        if (chatInput.value.trim().length > 0) {
          btnChatSend.style.display = 'flex';
          btnFloatingCart.style.display = 'none';
        } else {
          btnChatSend.style.display = 'none';
          btnFloatingCart.style.display = 'flex';
        }
      });

      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim().length > 0) {
          const text = chatInput.value.trim();
          chatInput.value = '';
          btnChatSend.style.display = 'none';
          btnFloatingCart.style.display = 'flex';
          triggerAIResponse(text);
        }
      });
    }

    if (btnChatSend) {
      btnChatSend.addEventListener('click', () => {
        if (chatInput && chatInput.value.trim().length > 0) {
          const text = chatInput.value.trim();
          chatInput.value = '';
          btnChatSend.style.display = 'none';
          btnFloatingCart.style.display = 'flex';
          triggerAIResponse(text);
        }
      });
    }

    if (btnFloatingCart) {
      btnFloatingCart.addEventListener('click', () => {
        openCartSheet();
      });
    }

    // 6. Category Filter Pills
    document.querySelectorAll('.cat-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        playHaptic('tap');
        document.querySelectorAll('.cat-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeCategory = btn.dataset.cat;
        renderMenuCatalog();
      });
    });

    // 7. Catalog Floating Cart Pill
    document.getElementById('btnCatalogCartPill')?.addEventListener('click', () => {
      openCartSheet();
    });

    // 8. Cart Sheet Backdrops & Checkout
    document.getElementById('cartBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'cartBackdrop') closeCartSheet();
    });
    document.getElementById('btnProceedToPayment')?.addEventListener('click', () => {
      openPaymentSheet();
    });

    // 9. Payment Sheet Backdrops & Methods
    document.getElementById('paymentBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'paymentBackdrop') closePaymentSheet();
    });

    document.querySelectorAll('.payment-method-card').forEach(pmCard => {
      pmCard.addEventListener('click', () => {
        playHaptic('tap');
        document.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('selected'));
        pmCard.classList.add('selected');
        state.selectedPaymentMethod = pmCard.dataset.pm;
        const receiptPm = document.getElementById('receiptPaymentName');
        if (receiptPm) receiptPm.textContent = state.selectedPaymentMethod;
      });
    });

    document.getElementById('btnProcessPayment')?.addEventListener('click', () => {
      startPaymentProcessing();
    });

    // 10. Order Success Actions
    function openOrderTrackerSheet() {
      const backdrop = document.getElementById('orderTrackerBackdrop');
      const orderNumLabel = document.getElementById('trackerOrderNumberLabel');
      const itemsList = document.getElementById('trackerItemsList');
      const statusBadge = document.getElementById('trackerStatusBadge');

      const activeOrderNum = state.lastPlacedOrder?.orderNumber || state.orderId || '#5K0IZ';
      const activeTableNum = state.lastPlacedOrder?.tableNum || state.tableId || 5;

      if (orderNumLabel) {
        orderNumLabel.textContent = `Order ${activeOrderNum} • Meja ${activeTableNum}`;
      }

      if (itemsList) {
        const items = state.lastPlacedOrder?.items || state.cart || [];
        if (items.length > 0) {
          itemsList.innerHTML = items.map(i => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px dashed rgba(0,0,0,0.06);">
              <div>
                <strong style="color: #111;">${i.qty}x ${i.name}</strong>
                ${i.subtext ? `<div style="font-size: 11px; color: #8E8E93;">${i.subtext}</div>` : ''}
              </div>
              <div style="font-weight: 700; color: #382115;">${formatRupiah(i.price * i.qty)}</div>
            </div>
          `).join('');
        } else {
          itemsList.innerHTML = `<div style="color: #8E8E93; text-align: center; padding: 6px;">Pesanan sedang diproses di antrean dapur.</div>`;
        }
      }

      // Re-sync timeline step state
      const currentStatus = state.lastPlacedOrder?.status || 'received';
      const stepRec = document.getElementById('trackerStepReceived');
      const stepPrep = document.getElementById('trackerStepPreparing');
      const stepRdy = document.getElementById('trackerStepReady');

      if (currentStatus === 'preparing') {
        if (trackerStatusBadge) { trackerStatusBadge.textContent = 'Sedang Diracik'; trackerStatusBadge.style.background = '#FEF3C7'; trackerStatusBadge.style.color = '#B45309'; }
        if (stepRec) stepRec.className = 'tracker-step-item active';
        if (stepPrep) stepPrep.className = 'tracker-step-item current';
        if (stepRdy) stepRdy.className = 'tracker-step-item pending';
      } else if (currentStatus === 'ready' || currentStatus === 'completed') {
        if (trackerStatusBadge) { trackerStatusBadge.textContent = 'Siap Disajikan'; trackerStatusBadge.style.background = '#ECFDF5'; trackerStatusBadge.style.color = '#059669'; }
        if (stepRec) stepRec.className = 'tracker-step-item active';
        if (stepPrep) stepPrep.className = 'tracker-step-item active';
        if (stepRdy) stepRdy.className = 'tracker-step-item current';
      } else {
        if (trackerStatusBadge) { trackerStatusBadge.textContent = 'Diterima'; trackerStatusBadge.style.background = '#ECFDF5'; trackerStatusBadge.style.color = '#059669'; }
        if (stepRec) stepRec.className = 'tracker-step-item current';
        if (stepPrep) stepPrep.className = 'tracker-step-item pending';
        if (stepRdy) stepRdy.className = 'tracker-step-item pending';
      }

      // Expand Dynamic Island if on Dynamic Island hardware
      if (dynamicIsland && isDynamicIslandDevice()) {
        dynamicIsland.classList.add('expanded');
      }

      if (backdrop) {
        openAccessibleModal(backdrop);
        backdrop.classList.add('active');
      }
    }

    function closeOrderTrackerSheet() {
      const backdrop = document.getElementById('orderTrackerBackdrop');
      if (backdrop) {
        closeAccessibleModal(backdrop);
      }
    }

    document.getElementById('btnTrackLiveOrder')?.addEventListener('click', () => {
      playHaptic('tap');
      openOrderTrackerSheet();
    });

    document.getElementById('btnOpenOrderTrackerFromBanner')?.addEventListener('click', () => {
      playHaptic('tap');
      openOrderTrackerSheet();
    });

    document.getElementById('btnCloseTrackerSheet')?.addEventListener('click', () => {
      playHaptic('tap');
      closeOrderTrackerSheet();
    });

    document.getElementById('orderTrackerBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'orderTrackerBackdrop') closeOrderTrackerSheet();
    });

    document.getElementById('btnSaveReceipt')?.addEventListener('click', () => {
      showScreen('screenThermalReceipt');
    });

    document.getElementById('btnBackToChat')?.addEventListener('click', () => {
      switchToMode('chat');
    });

    // 11. Thermal Receipt Print & Back
    document.getElementById('btnPrintReceipt')?.addEventListener('click', () => {
      playHaptic('success');
      window.print();
    });

    document.getElementById('btnReceiptBackToHome')?.addEventListener('click', () => {
      playHaptic('tap');
      switchToMode('chat');
    });

    // 11b. Mobile QR Modal
    const btnMobileQr = document.getElementById('btnMobileQr');
    const mobileQrBackdrop = document.getElementById('mobileQrBackdrop');
    const btnCloseMobileQr = document.getElementById('btnCloseMobileQr');

    if (btnMobileQr && mobileQrBackdrop) {
      btnMobileQr.addEventListener('click', () => {
        playHaptic('tap');
        openAccessibleModal(mobileQrBackdrop);
      });
    }

    if (btnCloseMobileQr && mobileQrBackdrop) {
      btnCloseMobileQr.addEventListener('click', () => {
        playHaptic('tap');
        closeAccessibleModal(mobileQrBackdrop);
      });
    }

    if (mobileQrBackdrop) {
      mobileQrBackdrop.addEventListener('click', (e) => {
        if (e.target === mobileQrBackdrop) closeAccessibleModal(mobileQrBackdrop);
      });
    }

    // 12. Device Switcher (iPhone vs iPad KDS vs Fullscreen)
    const btnPhone = document.getElementById('btnDevicePhone');
    const btniPad = document.getElementById('btnDeviceiPad');
    const btnToggleFullscreen = document.getElementById('btnToggleFullscreen');
    const phoneVp = document.getElementById('phoneViewport');
    const ipadVp = document.getElementById('ipadKdsViewport');

    if (btnPhone && btniPad && phoneVp && ipadVp) {
      btnPhone.addEventListener('click', () => {
        playHaptic('tap');
        btnPhone.classList.add('active');
        btniPad.classList.remove('active');
        if (btnToggleFullscreen) btnToggleFullscreen.classList.remove('active');
        phoneVp.classList.remove('fullscreen-mode');
        phoneVp.style.display = 'flex';
        ipadVp.style.display = 'none';
      });

      if (btnToggleFullscreen) {
        btnToggleFullscreen.addEventListener('click', () => {
          playHaptic('tap');
          btnPhone.classList.remove('active');
          btniPad.classList.remove('active');
          btnToggleFullscreen.classList.add('active');
          phoneVp.classList.add('fullscreen-mode');
          phoneVp.style.display = 'flex';
          ipadVp.style.display = 'none';
        });
      }

      btniPad.addEventListener('click', () => {
        playHaptic('tap');
        btniPad.classList.add('active');
        btnPhone.classList.remove('active');
        if (btnToggleFullscreen) btnToggleFullscreen.classList.remove('active');
        phoneVp.classList.remove('fullscreen-mode');
        phoneVp.style.display = 'none';
        ipadVp.style.display = 'flex';
      });
    }

    // 13. Sound Toggle
    const btnSound = document.getElementById('btnSoundToggle');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        btnSound.textContent = state.soundEnabled ? 'Haptic Sound: ON' : 'Haptic Sound: OFF';
        if (state.soundEnabled) playHaptic('tap');
      });
    }

    // 14. KDS Test Order Button
    document.getElementById('btnKdsTestOrder')?.addEventListener('click', () => {
      playHaptic('kitchen-chime');
      const sampleItems = [
        { name: 'Kopi Milk Aren 1', qty: 2, note: 'Normal Sugar' },
        { name: 'Matilda Cake', qty: 1, note: 'Plate' }
      ];
      state.kdsOrders.unshift({
        id: 'ORD-' + Math.floor(100 + Math.random() * 900),
        orderNumber: '#' + Math.random().toString(36).substring(2, 7).toUpperCase(),
        table: 'Meja ' + (Math.floor(Math.random() * 8) + 1),
        status: 'received',
        time: 'Baru saja',
        items: sampleItems,
        total: 74000
      });
      renderKDS();
    });

    // --- PHOTO ATTACHMENT & TANYA MENU CONTROLLER ---
    const btnChatImage = document.getElementById('btnChatNotes');
    const imageModal = document.getElementById('notesBackdrop');
    const fileInput = document.getElementById('chatImageFileInput');
    const uploadPlaceholder = document.getElementById('uploadPlaceholderWrap');
    const uploadPreviewWrap = document.getElementById('uploadSelectedPreview');
    const uploadPreviewImg = document.getElementById('uploadPreviewImg');
    const btnClearImage = document.getElementById('btnClearSelectedImage');
    const btnSendImage = document.getElementById('btnSendImageToChat');
    const sampleCards = document.querySelectorAll('.sample-photo-card');

    let currentSelectedImage = null;
    let currentSelectedMenuName = '';

    function setSelectedImage(src, name) {
      currentSelectedImage = src;
      currentSelectedMenuName = name || '';
      if (uploadPreviewImg) uploadPreviewImg.src = src;
      if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
      if (uploadPreviewWrap) uploadPreviewWrap.style.display = 'block';
      if (btnSendImage) {
        btnSendImage.disabled = false;
        btnSendImage.textContent = name ? `Tanya tentang "${name}"` : 'Tanya tentang Menu Ini';
      }
    }

    function clearSelectedImage() {
      currentSelectedImage = null;
      currentSelectedMenuName = '';
      if (fileInput) fileInput.value = '';
      if (uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
      if (uploadPreviewWrap) uploadPreviewWrap.style.display = 'none';
      if (btnSendImage) {
        btnSendImage.disabled = true;
        btnSendImage.textContent = 'Tanya tentang Menu Ini';
      }
      sampleCards.forEach(c => c.classList.remove('selected'));
    }

    if (btnChatImage && imageModal) {
      btnChatImage.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        playHaptic('tap');
        openAccessibleModal(imageModal);
      });
    }

    if (imageModal) {
      imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) closeAccessibleModal(imageModal);
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            setSelectedImage(evt.target.result, file.name.replace(/\.[^/.]+$/, ""));
            playHaptic('tap');
          };
          reader.readAsDataURL(file);
        }
      });
    }

    sampleCards.forEach(card => {
      card.addEventListener('click', () => {
        playHaptic('tap');
        sampleCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        setSelectedImage(card.dataset.src, card.dataset.name);
      });
      // Keyboard accessible selection
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          playHaptic('tap');
          sampleCards.forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          setSelectedImage(card.dataset.src, card.dataset.name);
        }
      });
    });

    if (btnClearImage) {
      btnClearImage.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        playHaptic('tap');
        clearSelectedImage();
      });
    }

    if (btnSendImage && imageModal) {
      btnSendImage.addEventListener('click', () => {
        if (!currentSelectedImage) return;
        playHaptic('success');
        const imgToSend = currentSelectedImage;
        const itemNameHint = currentSelectedMenuName;
        
        // Close bottom sheet
        closeAccessibleModal(imageModal);
        clearSelectedImage();

        // Send user image query to chat thread
        sendUserImageMessage(imgToSend, itemNameHint);
      });
    }

    // --- CATALOG SEARCH FUNCTIONALITY ---
    const searchInput = document.getElementById('catalogSearchInput');
    const btnClearSearch = document.getElementById('btnClearSearch');

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        state.searchQuery = searchInput.value.trim();
        if (btnClearSearch) {
          btnClearSearch.style.display = state.searchQuery.length > 0 ? 'block' : 'none';
        }
        renderMenuCatalog();
      });
    }

    if (btnClearSearch && searchInput) {
      btnClearSearch.addEventListener('click', () => {
        playHaptic('tap');
        searchInput.value = '';
        state.searchQuery = '';
        btnClearSearch.style.display = 'none';
        renderMenuCatalog();
      });
    }

    // Live iOS Clock In Status Bar
    function initIosClock() {
      const clockEl = document.getElementById('iosLiveTime');
      if (!clockEl) return;
      function update() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        clockEl.textContent = `${hours}:${mins}`;
      }
      update();
      setInterval(update, 10000);
    }
    initIosClock();

    // Universal Instagram / iOS Native Swipe-Down-To-Dismiss Engine
    function initSwipeToDismissBottomSheets() {
      const backdrops = document.querySelectorAll('.bottom-sheet-backdrop');
      backdrops.forEach(backdrop => {
        const card = backdrop.querySelector('.bottom-sheet-card');
        if (!card) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;
        let startTime = 0;

        // Tap outside backdrop to close
        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) {
            playHaptic('tap');
            backdrop.classList.remove('open');
          }
        });

        const dragHandle = card.querySelector('.sheet-drag-handle') || card;

        function onTouchStart(e) {
          if (card.scrollTop > 5) return;
          const touch = e.touches ? e.touches[0] : e;
          startY = touch.clientY;
          currentY = startY;
          startTime = Date.now();
          isDragging = true;
          card.style.transition = 'none';
        }

        function onTouchMove(e) {
          if (!isDragging) return;
          const touch = e.touches ? e.touches[0] : e;
          currentY = touch.clientY;
          const deltaY = currentY - startY;

          if (deltaY > 0) {
            if (e.cancelable) e.preventDefault();
            card.style.transform = `translateY(${deltaY}px)`;
            backdrop.style.opacity = Math.max(0, 1 - (deltaY / 380));
          }
        }

        function onTouchEnd() {
          if (!isDragging) return;
          isDragging = false;
          const deltaY = currentY - startY;
          const elapsed = Date.now() - startTime;
          const velocity = deltaY / Math.max(1, elapsed);

          card.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease';

          // Dismiss if dragged down > 80px or flicked down rapidly (velocity > 0.4)
          if (deltaY > 80 || (deltaY > 30 && velocity > 0.4)) {
            card.style.transform = 'translateY(100%)';
            backdrop.style.opacity = '0';
            setTimeout(() => {
              backdrop.classList.remove('open');
              card.style.transform = '';
              backdrop.style.opacity = '';
              card.style.transition = '';
            }, 280);
          } else {
            // Snap back smoothly
            card.style.transform = 'translateY(0)';
            backdrop.style.opacity = '1';
            setTimeout(() => {
              card.style.transform = '';
              backdrop.style.opacity = '';
              card.style.transition = '';
            }, 300);
          }
        }

        dragHandle.addEventListener('touchstart', onTouchStart, { passive: true });
        card.addEventListener('touchmove', onTouchMove, { passive: false });
        card.addEventListener('touchend', onTouchEnd);

        dragHandle.addEventListener('mousedown', onTouchStart);
        window.addEventListener('mousemove', onTouchMove);
        window.addEventListener('mouseup', onTouchEnd);
      });
    }
    initSwipeToDismissBottomSheets();

    // 15. iOS Safari VisualViewport Keyboard Handler (Spec Bab 3.4)
    function initVisualViewportHandler() {
      if (!window.visualViewport) return;
      const bar = document.querySelector('.floating-bottom-bar-wrapper');
      const chatContainer = document.querySelector('.chat-flow-container');

      function onViewportChange() {
        const vh = window.visualViewport.height;
        const winH = window.innerHeight;
        const keyboardHeight = Math.max(0, winH - vh - (window.visualViewport.offsetTop || 0));

        if (bar) {
          if (keyboardHeight > 60) {
            bar.style.transform = `translateY(-${keyboardHeight}px)`;
            bar.style.transition = 'transform 0.15s cubic-bezier(0.32, 0.72, 0, 1)';
            if (chatContainer) {
              chatContainer.style.paddingBottom = `${keyboardHeight + 64}px`;
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          } else {
            bar.style.transform = '';
            bar.style.transition = 'transform 0.22s ease';
            if (chatContainer) {
              chatContainer.style.paddingBottom = '';
            }
          }
        }
      }

      window.visualViewport.addEventListener('resize', onViewportChange);
      window.visualViewport.addEventListener('scroll', onViewportChange);
    }
    initVisualViewportHandler();

    // 16. Background Resync & Session TTL Management (Spec Bab 4.3 & 4.4)
    function initBackgroundResync() {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          const now = Date.now();
          state.sessionLastActive = state.sessionLastActive || now;

          // Re-sync cart snapshot from localStorage if newer version exists
          try {
            const snapshot = localStorage.getItem('aiodma_cart_snapshot');
            if (snapshot) {
              const data = JSON.parse(snapshot);
              if (data && data.version > (state.cartVersion || 0) && Array.isArray(data.cart)) {
                state.cart = data.cart;
                state.cartVersion = data.version;
                renderCartSheetItems();
                updateCartBadgesAndTotals();
              }
            }
          } catch (e) {
            console.debug('Background cart resync failed:', e);
          }

          // Live Clock Sync
          const clockEl = document.getElementById('iosLiveTime');
          if (clockEl) {
            const d = new Date();
            clockEl.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          }
        }
      });
    }
    initBackgroundResync();

    // 17. Real-Time Multi-Device SSE Listener & Server Menu Sync (with Auto-Reconnect)
    let sseRetryTimeout = null;
    let sseRetryDelay = 2000;

    function initCustomerSSE() {
      if (!window.EventSource) return;
      try {
        clearTimeout(sseRetryTimeout);
        const evtSource = new EventSource('/api/events');

        evtSource.onopen = () => {
          sseRetryDelay = 2000;
        };

        evtSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'ORDER_STATUS_CHANGED') {
              if (data.tableNum === (state.tableId || 5) || data.orderNumber === state.orderId) {
                handleLiveOrderStatusUpdate(data.status, data.orderNumber);
              }
            } else if (data.type === 'MENU_STOCK_CHANGED') {
              handleLiveStockUpdate(data.menuId, data.available, data.name);
            } else if (data.type === 'AI_CONFIG_UPDATED') {
              if (data.model) state.activeAiModel = data.model;
            }
          } catch (err) {
            // Ignore ping
          }
        };

        evtSource.onerror = () => {
          evtSource.close();
          sseRetryDelay = Math.min(30000, sseRetryDelay * 1.5);
          sseRetryTimeout = setTimeout(initCustomerSSE, sseRetryDelay);
        };
      } catch (err) {
        console.warn('Customer SSE connection error:', err);
      }
    }

    function handleLiveOrderStatusUpdate(status, orderNum) {
      playHaptic('success');

      let statusText = 'Diterima';
      let toastMsg = `Status Pesanan ${orderNum}: Diterima`;

      if (status === 'preparing') {
        statusText = 'Sedang Diracik';
        toastMsg = `Pesanan ${orderNum} sedang diracik oleh Barista di Dapur.`;
      } else if (status === 'ready') {
        statusText = 'Siap Disajikan';
        toastMsg = `Pesanan ${orderNum} telah SIAP DISAJIKAN! Silakan ambil di bar atau tunggu pelayan.`;
        // Clear dismissal flag so customer sees the important "Ready" notification banner
        try { sessionStorage.removeItem('aiodma_dismissed_banner_' + orderNum); } catch(e) {}
      } else if (status === 'completed') {
        statusText = 'Selesai';
        toastMsg = `Pesanan ${orderNum} selesai dinikmati. Terima kasih!`;
        try { localStorage.removeItem('aiodma_my_order'); } catch(e) {}
      }

      // Re-render UI adaptively based on hardware
      renderOrderTrackingUI({ tableNum: state.tableId || 5, orderNumber: orderNum }, status, false);
      showToast(toastMsg);
    }

    function handleLiveStockUpdate(menuId, available, name) {
      const item = menuCatalog.find(m => m.id === menuId);
      if (item) {
        item.available = available;
        if (state.currentMode === 'menu') {
          renderMenuCatalog();
        }
        if (!available) {
          showToast(`Info: Menu "${name || item.name}" baru saja habis (86).`);
        } else {
          showToast(`Info: Menu "${name || item.name}" kini tersedia kembali!`);
        }
      }
    }

    async function syncMenuCatalogFromServer() {
      try {
        const mId = state.merchantId || 'coffeenity';
        const res = await fetch(`/api/menu?merchant=${encodeURIComponent(mId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            menuCatalog = data.data;
            if (data.merchant) {
              state.merchant = data.merchant;
            }
            if (state.currentMode === 'menu') {
              renderMenuCatalog();
            }
          }
        }
      } catch (err) {
        console.debug('Using local menu cache (server offline):', err);
      }
    }

    function initTableRouting() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const merchantParam = urlParams.get('merchant');
        if (merchantParam) {
          state.merchantId = merchantParam.toLowerCase().trim();
        }
        const tableParam = urlParams.get('table') || urlParams.get('meja');
        if (tableParam) {
          const parsedNum = parseInt(tableParam, 10);
          if (!isNaN(parsedNum) && parsedNum > 0) {
            state.tableId = parsedNum;
          }
        }
      } catch (e) {}

      const tableLabel = `Meja ${state.tableId || 5}`;
      const diCompactTable = document.getElementById('diCompactTable');
      if (diCompactTable) diCompactTable.textContent = tableLabel;

      const tableStatusItem = document.getElementById('menuItemTableStatus');
      if (tableStatusItem) {
        tableStatusItem.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>${tableLabel} [QR Terverifikasi]</span>
        `;
      }

      const diExpName = document.querySelector('.di-exp-name');
      if (diExpName) {
        diExpName.textContent = `${tableLabel} • Order ${state.orderId || '#1K04'}`;
      }
    }

    // Clean any legacy mock dummy data in cart & localStorage
    if (Array.isArray(state.cart)) {
      state.cart = state.cart.filter(c => c.id !== 'c1' && c.id !== 'c2');
    }
    try {
      const snap = localStorage.getItem('aiodma_cart_snapshot');
      if (snap) {
        const d = JSON.parse(snap);
        if (d && Array.isArray(d.cart)) {
          state.cart = d.cart.filter(c => c.id !== 'c1' && c.id !== 'c2');
        }
      }
    } catch(e) {}

    async function syncActiveOrdersForTable() {
      try {
        const tableNum = state.tableId || 5;

        // Read user's own active order on this device
        let myOrder = null;
        try {
          const stored = localStorage.getItem('aiodma_my_order');
          if (stored) {
            myOrder = JSON.parse(stored);
            // Auto expire if older than 3 hours
            if (myOrder.createdAt && (Date.now() - myOrder.createdAt > 3 * 3600 * 1000)) {
              localStorage.removeItem('aiodma_my_order');
              myOrder = null;
            }
          }
        } catch(e) {}

        const res = await fetch(`/api/orders/table/${tableNum}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            const activeOrders = data.data.filter(o => o.status !== 'completed' && o.status !== 'cancelled');

            // Find if this device's order matches an active order in this table
            let targetOrder = null;
            if (myOrder && activeOrders.length > 0) {
              targetOrder = activeOrders.find(o => o.id === myOrder.id || o.orderNumber === myOrder.orderNumber);
            }

            if (targetOrder) {
              state.orderId = targetOrder.orderNumber;
              state.activeOrder = targetOrder;
              state.orderTrackingActive = true;

              // Check if user manually swiped away the banner in this session
              const isDismissed = sessionStorage.getItem('aiodma_dismissed_banner_' + targetOrder.orderNumber) === 'true';
              renderOrderTrackingUI(targetOrder, targetOrder.status, isDismissed);
            } else {
              state.orderTrackingActive = false;
              state.activeOrder = null;
              state.orderId = null;
              if (myOrder && (!activeOrders.length || !activeOrders.some(o => o.id === myOrder.id || o.orderNumber === myOrder.orderNumber))) {
                try { localStorage.removeItem('aiodma_my_order'); } catch(e) {}
              }

              // Hide live activity banner for fresh visitors who haven't ordered
              const liveBanner = document.getElementById('liveOrderActivityBanner');
              if (liveBanner) liveBanner.style.display = 'none';

              // If there are other active orders at this table, show option only in 3-dots menu
              const menuItemOpenTracker = document.getElementById('menuItemOpenTracker');
              if (menuItemOpenTracker) {
                if (activeOrders.length > 0) {
                  const tableOrder = activeOrders[0];
                  menuItemOpenTracker.style.display = 'flex';
                  const textSpan = menuItemOpenTracker.querySelector('span');
                  if (textSpan) textSpan.textContent = `Lacak Pesanan Meja ${tableNum} (${tableOrder.orderNumber})`;
                } else {
                  menuItemOpenTracker.style.display = 'none';
                }
              }
            }
          }
        }
      } catch (e) {
        console.debug('Active orders sync fallback:', e);
      }
    }

    renderCartSheetItems();
    updateCartBadgesAndTotals();

    initTheme();
    initTableRouting();
    initCustomerSSE();
    syncMenuCatalogFromServer();
    syncActiveOrdersForTable();
    restoreChatSession();

    // Close dropdowns on backdrop click
    document.addEventListener('click', () => {
      closeAllPopups();
    });
  }

  // Run init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();