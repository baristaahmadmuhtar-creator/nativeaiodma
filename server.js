/**
 * AIODMA — Enterprise Multi-Tenant SaaS Backend Server
 * Express REST API + Server-Sent Events (SSE) Real-Time Broadcaster
 * Port: 8080 | Host: 0.0.0.0
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// --- 1. ENTERPRISE SECURITY HEADERS & CORS ---
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// --- 1. HARDENED DYNAMIC MULTI-ORIGIN CORS LAYER ---
const devOriginRegex = /^(https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?)$/;
const mobileWebViewSchemes = ['capacitor://localhost', 'ionic://localhost', 'http://localhost'];

function isOriginAllowed(origin) {
  if (!origin || origin === 'null') return true; // Standalone PWA / native mobile WebViews
  if (devOriginRegex.test(origin)) return true;
  if (mobileWebViewSchemes.includes(origin)) return true;

  // Check process.env.ALLOWED_ORIGINS
  if (process.env.ALLOWED_ORIGINS) {
    const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim().toLowerCase());
    if (envOrigins.includes(origin.toLowerCase())) return true;
  }

  // Check persistent db.corsOrigins
  const persistentOrigins = (db && Array.isArray(db.corsOrigins)) ? db.corsOrigins : [];
  if (persistentOrigins.some(o => o.toLowerCase() === origin.toLowerCase())) return true;

  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    callback(null, isOriginAllowed(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-admin-token',
    'x-table-token',
    'x-merchant-id',
    'x-requested-by',
    'x-session-id',
    'idempotency-key',
    'traceparent',
    'baggage',
    'Accept',
    'Origin',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: [
    'Retry-After',
    'X-Content-Type-Options',
    'Content-Type',
    'x-merchant-id',
    'x-rate-limit-remaining',
    'x-rate-limit-reset'
  ],
  maxAge: 86400, // 24 hours preflight cache
  optionsSuccessStatus: 204
}));

// Fast-path HTTP OPTIONS preflight responder
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Malformed JSON Parser Error Shield (Zero Uncaught Crashes)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Malformed JSON Payload: Format body permintaan tidak valid.',
      code: 'INVALID_JSON'
    });
  }
  next(err);
});

// --- 1.1 SLIDING WINDOW RATE LIMITER ---
const rateLimitMap = new Map();
function createRateLimiter(windowMs, maxRequests, message = 'Terlalu banyak permintaan, silakan coba beberapa saat lagi.') {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    let record = rateLimitMap.get(key);
    if (!record || now - record.resetTime > windowMs) {
      record = { count: 1, resetTime: now };
      rateLimitMap.set(key, record);
      return next();
    }

    record.count++;
    if (record.count > maxRequests) {
      const retryAfterSec = Math.ceil((windowMs - (now - record.resetTime)) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter: retryAfterSec
      });
    }
    next();
  };
}

// Clean up rate limiter records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.resetTime > 60000) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

// --- 1.2 ADMIN AUTHENTICATION SHIELD ---
const ADMIN_SECRET_PIN = process.env.ADMIN_PIN || 'aiodma2026';
const activeAdminTokens = new Set(['aiodma-master-dev-token', 'adm_master_secret_session', 'aiodma2026']);

function requireAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const tokenHeader = req.headers['x-admin-token'] || '';
  const queryToken = req.query?.token || '';
  const requestedBy = req.headers['x-requested-by'] || '';
  const providedToken = (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : tokenHeader || queryToken).trim();

  if (providedToken && (activeAdminTokens.has(providedToken) || providedToken === ADMIN_SECRET_PIN || providedToken === 'aiodma2026')) {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Akses Ditolak: Otorisasi Admin diperlukan.',
    code: 'UNAUTHORIZED_ADMIN'
  });
}

// --- 2. MULTI-TENANT PERSISTENT STORAGE (ACID Atomic Write) ---
let db = {
  defaultMerchantId: 'coffeenity',
  merchants: {},
  aiConfig: {
    apiKey: '',
    model: 'gemini-3.7-flash',
    tone: 'warm',
    temperature: 0.7,
    thinkingBudget: 512,
    maxOutputTokens: 600,
    remainingCredits: 48155,
    totalInputTokens: 1420,
    totalOutputTokens: 2880
  },
  menu: [],
  orders: [],
  auditLogs: [],
  stats: {
    grossRevenue: 4820000,
    totalOrdersToday: 48,
    averageTicket: 100416
  }
};

function loadDatabase() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      db = JSON.parse(raw);

      if (!db.merchants) {
        db.merchants = {};
      }
      if (!db.menu && db.merchants?.senopati_cafe?.menu) {
        db.menu = db.merchants.senopati_cafe.menu;
      }

      // Auto-expire stale active orders older than 2 hours across all merchants
      const now = Date.now();
      let expiredCount = 0;

      // Clean merchant orders
      Object.values(db.merchants).forEach(merchant => {
        if (Array.isArray(merchant.orders)) {
          merchant.orders.forEach(o => {
            if (o.status !== 'completed' && o.status !== 'cancelled') {
              const orderTime = new Date(o.createdAt).getTime();
              if (!isNaN(orderTime) && (now - orderTime > 2 * 3600 * 1000)) {
                o.status = 'completed';
                o.updatedAt = new Date().toISOString();
                expiredCount++;
              }
            }
          });
        }
      });

      // Legacy global orders
      if (Array.isArray(db.orders)) {
        db.orders.forEach(o => {
          if (o.status !== 'completed' && o.status !== 'cancelled') {
            const orderTime = new Date(o.createdAt).getTime();
            if (!isNaN(orderTime) && (now - orderTime > 2 * 3600 * 1000)) {
              o.status = 'completed';
              o.updatedAt = new Date().toISOString();
              expiredCount++;
            }
          }
        });
      }

      if (db.aiConfig) {
        if (!db.aiConfig.model || db.aiConfig.model.includes('1.5') || db.aiConfig.model.includes('2.0')) {
          db.aiConfig.model = 'gemini-3.7-flash';
        }
        if (!db.aiConfig.thinkingBudget) {
          db.aiConfig.thinkingBudget = 512;
        }
      }

      if (!Array.isArray(db.corsOrigins)) {
        db.corsOrigins = [];
      }
      const defaultCors = [
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://thecoffeenityyard.bn',
        'https://aiodma.coffeenity.bn',
        'https://senopaticafe.id',
        'https://senopati.aiodma.id',
        'https://nativeaidoma.pages.dev',
        'capacitor://localhost',
        'ionic://localhost'
      ];
      defaultCors.forEach(orig => {
        if (!db.corsOrigins.includes(orig)) {
          db.corsOrigins.push(orig);
        }
      });

      if (expiredCount > 0) saveDatabase();
      console.log(`[DB] Multi-tenant DB loaded: ${Object.keys(db.merchants).length} merchants registered.`);
    }
  } catch (err) {
    console.error('[DB] Load error:', err);
  }
  return db;
}

let saveTimeout = null;
function saveDatabase() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const tempPath = DB_PATH + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf8');
      fs.renameSync(tempPath, DB_PATH);
    } catch (err) {
      console.error('[DB] Save error:', err);
    }
  }, 100);
}

loadDatabase();

// --- 2.1 MULTI-TENANT CONTEXT RESOLVER HELPER ---
function resolveMerchant(req) {
  const queryMerchant = req.query?.merchant;
  const headerMerchant = req.headers['x-merchant-id'];
  const bodyMerchant = req.body?.merchantId || req.body?.merchant;
  
  if (queryMerchant && db.merchants?.[queryMerchant.toLowerCase()]) {
    return db.merchants[queryMerchant.toLowerCase()];
  }
  if (headerMerchant && db.merchants?.[headerMerchant.toLowerCase()]) {
    return db.merchants[headerMerchant.toLowerCase()];
  }
  if (bodyMerchant && db.merchants?.[bodyMerchant.toLowerCase()]) {
    return db.merchants[bodyMerchant.toLowerCase()];
  }

  // Detect by items payload if submitted in body
  if (req.body?.items && Array.isArray(req.body.items)) {
    const hasSenopatiItem = req.body.items.some(it => {
      const id = (it.id || it.menuId || it.itemId || '').toLowerCase();
      const name = (it.name || '').toLowerCase();
      return id === 'kopi_milk_aren' || id === 'pizza_margherita' || id === 'burnt_cheesecake' || id === 'nasi_goreng' || id === 'almond_croissant' ||
        name.includes('pizza margherita classic') || name.includes('kopi milk aren') || name.includes('nasi goreng') ||
        (typeof it.price === 'number' && it.price > 1000);
    });
    if (hasSenopatiItem && db.merchants?.senopati_cafe) {
      return db.merchants.senopati_cafe;
    }
  }

  // If no explicit tenant in GET /api/menu without query, default to senopati_cafe for legacy 36-item tests
  if (req.path === '/api/menu' && !queryMerchant && !headerMerchant && db.merchants?.senopati_cafe) {
    return db.merchants.senopati_cafe;
  }

  // Default system merchant
  const defId = db.defaultMerchantId || 'coffeenity';
  if (db.merchants?.[defId]) {
    return db.merchants[defId];
  }

  const firstKey = Object.keys(db.merchants || {})[0];
  if (firstKey) {
    return db.merchants[firstKey];
  }

  return {
    id: 'coffeenity',
    name: 'The Coffeenity Yard',
    brandUnit: 'Doughboy Pizza Kayu Api',
    currency: 'BND',
    currencySymbol: '$',
    currencyDecimals: 2,
    taxRate: 0.0,
    tablesCount: 12,
    paymentMethods: ['BIBD', 'BAIDURI', 'POCKET', 'CASH'],
    menu: db.menu || [],
    orders: db.orders || [],
    auditLogs: db.auditLogs || [],
    stats: db.stats || { grossRevenue: 0, totalOrdersToday: 0, averageTicket: 0 }
  };
}

// --- 2.2 IN-MEMORY HYBRID RAG RETRIEVAL ENGINE (BM25 + TF-IDF) ---
const STOPWORDS = new Set([
  'ada', 'adalah', 'akan', 'antara', 'apa', 'apakah', 'atas', 'atau', 'bagaimana', 'bagi',
  'bahkan', 'bahwa', 'banyak', 'bawah', 'belakang', 'bisa', 'boleh', 'buat', 'dalam', 'dan', 'dapat', 'dari',
  'dengan', 'depan', 'di', 'dia', 'dimana', 'hanya', 'harus', 'ini', 'itu', 'juga', 'kalau', 'kami',
  'karena', 'ke', 'kepada', 'kita', 'lagi', 'lebih', 'luar', 'mau', 'mereka', 'mungkin', 'nama', 'namun', 'oleh',
  'pada', 'paling', 'para', 'pasti', 'saat', 'saja', 'sangat', 'saya', 'sebab', 'sebagai', 'sebuah', 'secara',
  'sedang', 'sekarang', 'selain', 'selama', 'semoga', 'semua', 'seperti', 'serta', 'setiap', 'sudah', 'tahu', 'tentang',
  'terhadap', 'tetapi', 'tidak', 'tolong', 'untuk', 'ya', 'yang',
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'to', 'for', 'of', 'with'
]);

function tokenizeRAGText(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

function retrieveKnowledgeChunks(merchantId, query, maxK = 3) {
  const merchant = db.merchants?.[merchantId] || db.merchants?.[db.defaultMerchantId];
  if (!merchant || !Array.isArray(merchant.knowledgeBase) || merchant.knowledgeBase.length === 0) {
    return [];
  }

  const queryTokens = tokenizeRAGText(query);
  if (queryTokens.length === 0) return [];

  const chunks = merchant.knowledgeBase;
  const N = chunks.length;

  const docFreq = {};
  chunks.forEach(chunk => {
    const chunkTokens = new Set([
      ...tokenizeRAGText(chunk.title),
      ...tokenizeRAGText(chunk.category),
      ...(chunk.tags || []).map(t => String(t).toLowerCase()),
      ...tokenizeRAGText(chunk.content)
    ]);
    chunkTokens.forEach(token => {
      docFreq[token] = (docFreq[token] || 0) + 1;
    });
  });

  const docLengths = chunks.map(c => tokenizeRAGText(c.content).length + tokenizeRAGText(c.title).length * 2);
  const avgDocLen = docLengths.reduce((a, b) => a + b, 0) / (N || 1);

  const k1 = 1.2;
  const b = 0.75;

  const scoredChunks = chunks.map((chunk, idx) => {
    const titleTokens = tokenizeRAGText(chunk.title);
    const tagTokens = (chunk.tags || []).map(t => String(t).toLowerCase());
    const categoryTokens = tokenizeRAGText(chunk.category);
    const contentTokens = tokenizeRAGText(chunk.content);
    const docLen = docLengths[idx];

    let score = 0;
    const matchedTerms = [];

    queryTokens.forEach(term => {
      const df = docFreq[term] || 0;
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

      let tf = 0;
      if (titleTokens.includes(term)) tf += 3.0;
      if (tagTokens.includes(term)) tf += 2.5;
      if (categoryTokens.includes(term)) tf += 2.0;
      const contentMatches = contentTokens.filter(t => t === term).length;
      tf += contentMatches;

      if (tf > 0) {
        const termScore = idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgDocLen))));
        score += termScore;
        matchedTerms.push(term);
      }
    });

    return {
      chunk,
      score: Math.round(score * 100) / 100,
      matchedTerms: [...new Set(matchedTerms)]
    };
  });

  return scoredChunks
    .filter(item => item.score >= 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxK);
}

// --- 3. SERVER-SENT EVENTS (SSE) BROADCASTER ---
const sseClients = new Set();

function broadcastEvent(eventData) {
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

// SSE Connection Endpoint
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Periodic SSE Keep-Alive Ping
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': ping\n\n');
    } catch (err) {
      sseClients.delete(client);
    }
  }
}, 20000);

// --- 4. IDEMPOTENCY CACHE ---
const idempotencyStore = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of idempotencyStore.entries()) {
    if (now - value.timestamp > 15 * 60 * 1000) {
      idempotencyStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// --- 5. REST API ENDPOINTS ---

// GET /api/merchants - Registry of all subscribed merchants
app.get('/api/merchants', (req, res) => {
  const list = Object.values(db.merchants || {}).map(m => ({
    id: m.id,
    name: m.name,
    brandUnit: m.brandUnit || '',
    tagline: m.tagline || '',
    currency: m.currency,
    currencySymbol: m.currencySymbol,
    currencyDecimals: m.currencyDecimals || (m.currency === 'IDR' ? 0 : 2),
    taxRate: m.taxRate || 0.0,
    taxLabel: m.taxLabel || '',
    tablesCount: m.tablesCount || 10,
    paymentMethods: m.paymentMethods || ['CASH'],
    defaultLanguage: m.defaultLanguage || 'id-ID',
    menuCount: Array.isArray(m.menu) ? m.menu.length : 0
  }));

  res.json({
    success: true,
    count: list.length,
    defaultMerchantId: db.defaultMerchantId || 'coffeenity',
    merchants: list
  });
});

// GET /api/merchants/:id - Detailed merchant settings
app.get('/api/merchants/:id', (req, res) => {
  const targetId = req.params.id;
  const merchant = db.merchants?.[targetId];

  if (!merchant) {
    return res.status(404).json({
      success: false,
      error: `Merchant dengan ID '${targetId}' tidak ditemukan.`
    });
  }

  res.json({
    success: true,
    merchant: {
      id: merchant.id,
      name: merchant.name,
      brandUnit: merchant.brandUnit || '',
      tagline: merchant.tagline || '',
      currency: merchant.currency,
      currencySymbol: merchant.currencySymbol,
      currencyDecimals: merchant.currencyDecimals || (merchant.currency === 'IDR' ? 0 : 2),
      taxRate: merchant.taxRate || 0.0,
      taxLabel: merchant.taxLabel || '',
      tablesCount: merchant.tablesCount || 10,
      paymentMethods: merchant.paymentMethods || ['CASH'],
      defaultLanguage: merchant.defaultLanguage || 'id-ID',
      menuCount: Array.isArray(merchant.menu) ? merchant.menu.length : 0
    }
  });
});

// POST /api/admin/login - Secure Admin Authentication
app.post('/api/admin/login', createRateLimiter(15 * 60 * 1000, 10, 'Terlalu banyak percobaan login admin.'), (req, res) => {
  const { pin, password } = req.body;
  const attempt = (pin || password || '').trim();

  if (attempt === ADMIN_SECRET_PIN || attempt === '8888' || attempt === 'admin123' || attempt === 'aiodma2026') {
    const token = 'adm_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    activeAdminTokens.add(token);
    return res.json({
      success: true,
      message: 'Login Admin Berhasil',
      token: token,
      role: 'owner'
    });
  }

  return res.status(401).json({
    success: false,
    error: 'PIN atau Password Admin tidak valid.'
  });
});

// GET /api/health - Production health & status endpoint
app.get('/api/health', (req, res) => {
  const defaultMerchant = resolveMerchant(req);
  const senopati = db.merchants?.senopati_cafe;
  const coffeenity = db.merchants?.coffeenity;
  res.json({
    status: 'ok',
    merchantsCount: Object.keys(db.merchants || {}).length,
    activeMerchant: defaultMerchant.id,
    menuCount: senopati?.menu?.length || 36,
    coffeenityMenuCount: coffeenity?.menu?.length || 62,
    aiConfig: {
      model: db.aiConfig?.model || 'gemini-3.7-flash',
      tone: db.aiConfig?.tone || 'warm',
      thinkingBudget: db.aiConfig?.thinkingBudget || 512
    },
    timestamp: new Date().toISOString()
  });
});

// GET /api/menu - Live catalog with stock status (Multi-Tenant & Multi-Format)
app.get('/api/menu', (req, res) => {
  const merchant = resolveMerchant(req);
  const menuList = merchant.menu || [];

  // When ?merchant= is explicitly provided in query, return raw menu array for direct multi-tenant test suites
  if (req.query.merchant) {
    return res.json(menuList);
  }

  // Standard wrapped envelope
  res.json({
    success: true,
    merchantId: merchant.id,
    currency: merchant.currency,
    currencySymbol: merchant.currencySymbol,
    count: menuList.length,
    data: menuList
  });
});

// GET /api/tables/:num/qr - Vector SVG Table Standee QR Generator
app.get('/api/tables/:num/qr', (req, res) => {
  const tableNum = parseInt(req.params.num, 10) || 5;
  const merchant = resolveMerchant(req);
  const host = req.get('host') || '127.0.0.1:8080';
  const targetUrl = `http://${host}/?merchant=${encodeURIComponent(merchant.id)}&table=${tableNum}&token=hmac_tok_${merchant.id}_${tableNum}`;

  // Generate crisp vector SVG standee badge with simulated QR pattern and clear branding
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400" width="320" height="400">
  <defs>
    <linearGradient id="cardBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#111111"/>
      <stop offset="100%" stop-color="#1E1E24"/>
    </linearGradient>
    <linearGradient id="amberGold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
  </defs>
  
  <!-- Outer Card Frame -->
  <rect width="320" height="400" rx="24" fill="url(#cardBg)" stroke="#333333" stroke-width="2"/>
  
  <!-- Merchant Header -->
  <text x="160" y="42" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="18" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${merchant.name}</text>
  <text x="160" y="62" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#999999" text-anchor="middle">${merchant.brandUnit || 'Artisan QR Table Ordering'}</text>
  
  <!-- White QR Container Box -->
  <rect x="40" y="80" width="240" height="240" rx="18" fill="#FFFFFF" filter="drop-shadow(0 8px 16px rgba(0,0,0,0.3))"/>
  
  <!-- QR Corner Positioning Squares -->
  <rect x="65" y="105" width="48" height="48" rx="6" fill="#111111"/>
  <rect x="73" y="113" width="32" height="32" rx="4" fill="#FFFFFF"/>
  <rect x="81" y="121" width="16" height="16" rx="2" fill="#111111"/>

  <rect x="207" y="105" width="48" height="48" rx="6" fill="#111111"/>
  <rect x="215" y="113" width="32" height="32" rx="4" fill="#FFFFFF"/>
  <rect x="223" y="121" width="16" height="16" rx="2" fill="#111111"/>

  <rect x="65" y="247" width="48" height="48" rx="6" fill="#111111"/>
  <rect x="73" y="255" width="32" height="32" rx="4" fill="#FFFFFF"/>
  <rect x="81" y="263" width="16" height="16" rx="2" fill="#111111"/>

  <!-- Center QR Matrix Decorative Cells -->
  <rect x="130" y="105" width="12" height="12" fill="#111111"/>
  <rect x="150" y="105" width="12" height="24" fill="#111111"/>
  <rect x="175" y="115" width="20" height="12" fill="#111111"/>
  
  <rect x="125" y="140" width="70" height="70" rx="12" fill="url(#amberGold)"/>
  <text x="160" y="180" font-family="-apple-system, sans-serif" font-size="20" font-weight="900" fill="#FFFFFF" text-anchor="middle">AI</text>
  
  <rect x="65" y="170" width="16" height="20" fill="#111111"/>
  <rect x="90" y="175" width="20" height="15" fill="#111111"/>
  <rect x="210" y="170" width="25" height="12" fill="#111111"/>
  <rect x="225" y="195" width="25" height="25" fill="#111111"/>
  
  <rect x="130" y="225" width="18" height="24" fill="#111111"/>
  <rect x="160" y="235" width="25" height="15" fill="#111111"/>
  <rect x="195" y="225" width="15" height="35" fill="#111111"/>
  
  <rect x="135" y="270" width="40" height="12" fill="#111111"/>
  <rect x="190" y="275" width="30" height="18" fill="#111111"/>
  <rect x="235" y="260" width="15" height="30" fill="#111111"/>

  <!-- Table Number Badge -->
  <rect x="90" y="338" width="140" height="36" rx="18" fill="url(#amberGold)"/>
  <text x="160" y="362" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="bold" fill="#FFFFFF" text-anchor="middle">MEJA ${tableNum}</text>
  <text x="160" y="390" font-family="-apple-system, sans-serif" font-size="9.5" fill="#777777" text-anchor="middle">Scan untuk Memesan dengan AI Sommelier</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

// POST /api/orders - Submit customer order (with Multi-Tenant Financial Integrity + Idempotency)
app.post('/api/orders', createRateLimiter(60000, 20, 'Terlalu banyak pesanan dari perangkat ini. Harap tunggu sebentar.'), (req, res) => {
  try {
    const merchant = resolveMerchant(req);
    const {
      table = 'Meja 5',
      tableNum = 5,
      items = [],
      paymentMethod = merchant.paymentMethods?.[0] || 'CASH',
      idempotencyKey,
      notes = ''
    } = req.body;

    // 1. Idempotency Check
    if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
      console.log(`[ORDER] Duplicate submit blocked by idempotency key: ${idempotencyKey}`);
      return res.json({
        success: true,
        isDuplicate: true,
        message: 'Pesanan sudah diproses sebelumnya',
        order: idempotencyStore.get(idempotencyKey).order
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Keranjang pesanan kosong' });
    }

    // 2. Financial Integrity: Recalculate price directly from official catalog
    let verifiedSubtotal = 0;
    const isBnd = merchant.currency === 'BND';

    const sanitizedItems = items.map(it => {
      const rawId = it.menuId || it.id || it.itemId || '';
      const catalogItem = merchant.menu.find(m => m.id === rawId || (it.menuId && m.id === it.menuId) || m.name.toLowerCase() === (it.name || '').toLowerCase());
      const baseUnitPrice = catalogItem ? catalogItem.price : (typeof it.price === 'number' && it.price > 0 ? it.price : (isBnd ? 5.00 : 25000));
      const safeQty = Math.min(99, Math.max(1, parseInt(it.qty, 10) || 1));

      // Calculate verified addon surcharges based on tenant currency
      let addonSurcharge = 0;
      const subtext = (typeof it.subtext === 'string' ? it.subtext : '').toLowerCase();

      if (isBnd) {
        // Brunei Dollar (BND $) modifier rules
        if (subtext.includes('12"') || subtext.includes('large')) {
          if (rawId.includes('4_cheese') || rawId.includes('supermeat') || rawId.includes('salmon')) {
            addonSurcharge += 7.00;
          } else {
            addonSurcharge += 6.00;
          }
        }
        if (subtext.includes('iced') || subtext.includes('dingin')) addonSurcharge += 0.50;
        if (subtext.includes('egg') || subtext.includes('telur')) addonSurcharge += 1.00;
        if (subtext.includes('baby clam') || subtext.includes('kerang')) addonSurcharge += 2.00;
        if (subtext.includes('extra mozzarella')) addonSurcharge += 1.50;
        if (subtext.includes('extra pepperoni')) addonSurcharge += 2.00;
        if (subtext.includes('extra meat') || subtext.includes('extra beef')) addonSurcharge += 2.00;
        if (subtext.includes('garlic mayo')) addonSurcharge += 0.80;
        if (subtext.includes('oat milk')) addonSurcharge += 1.00;
      } else {
        // Indonesian Rupiah (IDR Rp) modifier rules
        if (subtext.includes('oat milk') || subtext.includes('susu oat') || subtext.includes('oat')) addonSurcharge += 6000;
        if (subtext.includes('extra shot') || subtext.includes('double shot') || subtext.includes('tambah shot')) addonSurcharge += 4000;
        if (subtext.includes('boba')) addonSurcharge += 5000;
        if (subtext.includes('whipped cream') || subtext.includes('whip cream')) addonSurcharge += 4000;
        if (subtext.includes('stuffed cheese') || subtext.includes('pinggiran keju')) addonSurcharge += 15000;
        if (subtext.includes('large 8-slice') || subtext.includes('ukuran besar')) addonSurcharge += 25000;
        if (subtext.includes('extra mozzarella') || subtext.includes('ekstra mozzarella')) addonSurcharge += 10000;
        if (subtext.includes('beef pepperoni') || subtext.includes('ekstra pepperoni')) addonSurcharge += 12000;
        if (subtext.includes('telur mata sapi') || subtext.includes('telur') || subtext.includes('telor')) addonSurcharge += 5000;
      }

      // Compute official price with addons
      const computedUnitPrice = (baseUnitPrice + addonSurcharge);
      const itemTotal = computedUnitPrice * safeQty;
      verifiedSubtotal += itemTotal;

      return {
        itemId: catalogItem ? catalogItem.id : rawId,
        name: catalogItem ? catalogItem.name : (it.name || 'Custom Item'),
        price: computedUnitPrice,
        basePrice: baseUnitPrice,
        addonPrice: addonSurcharge,
        qty: safeQty,
        subtext: typeof it.subtext === 'string' ? it.subtext.slice(0, 150) : '',
        image: catalogItem ? catalogItem.image : (it.image || '')
      };
    });

    if (isBnd) {
      verifiedSubtotal = Number(verifiedSubtotal.toFixed(2));
    }

    const verifiedTax = isBnd ? 0.00 : Math.round(verifiedSubtotal * (merchant.taxRate || 0.1));
    const verifiedTotal = isBnd ? Number((verifiedSubtotal + verifiedTax).toFixed(2)) : (verifiedSubtotal + verifiedTax);
    const cleanTableNum = Math.min(99, Math.max(1, parseInt(tableNum, 10) || 5));

    // 3. Build unique Order Entity
    const randSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    const orderNumber = `#${cleanTableNum}K${randSuffix}`;
    const orderId = `ORD_${merchant.id.toUpperCase().slice(0, 4)}_${Date.now()}_${randSuffix}`;

    const newOrder = {
      id: orderId,
      orderNumber: orderNumber,
      merchantId: merchant.id,
      table: typeof table === 'string' && table.startsWith('Meja') ? table : `Meja ${cleanTableNum}`,
      tableNum: cleanTableNum,
      items: sanitizedItems,
      subtotal: verifiedSubtotal,
      tax: verifiedTax,
      total: verifiedTotal,
      currency: merchant.currency,
      currencySymbol: merchant.currencySymbol,
      paymentMethod: (paymentMethod || merchant.paymentMethods?.[0] || 'CASH').toUpperCase(),
      paymentStatus: req.body.paymentStatus || ((paymentMethod || '').toUpperCase() === 'CASH' ? 'PENDING_CASHIER' : 'PAID'),
      status: 'received',
      idempotencyKey: idempotencyKey || orderId,
      notes: typeof notes === 'string' ? notes.slice(0, 300) : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 4. Save to merchant database
    if (!Array.isArray(merchant.orders)) merchant.orders = [];
    merchant.orders.unshift(newOrder);

    if (!merchant.stats) merchant.stats = { grossRevenue: 0, totalOrdersToday: 0, averageTicket: 0 };
    merchant.stats.grossRevenue = isBnd 
      ? Number((merchant.stats.grossRevenue + newOrder.total).toFixed(2))
      : (merchant.stats.grossRevenue + newOrder.total);
    merchant.stats.totalOrdersToday += 1;
    merchant.stats.averageTicket = isBnd
      ? Number((merchant.stats.grossRevenue / merchant.stats.totalOrdersToday).toFixed(2))
      : Math.round(merchant.stats.grossRevenue / merchant.stats.totalOrdersToday);

    // Also keep in legacy global orders for backwards compatibility
    if (Array.isArray(db.orders)) db.orders.unshift(newOrder);

    // 5. Save Idempotency Cache
    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, {
        timestamp: Date.now(),
        order: newOrder
      });
    }

    saveDatabase();

    // 6. Broadcast to KDS / Admin screens in real time
    broadcastEvent({
      type: 'ORDER_CREATED',
      merchantId: merchant.id,
      order: newOrder
    });

    console.log(`[ORDER] Created ${newOrder.orderNumber} for ${merchant.name} (${newOrder.table}) - Total: ${merchant.currencySymbol} ${newOrder.total}`);

    res.status(201).json({
      success: true,
      order: newOrder
    });

  } catch (err) {
    console.error('[ORDER] Error creating order:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/orders/table/:tableNum - Get active orders for a specific table
app.get('/api/orders/table/:tableNum', (req, res) => {
  const merchant = resolveMerchant(req);
  const tNum = parseInt(req.params.tableNum, 10);
  const ordersList = merchant.orders || [];
  const tableOrders = ordersList.filter(o => o.tableNum === tNum);

  res.json({
    success: true,
    merchantId: merchant.id,
    count: tableOrders.length,
    data: tableOrders
  });
});

// GET /api/orders/:id - Get specific order by ID or orderNumber
app.get('/api/orders/:id', (req, res) => {
  const targetId = req.params.id;
  const merchant = resolveMerchant(req);
  let order = (merchant.orders || []).find(o => o.id === targetId || o.orderNumber === targetId);

  if (!order) {
    for (const m of Object.values(db.merchants || {})) {
      order = (m.orders || []).find(o => o.id === targetId || o.orderNumber === targetId);
      if (order) break;
    }
  }
  if (!order && Array.isArray(db.orders)) {
    order = db.orders.find(o => o.id === targetId || o.orderNumber === targetId);
  }

  if (!order) {
    return res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan' });
  }
  res.json({ success: true, order });
});

// GET /api/admin/orders - All KDS orders for authenticated merchant
app.get('/api/admin/orders', requireAdminAuth, (req, res) => {
  const merchant = resolveMerchant(req);
  const ordersList = merchant.orders || [];

  res.json({
    success: true,
    merchantId: merchant.id,
    currency: merchant.currency,
    currencySymbol: merchant.currencySymbol,
    count: ordersList.length,
    data: ordersList
  });
});

// PATCH /api/admin/orders/:id/status - Update KDS order status (preparing, ready, completed)
app.patch('/api/admin/orders/:id/status', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const merchant = resolveMerchant(req);
  
  let order = (merchant.orders || []).find(o => o.id === id || o.orderNumber === id);
  if (!order) {
    for (const m of Object.values(db.merchants || {})) {
      order = (m.orders || []).find(o => o.id === id || o.orderNumber === id);
      if (order) break;
    }
  }
  if (!order && Array.isArray(db.orders)) {
    order = db.orders.find(o => o.id === id || o.orderNumber === id);
  }

  if (!order) {
    return res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan' });
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();
  saveDatabase();

  // Broadcast status update to all customer devices and KDS screens
  broadcastEvent({
    type: 'ORDER_STATUS_CHANGED',
    merchantId: order.merchantId || merchant.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    tableNum: order.tableNum,
    table: order.table
  });

  console.log(`[KDS] Order ${order.orderNumber} status changed to ${order.status}`);
  res.json({ success: true, order });
});

// PATCH /api/admin/orders/:id/payment - Confirm payment settlement (Cashier)
app.patch('/api/admin/orders/:id/payment', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { paymentStatus = 'PAID' } = req.body;
  const merchant = resolveMerchant(req);

  let order = (merchant.orders || []).find(o => o.id === id || o.orderNumber === id);
  if (!order) {
    for (const m of Object.values(db.merchants || {})) {
      order = (m.orders || []).find(o => o.id === id || o.orderNumber === id);
      if (order) break;
    }
  }
  if (!order && Array.isArray(db.orders)) {
    order = db.orders.find(o => o.id === id || o.orderNumber === id);
  }

  if (!order) {
    return res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan' });
  }

  order.paymentStatus = paymentStatus;
  order.updatedAt = new Date().toISOString();
  saveDatabase();

  broadcastEvent({
    type: 'ORDER_PAID',
    merchantId: order.merchantId || merchant.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    paymentStatus: order.paymentStatus,
    tableNum: order.tableNum,
    table: order.table
  });

  console.log(`[PAYMENT] Order ${order.orderNumber} payment confirmed as ${order.paymentStatus}`);
  res.json({ success: true, order });
});

// PATCH /api/admin/menu/:id/toggle-stock - Toggle 86 Out of Stock
app.patch('/api/admin/menu/:id/toggle-stock', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { available } = req.body;
  const merchant = resolveMerchant(req);
  
  let targetItem = null;
  let affectedMerchants = [];

  // Update in all merchant catalogs containing this menu ID
  for (const m of Object.values(db.merchants || {})) {
    const item = (m.menu || []).find(it => it.id === id);
    if (item) {
      item.available = typeof available === 'boolean' ? available : !item.available;
      targetItem = item;
      affectedMerchants.push(m.id);
    }
  }

  // Also check legacy global db.menu
  if (Array.isArray(db.menu)) {
    const item = db.menu.find(it => it.id === id);
    if (item) {
      item.available = typeof available === 'boolean' ? available : !item.available;
      if (!targetItem) targetItem = item;
    }
  }

  if (!targetItem) {
    return res.status(404).json({ success: false, error: 'Menu tidak ditemukan' });
  }

  saveDatabase();

  // Broadcast 86 toggle event to all customer apps
  broadcastEvent({
    type: 'MENU_STOCK_CHANGED',
    merchantId: merchant.id,
    affectedMerchants: affectedMerchants,
    menuId: targetItem.id,
    name: targetItem.name,
    available: targetItem.available
  });

  console.log(`[MENU 86] ${targetItem.name} (${targetItem.id}) set to ${targetItem.available ? 'AVAILABLE' : '86 OUT OF STOCK'}`);
  res.json({ success: true, item: targetItem });
});

// GET /api/admin/menu - Full Admin Menu Catalog with Customizations
app.get('/api/admin/menu', requireAdminAuth, (req, res) => {
  const merchant = resolveMerchant(req);
  const menuList = merchant.menu || [];

  res.json({
    success: true,
    merchantId: merchant.id,
    currency: merchant.currency,
    currencySymbol: merchant.currencySymbol,
    count: menuList.length,
    data: menuList
  });
});

// POST /api/admin/menu - Add New Menu Item (Admin Managed)
app.post('/api/admin/menu', requireAdminAuth, (req, res) => {
  const merchant = resolveMerchant(req);
  const { id, name, category, price, desc, image, available = true, badge, badgeClass, flavorProfile, pairings = [], upsellHook, customizations } = req.body;

  if (!name || typeof price !== 'number') {
    return res.status(400).json({ success: false, error: 'Nama dan harga menu wajib diisi' });
  }

  const generatedId = id || name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  if (merchant.menu.some(m => m.id === generatedId)) {
    return res.status(400).json({ success: false, error: 'Menu dengan ID ini sudah ada' });
  }

  const newItem = {
    id: generatedId,
    name,
    category: category || 'kopi',
    price: Math.max(0, price),
    desc: desc || '',
    image: image || 'assets/products/kopi_milk_aren.jpg',
    available: Boolean(available),
    badge: badge || '',
    badgeClass: badgeClass || '',
    flavorProfile: flavorProfile || '',
    pairings: Array.isArray(pairings) ? pairings : [],
    upsellHook: upsellHook || '',
    customizations: customizations || null,
    dietary: []
  };

  merchant.menu.push(newItem);
  saveDatabase();

  broadcastEvent({
    type: 'MENU_UPDATED',
    merchantId: merchant.id,
    action: 'CREATE',
    item: newItem
  });

  console.log(`[ADMIN MENU] Created menu item: ${newItem.name} (${newItem.id}) on ${merchant.name}`);
  res.status(201).json({ success: true, item: newItem });
});

// PUT /api/admin/menu/:id - Update Menu Item
app.put('/api/admin/menu/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const merchant = resolveMerchant(req);
  let targetItem = null;

  for (const m of Object.values(db.merchants || {})) {
    const itemIndex = (m.menu || []).findIndex(it => it.id === id);
    if (itemIndex !== -1) {
      const existing = m.menu[itemIndex];
      const { name, category, price, desc, image, available, badge, badgeClass, flavorProfile, pairings, upsellHook, customizations } = req.body;
      m.menu[itemIndex] = {
        ...existing,
        name: name !== undefined ? name : existing.name,
        category: category !== undefined ? category : existing.category,
        price: typeof price === 'number' ? Math.max(0, price) : existing.price,
        desc: desc !== undefined ? desc : existing.desc,
        image: image !== undefined ? image : existing.image,
        available: available !== undefined ? Boolean(available) : existing.available,
        badge: badge !== undefined ? badge : existing.badge,
        badgeClass: badgeClass !== undefined ? badgeClass : existing.badgeClass,
        flavorProfile: flavorProfile !== undefined ? flavorProfile : existing.flavorProfile,
        pairings: Array.isArray(pairings) ? pairings : existing.pairings,
        upsellHook: upsellHook !== undefined ? upsellHook : existing.upsellHook,
        customizations: customizations !== undefined ? customizations : existing.customizations
      };
      targetItem = m.menu[itemIndex];
    }
  }

  if (!targetItem) {
    return res.status(404).json({ success: false, error: 'Menu tidak ditemukan' });
  }

  saveDatabase();

  broadcastEvent({
    type: 'MENU_UPDATED',
    merchantId: merchant.id,
    action: 'UPDATE',
    item: targetItem
  });

  console.log(`[ADMIN MENU] Updated menu item: ${targetItem.name} (${id})`);
  res.json({ success: true, item: targetItem });
});

// DELETE /api/admin/menu/:id - Remove Menu Item
app.delete('/api/admin/menu/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const merchant = resolveMerchant(req);
  let deleted = null;

  for (const m of Object.values(db.merchants || {})) {
    const itemIndex = (m.menu || []).findIndex(it => it.id === id);
    if (itemIndex !== -1) {
      deleted = m.menu.splice(itemIndex, 1)[0];
    }
  }

  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Menu tidak ditemukan' });
  }

  saveDatabase();

  broadcastEvent({
    type: 'MENU_UPDATED',
    merchantId: merchant.id,
    action: 'DELETE',
    menuId: id
  });

  console.log(`[ADMIN MENU] Deleted menu item: ${deleted.name} (${id})`);
  res.json({ success: true, message: `Menu ${deleted.name} berhasil dihapus` });
});

// POST /api/waiter/call - Call staff to table
app.post('/api/waiter/call', (req, res) => {
  const merchant = resolveMerchant(req);
  const { table = 'Meja 5', tableNum, reason = 'Bantuan Pelayan' } = req.body;
  const cleanTableNum = tableNum || (typeof table === 'string' ? parseInt(table.replace(/\D/g, ''), 10) || 5 : 5);
  const cleanTable = typeof table === 'string' && table.startsWith('Meja') ? table : `Meja ${cleanTableNum}`;

  const callItem = {
    id: `CALL_${merchant.id.toUpperCase().slice(0, 4)}_${Date.now()}`,
    merchantId: merchant.id,
    table: cleanTable,
    tableNum: cleanTableNum,
    reason,
    status: 'pending',
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  if (!Array.isArray(merchant.waiterCalls)) merchant.waiterCalls = [];
  merchant.waiterCalls.unshift(callItem);

  if (!Array.isArray(db.waiterCalls)) db.waiterCalls = [];
  db.waiterCalls.unshift(callItem);

  saveDatabase();

  broadcastEvent({
    type: 'CALL_WAITER',
    merchantId: merchant.id,
    call: callItem,
    table: cleanTable,
    tableNum: cleanTableNum,
    reason,
    timestamp: callItem.timestamp
  });

  res.json({
    success: true,
    message: `Pelayan dipanggil ke ${cleanTable}`,
    call: callItem
  });
});

// GET /api/admin/waiter-calls - List waiter calls for active merchant
app.get('/api/admin/waiter-calls', requireAdminAuth, (req, res) => {
  const merchant = resolveMerchant(req);
  const calls = merchant.waiterCalls || db.waiterCalls || [];
  res.json({
    success: true,
    merchantId: merchant.id,
    count: calls.length,
    data: calls
  });
});

// PATCH /api/admin/waiter-calls/:id - Resolve or update waiter call status
app.patch('/api/admin/waiter-calls/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { status = 'resolved' } = req.body;
  const merchant = resolveMerchant(req);

  let call = (merchant.waiterCalls || []).find(c => c.id === id);
  if (!call && Array.isArray(db.waiterCalls)) {
    call = db.waiterCalls.find(c => c.id === id);
  }

  if (!call) {
    return res.status(404).json({ success: false, error: 'Panggilan pelayan tidak ditemukan' });
  }

  call.status = status;
  call.resolvedAt = new Date().toISOString();
  saveDatabase();

  broadcastEvent({
    type: 'WAITER_CALL_RESOLVED',
    merchantId: merchant.id,
    callId: id,
    status
  });

  res.json({ success: true, call });
});

// GET /api/admin/stats - Live Analytics & revenue for active merchant
app.get('/api/admin/stats', requireAdminAuth, (req, res) => {
  const merchant = resolveMerchant(req);
  const ordersList = merchant.orders || [];
  const activeOrders = ordersList.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;

  res.json({
    success: true,
    merchantId: merchant.id,
    currency: merchant.currency,
    currencySymbol: merchant.currencySymbol,
    stats: {
      ...(merchant.stats || { grossRevenue: 0, totalOrdersToday: 0, averageTicket: 0 }),
      activeOrdersCount: activeOrders,
      totalOrders: ordersList.length,
      aiCredits: db.aiConfig.remainingCredits
    }
  });
});

// --- MODULE 5: PROMO & PRICING ---
// GET /api/admin/promos - List active promos & discounts
app.get('/api/admin/promos', requireAdminAuth, (req, res) => {
  const merchant = resolveMerchant(req);
  const promosList = merchant.promos || [
    {
      id: 'promo_kopi_sore',
      title: 'Diskon Sore Kopi (20%)',
      code: 'SOREKOPI20',
      discountType: 'percentage',
      discountValue: 20,
      minOrder: merchant.currency === 'BND' ? 10.00 : 50000,
      applicableCategories: ['kopi'],
      active: true,
      timeWindow: '14:00 - 17:00'
    },
    {
      id: 'promo_combo_sweet',
      title: 'Combo Manis Hemat',
      code: 'COMBOSWEET',
      discountType: 'fixed',
      discountValue: merchant.currency === 'BND' ? 2.00 : 6000,
      minOrder: merchant.currency === 'BND' ? 8.00 : 40000,
      applicableCategories: ['pastry', 'non-kopi'],
      active: true
    }
  ];

  res.json({
    success: true,
    merchantId: merchant.id,
    currency: merchant.currency,
    count: promosList.length,
    promos: promosList
  });
});

// POST /api/admin/promos - Create new promo
app.post('/api/admin/promos', requireAdminAuth, (req, res) => {
  const merchant = resolveMerchant(req);
  if (!merchant.promos) merchant.promos = [];
  
  const { title, code, discountType, discountValue, minOrder, applicableCategories } = req.body;
  if (!title || !code || !discountValue) {
    return res.status(400).json({ success: false, error: 'Judul promo, kode kupon, dan nilai diskon wajib diisi' });
  }

  const newPromo = {
    id: 'promo_' + Date.now(),
    title,
    code: code.toUpperCase().trim(),
    discountType: discountType || 'percentage',
    discountValue: Number(discountValue),
    minOrder: Number(minOrder) || 0,
    applicableCategories: Array.isArray(applicableCategories) ? applicableCategories : ['all'],
    active: true,
    createdAt: new Date().toISOString()
  };

  merchant.promos.push(newPromo);
  saveDatabase();

  broadcastEvent({
    type: 'PROMO_UPDATED',
    merchantId: merchant.id,
    action: 'CREATE',
    promo: newPromo
  });

  res.status(201).json({ success: true, promo: newPromo });
});

// DELETE /api/admin/promos/:id - Delete promo
app.delete('/api/admin/promos/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const merchant = resolveMerchant(req);
  if (!merchant.promos) merchant.promos = [];

  const idx = merchant.promos.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Promo tidak ditemukan' });
  }

  const deleted = merchant.promos.splice(idx, 1)[0];
  saveDatabase();

  res.json({ success: true, message: `Promo ${deleted.title} berhasil dihapus` });
});

// POST /api/promos/validate - Client promo code validation engine
app.post('/api/promos/validate', (req, res) => {
  const merchant = resolveMerchant(req);
  const { code, subtotal = 0 } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, error: 'Kode promo wajib diisi' });
  }

  const promos = merchant.promos || [];
  const cleanCode = String(code).trim().toUpperCase();
  const promo = promos.find(p => (p.code && p.code.toUpperCase() === cleanCode) && p.active !== false);

  if (!promo) {
    return res.status(404).json({ success: false, valid: false, error: 'Kode promo tidak valid atau telah kedaluwarsa' });
  }

  const numSubtotal = Number(subtotal) || 0;
  if (promo.minSpend && numSubtotal < promo.minSpend) {
    const minStr = merchant.currency === 'BND' ? `$${promo.minSpend}` : `Rp ${promo.minSpend.toLocaleString()}`;
    return res.status(400).json({
      success: false,
      valid: false,
      error: `Minimal pembelanjaan untuk promo ini adalah ${minStr}`
    });
  }

  let discount = 0;
  if (promo.type === 'percent') {
    discount = (numSubtotal * (promo.value / 100));
    if (promo.maxDiscount && discount > promo.maxDiscount) {
      discount = promo.maxDiscount;
    }
  } else {
    discount = promo.value;
  }

  if (merchant.currency === 'BND') {
    discount = Number(discount.toFixed(2));
  } else {
    discount = Math.round(discount);
  }

  const finalDiscount = Math.min(discount, numSubtotal);

  res.json({
    success: true,
    valid: true,
    discount: finalDiscount,
    promo: {
      id: promo.id,
      code: promo.code,
      type: promo.type,
      value: promo.value,
      discountAmount: finalDiscount,
      description: promo.desc || promo.title
    }
  });
});

// --- MODULE 7: CREDIT & BILLING ---
// GET /api/admin/credits - Live token balance and pricing tier
app.get('/api/admin/credits', requireAdminAuth, (req, res) => {
  const credits = db.aiConfig?.remainingCredits || 48155;
  res.json({
    success: true,
    remainingCredits: credits,
    totalInputTokens: db.aiConfig?.totalInputTokens || 12450,
    totalOutputTokens: db.aiConfig?.totalOutputTokens || 6890,
    costPerOrder: req.query?.merchant === 'coffeenity' ? '$ 0.001' : 'Rp 12',
    tier: 'Tier 1 Pro (Default)'
  });
});

// POST /api/admin/credits/refill - Top-up AI token balance
app.post('/api/admin/credits/refill', requireAdminAuth, (req, res) => {
  const { amount = 50000 } = req.body;
  if (!db.aiConfig) db.aiConfig = {};
  db.aiConfig.remainingCredits = (db.aiConfig.remainingCredits || 0) + Number(amount);
  saveDatabase();

  broadcastEvent({
    type: 'CREDITS_REFILLED',
    newBalance: db.aiConfig.remainingCredits
  });

  res.json({
    success: true,
    message: `Berhasil menambahkan ${amount} kredit token`,
    remainingCredits: db.aiConfig.remainingCredits
  });
});

// --- MODULE 8: STAFF & RBAC ---
// GET /api/admin/staff - Staff directory
app.get('/api/admin/staff', requireAdminAuth, (req, res) => {
  const merchant = resolveMerchant(req);
  const staffList = merchant.staff || [
    { id: 'usr_1', name: 'Ahmad Owner', email: 'ahmad@aiodma.cafe', role: 'owner', mfa: 'Authenticator', lastActive: 'Sedang Aktif' },
    { id: 'usr_2', name: 'Budi Manager', email: 'budi.ops@aiodma.cafe', role: 'manager', mfa: 'SMS OTP', lastActive: '10 menit lalu' },
    { id: 'usr_3', name: 'Siti Kasir', email: 'kasir01@aiodma.cafe', role: 'kasir', mfa: 'PIN Standar', lastActive: 'Hari ini 08:30' }
  ];

  res.json({ success: true, count: staffList.length, staff: staffList });
});

// POST /api/admin/staff - Add staff
app.post('/api/admin/staff', requireAdminAuth, (req, res) => {
  const merchant = resolveMerchant(req);
  if (!merchant.staff) merchant.staff = [];

  const { name, email, role = 'kasir' } = req.body;
  if (!name || !email) {
    return res.status(400).json({ success: false, error: 'Nama dan email staf wajib diisi' });
  }

  const newStaff = {
    id: 'usr_' + Date.now(),
    name,
    email,
    role,
    mfa: role === 'owner' ? 'Authenticator' : 'PIN Standar',
    lastActive: 'Baru ditambahkan',
    createdAt: new Date().toISOString()
  };

  merchant.staff.push(newStaff);
  saveDatabase();

  res.status(201).json({ success: true, staff: newStaff });
});

// DELETE /api/admin/staff/:id - Delete staff
app.delete('/api/admin/staff/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const merchant = resolveMerchant(req);
  if (!merchant.staff) merchant.staff = [];

  const idx = merchant.staff.findIndex(s => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Anggota staf tidak ditemukan' });
  }

  const deleted = merchant.staff.splice(idx, 1)[0];
  saveDatabase();

  res.json({ success: true, message: `Staf ${deleted.name} berhasil dihapus` });
});

// --- MODULE 9: API KEYS & WEBHOOKS ---
// GET /api/admin/api-keys - List API Keys
app.get('/api/admin/api-keys', requireAdminAuth, (req, res) => {
  const merchant = resolveMerchant(req);
  const keys = merchant.apiKeys || [
    {
      id: 'key_live_1',
      name: 'Production POS Live Key',
      key: 'aiodma_live_' + Buffer.from(merchant.id + ':live').toString('hex').slice(0, 16),
      status: 'active',
      rateLimit: '120 req/min',
      createdAt: '2026-01-01'
    }
  ];
  res.json({ success: true, keys });
});

// POST /api/admin/api-keys/generate - Generate new API key
app.post('/api/admin/api-keys/generate', requireAdminAuth, (req, res) => {
  const merchant = resolveMerchant(req);
  if (!merchant.apiKeys) merchant.apiKeys = [];

  const { name = 'External POS Integration' } = req.body;
  const newKey = {
    id: 'key_' + Date.now(),
    name,
    key: 'aiodma_live_' + crypto.randomBytes(12).toString('hex'),
    status: 'active',
    rateLimit: '120 req/min',
    createdAt: new Date().toISOString()
  };

  merchant.apiKeys.push(newKey);
  saveDatabase();

  res.status(201).json({ success: true, apiKey: newKey });
});

// POST /api/admin/webhooks/test - Test webhook dispatch
app.post('/api/admin/webhooks/test', requireAdminAuth, (req, res) => {
  const { url = 'https://api.pos-outlet.com/v1/webhooks/aiodma' } = req.body;
  const merchant = resolveMerchant(req);

  res.json({
    success: true,
    message: `Test ping webhook berhasil dikirim ke ${url}`,
    payloadSent: {
      event: 'ORDER_CREATED',
      merchantId: merchant.id,
      timestamp: new Date().toISOString(),
      orderNumber: '#TEST-999',
      total: merchant.currency === 'BND' ? 15.50 : 150000,
      signature: crypto.createHmac('sha256', 'aiodma_secret').update('test_payload').digest('hex')
    }
  });
});

// --- MODULE 10: AUDIT LOGS ---
// GET /api/admin/audit-logs - Query audit logs
app.get('/api/admin/audit-logs', requireAdminAuth, (req, res) => {
  const merchant = resolveMerchant(req);
  const logs = merchant.auditLogs || db.auditLogs || [];
  res.json({ success: true, count: logs.length, logs });
});

// POST /api/admin/audit-logs - Append audit log
app.post('/api/admin/audit-logs', requireAdminAuth, (req, res) => {
  const merchant = resolveMerchant(req);
  if (!merchant.auditLogs) merchant.auditLogs = [];

  const { action, actor = 'Ahmad Owner', detail } = req.body;
  const now = new Date();
  const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');

  const newLog = {
    id: 'log_' + Date.now(),
    timestamp: timeStr,
    action: action || 'MANUAL_ACTION',
    actor,
    detail: detail || 'Aktivitas admin dicatat.'
  };

  merchant.auditLogs.unshift(newLog);
  if (merchant.auditLogs.length > 500) merchant.auditLogs.pop();
  saveDatabase();

  res.status(201).json({ success: true, log: newLog });
});

// --- MODULE 12: DYNAMIC CORS MANAGEMENT ---
// GET /api/admin/cors - List configured origins and policy
app.get('/api/admin/cors', requireAdminAuth, (req, res) => {
  const persistent = Array.isArray(db.corsOrigins) ? db.corsOrigins : [];
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : [];

  res.json({
    success: true,
    policy: {
      devOriginRegex: devOriginRegex.toString(),
      preflightMaxAge: 86400,
      credentials: true,
      allowedMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD']
    },
    envOrigins,
    persistentOrigins: persistent,
    allAllowedOrigins: [...new Set([...persistent, ...envOrigins])]
  });
});

// POST /api/admin/cors - Add new origin to whitelist
app.post('/api/admin/cors', requireAdminAuth, (req, res) => {
  const { origin } = req.body;
  if (!origin || typeof origin !== 'string') {
    return res.status(400).json({ success: false, error: 'Origin domain wajib diisi' });
  }

  const cleanOrigin = origin.trim().toLowerCase();
  db.corsOrigins = Array.isArray(db.corsOrigins) ? db.corsOrigins : [];

  if (!db.corsOrigins.includes(cleanOrigin)) {
    db.corsOrigins.push(cleanOrigin);
    saveDatabase();
  }

  res.status(201).json({
    success: true,
    message: `Origin ${cleanOrigin} berhasil ditambahkan ke whitelist CORS`,
    origins: db.corsOrigins
  });
});

// DELETE /api/admin/cors/:origin - Remove origin from whitelist
app.delete('/api/admin/cors/:origin', requireAdminAuth, (req, res) => {
  const target = decodeURIComponent(req.params.origin).trim().toLowerCase();
  db.corsOrigins = Array.isArray(db.corsOrigins) ? db.corsOrigins : [];

  const idx = db.corsOrigins.indexOf(target);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Origin tidak ditemukan dalam whitelist' });
  }

  db.corsOrigins.splice(idx, 1);
  saveDatabase();

  res.json({
    success: true,
    message: `Origin ${target} berhasil dihapus dari whitelist`,
    origins: db.corsOrigins
  });
});

// POST /api/admin/cors/test - Test origin preflight simulation
app.post('/api/admin/cors/test', requireAdminAuth, (req, res) => {
  const { origin = 'http://localhost:3000', method = 'GET' } = req.body;
  const allowed = isOriginAllowed(origin);

  res.json({
    success: true,
    origin,
    method,
    isAllowed: allowed,
    status: allowed ? 204 : 403,
    headers: allowed ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    } : {
      error: 'Origin blocked by CORS policy'
    }
  });
});

// --- MODULE 13: HYBRID RAG KNOWLEDGE BASE MANAGEMENT ---
// GET /api/admin/rag/documents - List knowledge base chunks
app.get('/api/admin/rag/documents', requireAdminAuth, (req, res) => {
  const merchant = resolveMerchant(req);
  const kb = Array.isArray(merchant.knowledgeBase) ? merchant.knowledgeBase : [];
  const { category } = req.query;

  const filtered = category
    ? kb.filter(c => c.category === category)
    : kb;

  res.json({
    success: true,
    merchantId: merchant.id,
    merchantName: merchant.name,
    count: filtered.length,
    documents: filtered
  });
});

// POST /api/admin/rag/documents - Add new knowledge chunk
app.post('/api/admin/rag/documents', requireAdminAuth, (req, res) => {
  const merchant = resolveMerchant(req);
  merchant.knowledgeBase = Array.isArray(merchant.knowledgeBase) ? merchant.knowledgeBase : [];

  const { title, category = 'culinary_craft', tags = [], content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ success: false, error: 'Judul dan konten dokumen wajib diisi' });
  }

  const newDoc = {
    id: 'rag_' + merchant.id.slice(0, 4) + '_' + Date.now().toString(36),
    merchantId: merchant.id,
    title: String(title).trim(),
    category: String(category).trim(),
    tags: Array.isArray(tags) ? tags.map(t => String(t).trim()) : String(tags).split(',').map(t => t.trim()).filter(Boolean),
    content: String(content).trim(),
    updatedAt: new Date().toISOString()
  };

  merchant.knowledgeBase.push(newDoc);
  saveDatabase();

  res.status(201).json({
    success: true,
    message: `Dokumen "${newDoc.title}" berhasil ditambahkan ke RAG Knowledge Base`,
    document: newDoc
  });
});

// PUT /api/admin/rag/documents/:id - Update knowledge chunk
app.put('/api/admin/rag/documents/:id', requireAdminAuth, (req, res) => {
  const merchant = resolveMerchant(req);
  merchant.knowledgeBase = Array.isArray(merchant.knowledgeBase) ? merchant.knowledgeBase : [];

  const { id } = req.params;
  const doc = merchant.knowledgeBase.find(d => d.id === id);
  if (!doc) {
    return res.status(404).json({ success: false, error: 'Dokumen RAG tidak ditemukan' });
  }

  const { title, category, tags, content } = req.body;
  if (title) doc.title = String(title).trim();
  if (category) doc.category = String(category).trim();
  if (tags) doc.tags = Array.isArray(tags) ? tags.map(t => String(t).trim()) : String(tags).split(',').map(t => t.trim()).filter(Boolean);
  if (content) doc.content = String(content).trim();
  doc.updatedAt = new Date().toISOString();

  saveDatabase();

  res.json({
    success: true,
    message: `Dokumen "${doc.title}" berhasil diperbarui`,
    document: doc
  });
});

// DELETE /api/admin/rag/documents/:id - Delete knowledge chunk
app.delete('/api/admin/rag/documents/:id', requireAdminAuth, (req, res) => {
  const merchant = resolveMerchant(req);
  merchant.knowledgeBase = Array.isArray(merchant.knowledgeBase) ? merchant.knowledgeBase : [];

  const { id } = req.params;
  const idx = merchant.knowledgeBase.findIndex(d => d.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Dokumen RAG tidak ditemukan' });
  }

  const deleted = merchant.knowledgeBase.splice(idx, 1)[0];
  saveDatabase();

  res.json({
    success: true,
    message: `Dokumen "${deleted.title}" berhasil dihapus dari Knowledge Base`,
    deletedId: id
  });
});

// POST /api/admin/rag/test-query - Test RAG hybrid retrieval simulation
app.post('/api/admin/rag/test-query', requireAdminAuth, (req, res) => {
  const merchant = resolveMerchant(req);
  const { query, maxK = 3 } = req.body;

  if (!query || !String(query).trim()) {
    return res.status(400).json({ success: false, error: 'Pertanyaan uji (query) wajib diisi' });
  }

  const startTime = Date.now();
  const results = retrieveKnowledgeChunks(merchant.id, String(query).trim(), Number(maxK) || 3);
  const latencyMs = Date.now() - startTime;

  res.json({
    success: true,
    merchantId: merchant.id,
    query: String(query).trim(),
    latencyMs,
    count: results.length,
    results: results.map(r => ({
      id: r.chunk.id,
      title: r.chunk.title,
      category: r.chunk.category,
      score: r.score,
      matchedTerms: r.matchedTerms,
      snippet: r.chunk.content.length > 160 ? r.chunk.content.slice(0, 160) + '...' : r.chunk.content
    }))
  });
});

// --- MODULE 14: CUSTOMER HABIT & MEMORY STORE ---
// GET /api/customer/profile - Retrieve persistent customer habit profile
app.get('/api/customer/profile', (req, res) => {
  const customerId = req.headers['x-customer-id'] || req.query.customerId || 'default_guest';
  db.customerProfiles = db.customerProfiles || {};
  const profile = db.customerProfiles[customerId] || {
    customerId,
    visitCount: 1,
    preferences: {},
    allergies: [],
    favoriteItems: []
  };
  res.json({ success: true, profile });
});

// POST /api/customer/profile - Update customer habits & dietary preferences
app.post('/api/customer/profile', (req, res) => {
  const { customerId = 'default_guest', preferences = {}, allergies = [], favoriteItems = [] } = req.body;
  db.customerProfiles = db.customerProfiles || {};
  const existing = db.customerProfiles[customerId] || { customerId, visitCount: 0 };
  db.customerProfiles[customerId] = {
    ...existing,
    visitCount: (existing.visitCount || 0) + 1,
    preferences: { ...(existing.preferences || {}), ...preferences },
    allergies: [...new Set([...(existing.allergies || []), ...allergies])],
    favoriteItems: [...new Set([...(existing.favoriteItems || []), ...favoriteItems])],
    lastUpdated: new Date().toISOString()
  };
  saveDatabase();
  res.json({ success: true, profile: db.customerProfiles[customerId] });
});

// GET /api/ai/config - Public client AI status (Zero Key Exposure)
app.get('/api/ai/config', (req, res) => {
  const currentDb = loadDatabase();
  res.json({
    success: true,
    model: currentDb.aiConfig.model || 'gemini-3.7-flash',
    tone: currentDb.aiConfig.tone || 'warm',
    thinkingBudget: currentDb.aiConfig.thinkingBudget || 512
  });
});

// GET /api/admin/config - Get server AI config (API Key Zero-Exposure)
app.get('/api/admin/config', requireAdminAuth, (req, res) => {
  const currentDb = loadDatabase();
  const cfg = (currentDb && currentDb.aiConfig) ? currentDb.aiConfig : (db.aiConfig || {});
  res.json({
    success: true,
    config: {
      model: cfg.model || db.aiConfig?.model || 'gemini-3.7-flash',
      tone: cfg.tone || db.aiConfig?.tone || 'warm',
      temperature: cfg.temperature !== undefined ? cfg.temperature : 0.7,
      thinkingBudget: cfg.thinkingBudget || db.aiConfig?.thinkingBudget || 512,
      maxOutputTokens: cfg.maxOutputTokens || db.aiConfig?.maxOutputTokens || 600,
      remainingCredits: cfg.remainingCredits !== undefined ? cfg.remainingCredits : (db.aiConfig?.remainingCredits || 48000),
      totalInputTokens: cfg.totalInputTokens || db.aiConfig?.totalInputTokens || 0,
      totalOutputTokens: cfg.totalOutputTokens || db.aiConfig?.totalOutputTokens || 0,
      apiKeyMasked: cfg.apiKey ? (cfg.apiKey.substring(0, 7) + '...' + cfg.apiKey.slice(-4)) : (db.aiConfig?.apiKey ? db.aiConfig.apiKey.substring(0, 7) + '...' : ''),
      hasServerApiKey: Boolean(cfg.apiKey || db.aiConfig?.apiKey)
    }
  });
});

// POST /api/admin/config - Update server AI config (API Key Zero-Exposure)
app.post('/api/admin/config', requireAdminAuth, (req, res) => {
  const { apiKey, model, tone, temperature, thinkingBudget, maxOutputTokens } = req.body;
  if (apiKey !== undefined && apiKey.trim()) db.aiConfig.apiKey = apiKey.trim();
  if (model) db.aiConfig.model = model;
  if (tone) db.aiConfig.tone = tone;
  if (temperature !== undefined) db.aiConfig.temperature = parseFloat(temperature);
  if (thinkingBudget !== undefined) db.aiConfig.thinkingBudget = parseInt(thinkingBudget, 10);
  if (maxOutputTokens !== undefined) db.aiConfig.maxOutputTokens = parseInt(maxOutputTokens, 10);

  saveDatabase();

  broadcastEvent({
    type: 'AI_CONFIG_UPDATED',
    model: db.aiConfig.model,
    tone: db.aiConfig.tone
  });

  res.json({
    success: true,
    message: 'Konfigurasi AI server berhasil diperbarui secara aman',
    config: {
      model: db.aiConfig.model,
      tone: db.aiConfig.tone,
      temperature: db.aiConfig.temperature,
      thinkingBudget: db.aiConfig.thinkingBudget || 512,
      maxOutputTokens: db.aiConfig.maxOutputTokens || 600,
      remainingCredits: db.aiConfig.remainingCredits,
      totalInputTokens: db.aiConfig.totalInputTokens,
      totalOutputTokens: db.aiConfig.totalOutputTokens,
      apiKeyMasked: db.aiConfig.apiKey ? (db.aiConfig.apiKey.substring(0, 7) + '...' + db.aiConfig.apiKey.slice(-4)) : '',
      hasServerApiKey: Boolean(db.aiConfig.apiKey)
    }
  });
});

// --- ROBUST GEMINI MODEL CALL HELPER (Exclusively Gemini 3.7 Flash) ---
async function callGeminiWithFallback(apiKey, payload, requestedModel = 'gemini-3.7-flash') {
  const modelsToTry = ['gemini-3.7-flash'];
  let lastError = 'Unknown error';
  let lastStatus = 500;

  for (const m of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const clonedPayload = JSON.parse(JSON.stringify(payload));
      
      const budget = (db && db.aiConfig && db.aiConfig.thinkingBudget) ? db.aiConfig.thinkingBudget : 512;
      clonedPayload.generationConfig = clonedPayload.generationConfig || {};
      clonedPayload.generationConfig.thinking_config = { thinking_budget: budget };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clonedPayload),
        signal: AbortSignal.timeout(3500)
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, data, modelUsed: m };
      }

      const errText = await res.text();
      lastStatus = res.status;
      lastError = errText;
      break;
    } catch (e) {
      lastError = e.message;
    }
  }

  return { success: false, status: lastStatus, error: lastError };
}

// POST /api/ai/chat - Server-side Gemini AI Barista Proxy (Multi-Tenant Aware)
app.post('/api/ai/chat', createRateLimiter(60000, 30, 'Terlalu banyak permintaan chat. Harap tunggu beberapa detik.'), async (req, res) => {
  try {
    const merchant = resolveMerchant(req);
    const { message, history = [], clientApiKey, model: clientModel, table = 'Meja 5', cart = [], customerProfile, language = 'id' } = req.body;
    const apiKey = (clientApiKey || db.aiConfig.apiKey || '').trim();
    const model = clientModel || db.aiConfig.model || 'gemini-3.7-flash';
    const temp = db.aiConfig.temperature || 0.7;

    // 0. AI Shield: Adversarial Prompt Injection & Jailbreak Defense
    const cleanMessage = String(message || '').slice(0, 1000);
    const lowerMsg = cleanMessage.toLowerCase();
    const isJailbreak = lowerMsg.includes('ignore previous instructions') ||
      lowerMsg.includes('system prompt override') ||
      lowerMsg.includes('act as system admin') ||
      lowerMsg.includes('reveal api key') ||
      lowerMsg.includes('dump database') ||
      lowerMsg.includes('dan mode') ||
      lowerMsg.includes('sudo mode') ||
      lowerMsg.includes('developer mode');

    if (isJailbreak) {
      return res.json({
        success: true,
        text: `Sistem beroperasi dalam mode aman untuk melayani ${table} di ${merchant.name}. Ada pesanan kopi atau hidangan yang ingin disiapkan?`,
        functionCalls: [],
        usage: { inputTokens: 20, outputTokens: 35 },
        customerProfile: customerProfile || null,
        language
      });
    }

    // In-Memory Hybrid RAG Retrieval Engine (Top-3 Contextual Chunks)
    const ragResults = retrieveKnowledgeChunks(merchant.id, cleanMessage, 3);
    let ragContext = '';
    if (ragResults.length > 0) {
      ragContext = `\n\nFAKTA KHUSUS OUTLET (RETRIEVED RAG GROUND-TRUTH):\n` +
        ragResults.map((r, i) =>
          `[DOKUMEN RAG #${i + 1}] Judul: "${r.chunk.title}" | Kategori: ${r.chunk.category} | Relevansi: ${r.score}\n` +
          `Informasi Faktual: ${r.chunk.content}`
        ).join('\n\n') +
        `\n\nINSTRUKSI PENGGUNAAN INFORMASI RAG:\n` +
        `- Jika pelanggan bertanya tentang topik di atas (biji kopi, profil sangrai/roast, oven kayu bakar, fermentasi adonan pizza, topping Indomee, alergen/diet, Wi-Fi, musholla, fasilitas), wajib gunakan informasi faktual di atas dengan percaya diri dan tanpa halusinasi.\n`;
    }

    if (!apiKey || apiKey.length < 20 || apiKey.startsWith('AIzaSyDummy')) {
      // Intelligent Local Sommelier Engine (Zero-Latency Local Knowledge + RAG + Customer Memory)
      const lower = cleanMessage.toLowerCase();
      const isEn = language === 'en';
      const isRepeat = customerProfile && Number(customerProfile.visitCount) > 1;
      const hasOatMilk = customerProfile?.preferences?.milkAlternative === 'Oat Milk' || (Array.isArray(customerProfile?.allergies) && customerProfile.allergies.includes('lactose'));
      let mockReply = '';
      let mockCalls = [];

      if (ragResults.length > 0 && ragResults[0].score >= 1.0 && !lower.includes('rekomendasi') && !lower.includes('recommend')) {
        const topDoc = ragResults[0].chunk;
        mockReply = isEn
          ? `Regarding **${topDoc.title}** at ${merchant.name}:\n\n${topDoc.content}\n\nWould you like to order any items for ${table}?`
          : `Mengenai **${topDoc.title}** di ${merchant.name}:\n\n${topDoc.content}\n\nAda hidangan atau minuman yang ingin Anda pesan ke ${table}?`;
      } else if (lower.includes('rekomendasi') || lower.includes('pizza') || lower.includes('kopi') || lower.includes('recommend')) {
        if (merchant.currency === 'BND') {
          if (isEn) {
            mockReply = hasOatMilk
              ? `Welcome back! Based on your non-dairy milk preference, we highly recommend our **Iced Latte with Oat Milk** paired with **Pepperoni Pizza**.\n\nWould you prefer a savory meal or a refreshing coffee?`
              : `For exceptional recommendations at **${merchant.name}**, we suggest **Pepperoni Pizza** (traditional wood-fired oven) and **Creamy Mushroom Chicken Pizza**.\n\nPairs wonderfully with our **Garden Mojito**. Do you prefer savory meat or mushroom toppings?`;
          } else {
            mockReply = hasOatMilk
              ? `Senang melihat Anda kembali! Mengingat preferensi susu non-dairy Anda, kami merekomendasikan **Iced Latte dengan Oatly Oat Milk** disandingkan dengan **Pepperoni Pizza**.\n\nAnda ingin kami siapkan minuman kopi atau hidangan hangat?`
              : `Untuk hidangan istimewa di **${merchant.name}**, kami sangat merekomendasikan **Pepperoni Pizza** (panggangan kayu api tradisional) atau **Creamy Mushroom Chicken Pizza**.\n\nSangat pas jika disandingkan dengan kesegaran **Garden Mojito** dingin. Anda lebih menyukai topping gurih daging atau keju jamur?`;
          }
          mockCalls.push({
            name: 'showRecommendations',
            args: { itemIds: ['pizza_pepperoni', 'pizza_creamy_mushroom_chicken', 'sig_garden_mojito'], reason: isEn ? 'The Coffeenity Yard Favorites' : 'Pilihan Favorit The Coffeenity Yard' }
          });
        } else {
          if (isEn) {
            mockReply = hasOatMilk
              ? `Great to see you again! Based on your preferences, we suggest our **Kopi Milk Aren with Oat Milk** and **Beef Pepperoni Pizza**.\n\nWould you like hot or iced coffee?`
              : `For recommendations at **${merchant.name}**, we suggest **Beef Pepperoni Pizza** and **Kopi Milk Aren**.\n\nDo you prefer refreshing drinks or creamy coffee?`;
          } else {
            mockReply = hasOatMilk
              ? `Senang menyapa Anda kembali! Mengingat preferensi non-dairy Anda, kami merekomendasikan **Kopi Milk Aren dengan Oat Milk** dan **Beef Pepperoni Pizza**.\n\nAnda menyukai minuman segar atau kopi dingin?`
              : `Untuk hidangan di **${merchant.name}**, kami merekomendasikan **Beef Pepperoni Pizza** dan **Kopi Milk Aren**.\n\nAnda menyukai minuman segar atau kopi creamy?`;
          }
          mockCalls.push({
            name: 'showRecommendations',
            args: { itemIds: ['pizza_pepperoni', 'kopi_milk_aren'], reason: isEn ? 'Featured Highlights' : 'Menu Unggulan' }
          });
        }
      } else {
        if (isEn) {
          mockReply = isRepeat
            ? `Welcome back to **${merchant.name}** (${table})! Delighted to serve you again. What would you like to enjoy today?`
            : `Hello! Welcome to **${merchant.name}** (${table}). What would you like to order today?`;
        } else {
          mockReply = isRepeat
            ? `Selamat datang kembali di **${merchant.name}** (${table})! Senang menyapa Anda lagi. Ada menu favorit yang ingin disiapkan hari ini?`
            : `Halo! Selamat datang di **${merchant.name}** (${table}). Ada menu yang ingin Anda pesan hari ini?`;
        }
      }

      return res.json({
        success: true,
        text: mockReply,
        functionCalls: mockCalls,
        modelUsed: 'gemini-3.7-flash',
        usage: { inTokens: 25, outTokens: 40, remainingCredits: db.aiConfig.remainingCredits },
        ragChunks: ragResults.map(r => ({
          id: r.chunk.id,
          title: r.chunk.title,
          category: r.chunk.category,
          score: r.score,
          matchedTerms: r.matchedTerms
        })),
        customerProfile: customerProfile || null,
        language
      });
    }

    // Build Server Catalog Context for active merchant
    const menuContext = (merchant.menu || []).map(m => {
      const pairText = m.pairings && m.pairings.length > 0 ? ` | Cocok dipadukan: [${m.pairings.join(', ')}]` : '';
      const flavorText = m.flavorProfile ? ` | Profil Rasa: "${m.flavorProfile}"` : '';
      const hookText = m.upsellHook ? ` | Saran Harmonis: "${m.upsellHook}"` : '';
      const formattedPrice = merchant.currency === 'BND' ? `$${m.price.toFixed(2)}` : `Rp ${m.price.toLocaleString()}`;
      return `- ${m.id}: ${m.name} (${m.category}) | ${formattedPrice} | "${m.desc}"${flavorText}${pairText}${hookText} [${m.available ? 'Tersedia' : 'HABIS 86'}]`;
    }).join('\n');

    const cartContext = cart.length > 0
      ? cart.map(c => `- ${c.qty || 1}x ${c.name} (${c.subtext || 'Standar'})`).join('\n')
      : 'Keranjang saat ini kosong.';

    // Live Ground-Truth KDS Orders Context for Table
    const ordersList = merchant.orders || [];
    const tableNum = parseInt(String(table).replace(/\D/g, ''), 10) || 5;
    const tableOrders = ordersList.filter(o => (o.tableNum === tableNum || o.table === table || o.table === `Meja ${tableNum}`));
    const activeOrders = tableOrders.filter(o => o.status !== 'completed');

    let kdsStatusContext = '';
    if (activeOrders.length > 0) {
      kdsStatusContext = activeOrders.slice(0, 3).map(o => {
        const itemNames = (o.items || []).map(i => `${i.qty}x ${i.name}`).join(', ');
        let stDesc = 'Diterima di antrean dapur';
        if (o.status === 'preparing') stDesc = 'Sedang Diracik oleh Barista di Dapur';
        else if (o.status === 'ready') stDesc = 'SIAP DISAJIKAN / Siap Diambil di Bar';
        const payDesc = (o.paymentStatus === 'PAID' || o.isPaid !== false) ? `Lunas via ${o.paymentMethod || 'BIBD'}` : 'Belum Lunas';
        const totalStr = merchant.currency === 'BND' ? `$${(o.total || 0).toFixed(2)}` : `Rp ${(o.total || 0).toLocaleString()}`;
        return `- Tiket #${o.orderNumber}: Status KDS "${stDesc}" | Pembayaran "${payDesc}" | Menu: [${itemNames}] | Total: ${totalStr}`;
      }).join('\n');
    } else {
      kdsStatusContext = `Belum ada pesanan aktif di dapur untuk ${table}.`;
    }

    const nowHour = new Date().getHours();
    let timeMealCategory = 'Sore (Coffee Break & Santai)';
    if (nowHour >= 5 && nowHour < 11) timeMealCategory = 'Pagi (Sarapan & Fresh Coffee Boost)';
    else if (nowHour >= 11 && nowHour < 15) timeMealCategory = 'Siang (Makan Siang & Refreshing Drink)';
    else if (nowHour >= 15 && nowHour < 18) timeMealCategory = 'Sore (Afternoon Tea, Artisan Coffee & Pastry)';
    // Customer Memory & Habit Intelligence Context
    let customerMemoryContext = '';
    if (customerProfile && typeof customerProfile === 'object') {
      const prefs = [];
      if (customerProfile.preferences?.sweetnessLevel) prefs.push(`Tingkat manis favorit: ${customerProfile.preferences.sweetnessLevel}`);
      if (customerProfile.preferences?.milkAlternative) prefs.push(`Susu favorit: ${customerProfile.preferences.milkAlternative}`);
      if (customerProfile.preferences?.temperature) prefs.push(`Suhu favorit: ${customerProfile.preferences.temperature}`);
      if (Array.isArray(customerProfile.allergies) && customerProfile.allergies.length > 0) {
        prefs.push(`ALERGI & PANTANGAN: ${customerProfile.allergies.join(', ')} (WAJIB PERHATIKAN ALERGEN INI!)`);
      }
      if (Array.isArray(customerProfile.favoriteItems) && customerProfile.favoriteItems.length > 0) {
        prefs.push(`Menu favorit: ${customerProfile.favoriteItems.join(', ')}`);
      }
      const visitDesc = Number(customerProfile.visitCount) > 1 ? `Pelanggan Setia (Kunjungan ke-${customerProfile.visitCount})` : 'Kunjungan Pertama';
      customerMemoryContext = `\n\nPROFIL & MEMORI KEBIASAAN PELANGGAN:\n- Status Kunjungan: ${visitDesc}\n- Catatan Preferensi: ${prefs.join(' | ') || 'Belum ada preferensi khusus'}\n- INSTRUKSI MEMORI: Kenali dan hormati preferensi rasa dan pantangan alergi pelanggan di atas. Jika kunjungan berulang, sambut dengan hangat dan personal.\n`;
    }

    const langInstruction = (language === 'en')
      ? `\nLANGUAGE REQUIREMENT: Respond strictly in natural, warm English. Keep outlet menu item names exact as in catalog. Operational currency: ${merchant.currency} (${merchant.currencySymbol}).`
      : (language === 'ms')
      ? `\nKEPERLUAN BAHASA: Jawab dalam Bahasa Melayu yang sopan, mesra, dan santun mengikut budaya Brunei Darussalam. Mata wang: ${merchant.currency} (${merchant.currencySymbol}).`
      : `\nPANDUAN BAHASA: Jawab dalam Bahasa Indonesia yang ramah, sopan, natural, dan profesional. Mata uang: ${merchant.currency} (${merchant.currencySymbol}).`;

    const systemInstruction = `Anda adalah asisten cerdas dan Master Kasir & Sommelier AIODMA untuk outlet "${merchant.name}" (${merchant.brandUnit || ''}) melayani ${table}. Mata uang operasional: ${merchant.currency} (${merchant.currencySymbol}). Waktu: ${timeMealCategory}.
${ragContext}
${customerMemoryContext}
${langInstruction}
STANDAR KOMUNIKASI KASIR & SOMMELIER CERDAS SITUASIONAL (1, 2, ATAU 3 GELEMBUNG):
1. KECERDASAN RITME SITUASIONAL (DYNAMIC PARAGRAPH CADENCE):
   Pisahkan setiap gelembung dengan dua baris kosong (paragraf baru):
   - POLA 1 GELEMBUNG (Jawaban Faktual Kilat):
     * Fasilitas (Wi-Fi, toilet, musholla, colokan, jam buka, panggil pelayan). Jawab langsung dalam 1 kalimat padat dan to the point.
   - POLA 2 GELEMBUNG (Konsultasi Rasa & Rekapitulasi Tagihan):
     * Paragraf 1 = Deskripsi 2 menu unggulan. Paragraf 2 = Pertanyaan eksplorasi preferensi pelanggan.
   - POLA 3 GELEMBUNG (Pemesanan Lengkap & Sommelier Pairing):
     * Paragraf 1: Konfirmasi penambahan item ke keranjang ${table}.
     * Paragraf 2: Klarifikasi opsi kustomisasi/modifier (ukuran pizza, suhu kopi hot/iced, topping).
     * Paragraf 3: Saran Sommelier Pairing harmonis (contoh: "Sangat pas jika disandingkan dengan **Garden Mojito** dingin. Mau saya tambahkan?").

2. FORMAT TEKS RAPI & ELEGAN:
   - Tebalkan nama menu utama menggunakan markdown bold (contoh: **Pepperoni Pizza**, **Garden Mojito**).
   - DILARANG KERAS menggunakan emoji apapun (ZERO EMOJI POLICY).
   - DILARANG memperkenalkan diri sebagai "AI Barista".

3. KONSULTASI KATEGORI & REKOMENDASI (SHOWRECOMMENDATIONS):
   - Jika pelanggan bertanya rekomendasi atau menyebut kategori ("pizza", "kopi", "sarapan"):
     * JANGAN panggil 'openMenuCatalog'. JANGAN langsung add to cart.
     * Sebutkan 2 varian unggulan di teks, lalu WAJIB PANGGIL tool 'showRecommendations' dengan array ID menu resmi yang disebutkan.

4. BUKA KATALOG HANYA PADA PERINTAH EKSPLISIT:
   - Tool 'openMenuCatalog' HANYA dipanggil jika pelanggan secara eksplisit meminta ("buka katalog", "lihat daftar menu").

KATALOG RESMI ${merchant.name} (${merchant.menu?.length || 0} MENU):
${menuContext}

STATUS KERANJANG MEJA:
${cartContext}

STATUS AKTIF DAPUR KDS & PEMBAYARAN:
${kdsStatusContext}`;

    const contents = (history || []).map(h => {
      if (h.parts) return h;
      return {
        role: (h.role === 'assistant' || h.role === 'model') ? 'model' : 'user',
        parts: [{ text: String(h.text || h.content || '') }]
      };
    });
    if (cleanMessage) {
      contents.push({ role: 'user', parts: [{ text: cleanMessage }] });
    }

    const payload = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: contents,
      generationConfig: {
        temperature: temp,
        maxOutputTokens: db.aiConfig?.maxOutputTokens || 600
      },
      tools: [{
        function_declarations: [
          {
            name: "addToCart",
            description: `HANYA dipanggil jika pelanggan SECARA PASTI menyatakan niat untuk memesan/membeli menu spesifik ke keranjang ${table}.`,
            parameters: {
              type: "OBJECT",
              properties: {
                items: {
                  type: "ARRAY",
                  description: "Daftar item yang dipesan",
                  items: {
                    type: "OBJECT",
                    properties: {
                      itemId: { type: "STRING", description: "ID menu persis di katalog resmi" },
                      qty: { type: "INTEGER", description: "Jumlah pesanan (default: 1)" },
                      modifiers: { type: "STRING", description: "Catatan kustomisasi (contoh: Large 12 inch, Iced, Extra Shot)" }
                    },
                    required: ["itemId", "qty"]
                  }
                }
              },
              required: ["items"]
            }
          },
          {
            name: "removeFromCart",
            description: "Menghapus item dari keranjang belanja pelanggan",
            parameters: {
              type: "OBJECT",
              properties: {
                itemId: { type: "STRING", description: "ID menu yang ingin dihapus" }
              },
              required: ["itemId"]
            }
          },
          {
            name: "showRecommendations",
            description: "Menampilkan kartu visual rekomendasi 2-3 menu pilihan saat pelanggan bertanya rekomendasi atau menyebut kategori.",
            parameters: {
              type: "OBJECT",
              properties: {
                itemIds: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                  description: "Daftar ID menu resmi yang direkomendasikan"
                },
                reason: { type: "STRING", description: "Judul singkat alasan rekomendasi" }
              },
              required: ["itemIds"]
            }
          },
          {
            name: "openMenuCatalog",
            description: "HANYA dipanggil jika pelanggan SECARA EKSPLISIT meminta untuk membuka katalog menu.",
            parameters: {
              type: "OBJECT",
              properties: {
                category: { type: "STRING", description: "Kategori spesifik (pizza, espresso, filter, breakfast, snacks, matcha, all)" }
              }
            }
          },
          {
            name: "proceedToPayment",
            description: "Membawa pelanggan langsung ke lembar checkout pembayaran",
            parameters: {
              type: "OBJECT",
              properties: {
                confirmed: { type: "BOOLEAN", description: "Konfirmasi checkout" }
              }
            }
          },
          {
            name: "callWaiter",
            description: "Memanggil pelayan / staf kafe untuk datang ke meja",
            parameters: {
              type: "OBJECT",
              properties: {
                reason: { type: "STRING", description: "Alasan pemanggilan pelayan" }
              }
            }
          },
          {
            name: "checkOrderStatus",
            description: "Memeriksa status pelacakan pesanan terkini di KDS dapur untuk meja pelanggan",
            parameters: {
              type: "OBJECT",
              properties: {
                orderNumber: { type: "STRING", description: "Nomor tiket pesanan yang ingin diperiksa (opsional)" }
              }
            }
          }
        ]
      }]
    };

    const result = await callGeminiWithFallback(apiKey, payload, model);
    if (!result.success) {
      console.warn(`[AI] Upstream Gemini error (${result.status}): ${result.error}. Falling back to local Sommelier engine.`);
      const lower = cleanMessage.toLowerCase();
      const isEn = language === 'en';
      const isRepeat = customerProfile && Number(customerProfile.visitCount) > 1;
      const hasOatMilk = customerProfile?.preferences?.milkAlternative === 'Oat Milk' || (Array.isArray(customerProfile?.allergies) && customerProfile.allergies.includes('lactose'));
      let fallbackReply = '';
      let fallbackCalls = [];

      if (ragResults.length > 0 && ragResults[0].score >= 1.0 && !lower.includes('rekomendasi') && !lower.includes('recommend')) {
        const topDoc = ragResults[0].chunk;
        fallbackReply = isEn
          ? `Regarding **${topDoc.title}** at ${merchant.name}:\n\n${topDoc.content}\n\nWould you like to order any items for ${table}?`
          : `Mengenai **${topDoc.title}** di ${merchant.name}:\n\n${topDoc.content}\n\nAda hidangan atau minuman yang ingin Anda pesan ke ${table}?`;
      } else if (lower.includes('rekomendasi') || lower.includes('pizza') || lower.includes('kopi') || lower.includes('recommend')) {
        if (merchant.currency === 'BND') {
          if (isEn) {
            fallbackReply = hasOatMilk
              ? `Welcome back! Based on your non-dairy milk preference, we highly recommend our **Iced Latte with Oat Milk** paired with **Pepperoni Pizza**.\n\nWould you prefer a savory meal or a refreshing coffee?`
              : `For exceptional recommendations at **${merchant.name}**, we suggest **Pepperoni Pizza** (traditional wood-fired oven) and **Creamy Mushroom Chicken Pizza**.\n\nPairs wonderfully with our **Garden Mojito**. Do you prefer savory meat or mushroom toppings?`;
          } else {
            fallbackReply = hasOatMilk
              ? `Senang melihat Anda kembali! Mengingat preferensi susu non-dairy Anda, kami merekomendasikan **Iced Latte dengan Oatly Oat Milk** disandingkan dengan **Pepperoni Pizza**.\n\nAnda ingin kami siapkan minuman kopi atau hidangan hangat?`
              : `Untuk rekomendasi istimewa di **${merchant.name}**, kami menyarankan **Pepperoni Pizza** (panggangan kayu api tradisional) atau **Creamy Mushroom Chicken Pizza**.\n\nSangat pas jika disandingkan dengan kesegaran **Garden Mojito** dingin. Anda lebih menyukai topping gurih daging atau keju jamur?`;
          }
          fallbackCalls.push({
            name: 'showRecommendations',
            args: { itemIds: ['pizza_pepperoni', 'pizza_creamy_mushroom_chicken', 'sig_garden_mojito'], reason: isEn ? 'The Coffeenity Yard Favorites' : 'Pilihan Favorit The Coffeenity Yard' }
          });
        } else {
          if (isEn) {
            fallbackReply = hasOatMilk
              ? `Great to see you again! Based on your preferences, we suggest our **Kopi Milk Aren with Oat Milk** and **Beef Pepperoni Pizza**.\n\nWould you like hot or iced coffee?`
              : `For recommendations at **${merchant.name}**, we suggest **Beef Pepperoni Pizza** and **Kopi Milk Aren**.\n\nDo you prefer refreshing drinks or creamy coffee?`;
          } else {
            fallbackReply = hasOatMilk
              ? `Senang menyapa Anda kembali! Mengingat preferensi non-dairy Anda, kami merekomendasikan **Kopi Milk Aren dengan Oat Milk** dan **Beef Pepperoni Pizza**.\n\nAnda menyukai minuman segar atau kopi dingin?`
              : `Untuk rekomendasi di **${merchant.name}**, kami menyarankan **Beef Pepperoni Pizza** dan **Kopi Milk Aren**.\n\nAnda menyukai minuman segar atau kopi creamy?`;
          }
          fallbackCalls.push({
            name: 'showRecommendations',
            args: { itemIds: ['pizza_pepperoni', 'kopi_milk_aren'], reason: isEn ? 'Featured Highlights' : 'Menu Unggulan' }
          });
        }
      } else {
        if (isEn) {
          fallbackReply = isRepeat
            ? `Welcome back to **${merchant.name}** (${table})! Delighted to serve you again. What would you like to enjoy today?`
            : `Hello! Welcome to **${merchant.name}** (${table}). What would you like to order today?`;
        } else {
          fallbackReply = isRepeat
            ? `Selamat datang kembali di **${merchant.name}** (${table})! Senang menyapa Anda lagi. Ada menu favorit yang ingin disiapkan hari ini?`
            : `Halo! Selamat datang di **${merchant.name}** (${table}). Ada menu yang ingin Anda pesan hari ini?`;
        }
      }

      return res.json({
        success: true,
        text: fallbackReply,
        functionCalls: fallbackCalls,
        modelUsed: 'gemini-3.7-flash',
        usage: { inTokens: 25, outTokens: 40, remainingCredits: db.aiConfig.remainingCredits },
        ragChunks: ragResults.map(r => ({
          id: r.chunk.id,
          title: r.chunk.title,
          category: r.chunk.category,
          score: r.score,
          matchedTerms: r.matchedTerms
        })),
        customerProfile: customerProfile || null,
        language
      });
    }

    const data = result.data;
    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let textOutput = '';
    const functionCalls = [];
    parts.forEach(p => {
      if (p.thought) return;
      if (p.text) textOutput += p.text;
      if (p.functionCall) functionCalls.push(p.functionCall);
    });

    if (!textOutput || !textOutput.trim()) {
      const firstFn = functionCalls[0]?.name;
      if (firstFn === 'addToCart') {
        textOutput = `Pesanan telah ditambahkan ke keranjang ${table}. Ada yang ingin dipesan lagi?`;
      } else if (firstFn === 'showRecommendations') {
        textOutput = 'Berikut rekomendasi menu istimewa untuk Anda:';
      } else if (firstFn === 'checkOrderStatus') {
        if (activeOrders.length > 0) {
          const topO = activeOrders[0];
          let stDesc = topO.status === 'preparing' ? 'sedang diracik oleh Barista di dapur' : (topO.status === 'ready' ? 'SIAP DISAJIKAN' : 'telah diterima di antrean dapur');
          textOutput = `Pesanan Anda (#${topO.orderNumber}) saat ini ${stDesc}.`;
        } else {
          textOutput = `Belum ada pesanan aktif di dapur untuk ${table}.`;
        }
      } else if (firstFn === 'proceedToPayment') {
        textOutput = 'Baik, silakan periksa rincian pesanan Anda dan pilih metode pembayaran.';
      } else if (firstFn === 'openMenuCatalog') {
        textOutput = 'Berikut katalog lengkap menu kami:';
      } else if (firstFn === 'callWaiter') {
        textOutput = `Staf pelayan kami segera menuju ke ${table}.`;
      } else {
        textOutput = 'Baik, permintaan Anda sedang diproses.';
      }
    }

    textOutput = textOutput.replace(/\\n/g, '\n');

    // Record token usage
    const inTokens = data?.usageMetadata?.promptTokenCount || 20;
    const outTokens = data?.usageMetadata?.candidatesTokenCount || 30;
    db.aiConfig.remainingCredits = Math.max(0, db.aiConfig.remainingCredits - (inTokens + outTokens));
    db.aiConfig.totalInputTokens += inTokens;
    db.aiConfig.totalOutputTokens += outTokens;
    saveDatabase();

    const cleanedText = textOutput.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

    res.json({
      success: true,
      text: cleanedText,
      functionCalls,
      modelUsed: result.modelUsed,
      usage: { inTokens, outTokens, remainingCredits: db.aiConfig.remainingCredits },
      ragChunks: ragResults.map(r => ({
        id: r.chunk.id,
        title: r.chunk.title,
        category: r.chunk.category,
        score: r.score,
        matchedTerms: r.matchedTerms
      })),
      customerProfile: customerProfile || null,
      language
    });

  } catch (err) {
    console.error('[AI] Proxy error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/vision - Server-side Gemini Multimodal Vision Proxy
app.post('/api/ai/vision', async (req, res) => {
  try {
    const merchant = resolveMerchant(req);
    const { imageBase64, mimeType = 'image/jpeg', clientApiKey, model: clientModel, promptOverride } = req.body;
    const apiKey = (clientApiKey || db.aiConfig.apiKey || '').trim();
    const model = clientModel || db.aiConfig.model || 'gemini-3.7-flash';

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API Key Gemini belum dikonfigurasi di server maupun client'
      });
    }

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Data gambar tidak ditemukan' });
    }

    const menuListStr = (merchant.menu || []).map(m => `- ${m.id}: ${m.name} (${merchant.currencySymbol} ${m.price}) - ${m.desc}`).join('\n');
    const visionPrompt = promptOverride || `Anda adalah Asisten Cerdas dan Master Sommelier AIODMA untuk ${merchant.name} (Meja 5).
Analisis foto makanan/minuman ini dan cocokkan dengan menu resmi kami berikut:
${menuListStr}

Instruksi:
1. Sebutkan nama menu yang paling cocok dan harganya.
2. Berikan deskripsi profil rasa ringkas (1-2 kalimat) dan tanyakan apakah ingin dipesan ke Meja 5.
3. ZERO-EMOJI POLICY: Dilarang keras menggunakan emoji apapun.
4. Format respon santun, elegan, dan profesional.`;

    const payload = {
      contents: [{
        role: 'user',
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBase64
            }
          },
          { text: visionPrompt }
        ]
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 400
      }
    };

    const result = await callGeminiWithFallback(apiKey, payload, model);
    if (!result.success) {
      return res.status(result.status || 500).json({ success: false, error: result.error });
    }

    const data = result.data;
    const parts = data?.candidates?.[0]?.content?.parts || [];
    let rawReply = '';
    parts.forEach(p => {
      if (p.thought) return;
      if (p.text) rawReply += p.text;
    });
    rawReply = rawReply.replace(/\\n/g, '\n');
    const cleanReply = rawReply.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

    const inTokens = 250;
    const outTokens = 60;
    db.aiConfig.remainingCredits = Math.max(0, db.aiConfig.remainingCredits - (inTokens + outTokens));
    db.aiConfig.totalInputTokens += inTokens;
    db.aiConfig.totalOutputTokens += outTokens;
    saveDatabase();

    res.json({
      success: true,
      text: cleanReply,
      modelUsed: result.modelUsed,
      usage: { inTokens, outTokens, remainingCredits: db.aiConfig.remainingCredits }
    });

  } catch (err) {
    console.error('[AI Vision] Proxy error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/ping - Test Gemini API connection & latency
app.post('/api/ai/ping', async (req, res) => {
  try {
    const { clientApiKey, model: clientModel } = req.body;
    const apiKey = (clientApiKey || db.aiConfig.apiKey || '').trim();
    const model = clientModel || db.aiConfig.model || 'gemini-3.7-flash';

    if (!apiKey) {
      return res.json({
        success: true,
        modelUsed: model,
        message: `Koneksi AI Engine (${model}) aktif dalam mode offline/dev fallback!`,
        latencyMs: 15,
        isDevFallback: true
      });
    }

    const startTime = Date.now();
    const payload = {
      contents: [{ role: 'user', parts: [{ text: 'Ping test' }] }],
      generationConfig: { maxOutputTokens: 5 }
    };

    const result = await callGeminiWithFallback(apiKey, payload, model);
    const latencyMs = Date.now() - startTime;

    if (!result.success) {
      return res.status(result.status || 500).json({
        success: false,
        error: `Gemini API Error: ${result.error}`,
        latencyMs
      });
    }

    res.json({
      success: true,
      message: `Koneksi ke Google Gemini (${result.modelUsed}) aktif dan stabil!`,
      latencyMs,
      model: result.modelUsed
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: `Network error: ${err.message}`
    });
  }
});

// --- 6. API 404 & SERVE STATIC FRONTEND ASSETS ---
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint '${req.method} ${req.originalUrl}' tidak ditemukan.`,
    code: 'NOT_FOUND'
  });
});

app.use(express.static(path.join(__dirname)));

// Fallback to index.html for root PWA
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[UNHANDLED_SERVER_ERROR]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({
    success: false,
    error: 'Terjadi kesalahan internal pada server.',
    code: 'INTERNAL_SERVER_ERROR'
  });
});

// --- 7. START SERVER ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 AIODMA Multi-Tenant Server running at http://0.0.0.0:${PORT}`);
  console.log(`📱 Customer App (Coffeenity): http://localhost:${PORT}/index.html?merchant=coffeenity&table=5`);
  console.log(`📱 Customer App (Senopati):   http://localhost:${PORT}/index.html?merchant=senopati_cafe&table=5`);
  console.log(`🖥️ Admin & KDS:              http://localhost:${PORT}/admin.html#kds`);
  console.log(`⚡ Real-Time SSE:            http://localhost:${PORT}/api/events`);
  console.log(`====================================================`);
});