'use strict';

// Run the tracked legacy snapshot, never the concurrently edited application.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const crypto = require('node:crypto');
const { execFileSync, spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const { once } = require('node:events');

const root = path.resolve(__dirname, '..');
const baseline = process.env.BASELINE_REF || 'd8884b195f3a6144191568a2e1513916d314c4c3';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const report = { startedAt: new Date().toISOString(), node: process.version, platform: process.platform,
  status: 'RUNNING', suites: [], captures: [], journeys: Object.fromEntries(
    ['J1', 'J2', 'J3', 'J4', 'J5'].map(id => [id, 'NOT_VERIFIED_END_TO_END'])),
  constraints: ['No provider calls: external Node network connections are refused.',
    'No response mocks; application fallback behavior remains legacy behavior.',
    'Browser external access limited to HTTPS images, fonts and stylesheets.',
    'Installed workspace dependencies are reused; this is not a lockfile-reproducible build.',
    'Raw application/test logs and data contents are never written to evidence.'] };
let temporary;
let server;
let activeTest;
let browser;
let interrupted = false;
const destination = path.join(root, 'output', 'playwright', 'baseline-' + Date.now());
const dataPath = path.join(root, 'data', 'db.json');
const dataBefore = hash(dataPath);
const freeBytes = directory => {
  const stats = fs.statfsSync(directory);
  return stats.bavail * stats.bsize;
};

async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const closed = once(child, 'close');
  child.kill('SIGKILL');
  await closed;
}

async function available(host) {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen({ port: 8080, host, exclusive: true, ipv6Only: host === '::' }, resolve);
  });
  await new Promise(resolve => probe.close(resolve));
}

// This preload changes transport only. The tracked server/test source stays byte-identical.
const guard = String.raw`
'use strict';
const net = require('node:net');
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const value = Array.isArray(args[0]) ? args[0][0] : args[0];
  const options = typeof value === 'object' ? value : { port: value, host: typeof args[1] === 'string' ? args[1] : 'localhost' };
  if (options.path || !['localhost', '127.0.0.1', '::1'].includes(options.host || 'localhost') || Number(options.port) !== 8080) {
    const error = new Error('BASELINE_EXTERNAL_NETWORK_BLOCKED');
    error.code = 'BASELINE_EXTERNAL_NETWORK_BLOCKED';
    throw error;
  }
  return originalConnect.apply(this, args);
};
const originalFetch = globalThis.fetch;
globalThis.fetch = function (input, options) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.port !== '8080') {
    return Promise.reject(new Error('BASELINE_EXTERNAL_NETWORK_BLOCKED'));
  }
  return originalFetch(input, options);
};
const originalListen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...args) {
  if (Number(args[0]) !== 8080) throw new Error('BASELINE_UNEXPECTED_LISTENER');
  const callback = args.find(value => typeof value === 'function');
  return originalListen.call(this, { port: 8080, host: '127.0.0.1', exclusive: true }, () => {
    if (process.send) process.send({ baselineListening: true, address: this.address().address, port: this.address().port });
    if (callback) callback();
  });
};
`;

function environment() {
  const env = {};
  for (const name of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'LOCALAPPDATA']) {
    if (process.env[name]) env[name] = process.env[name];
  }
  return { ...env, PORT: '8080', NODE_PATH: path.join(root, 'node_modules') };
}

async function startServer() {
  server = spawn(process.execPath, ['--require', path.join(temporary, '.baseline-guard.cjs'), 'server.js'], {
    cwd: temporary, env: environment(), windowsHide: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc']
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SERVER_READY_TIMEOUT')), 15000);
    const finish = fn => value => { clearTimeout(timer); fn(value); };
    server.once('error', finish(reject));
    server.once('exit', finish(() => reject(new Error('SERVER_EXIT_BEFORE_READY'))));
    server.once('message', finish(message => {
      if (!message.baselineListening || message.address !== '127.0.0.1' || message.port !== 8080) return reject(new Error('WRONG_LISTENER'));
      report.listener = { address: message.address, port: message.port, pid: server.pid };
      resolve();
    }));
  });
}

async function runSuite(file) {
  const started = Date.now();
  activeTest = spawn(process.execPath, ['--require', path.join(temporary, '.baseline-guard.cjs'), path.join('tests', file)], {
    cwd: temporary, env: environment(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  let timedOut = false;
  const collect = data => { output = (output + data.toString()).slice(-1024 * 1024); };
  activeTest.stdout.on('data', collect);
  activeTest.stderr.on('data', collect);
  const timer = setTimeout(() => { timedOut = true; activeTest.kill('SIGKILL'); }, 30000);
  const [exitCode, signal] = await once(activeTest, 'close');
  clearTimeout(timer);
  const clean = output.replace(/\x1b\[[0-9;]*m/g, '');
  const source = fs.readFileSync(path.join(temporary, 'tests', file), 'utf8');
  // Export only literal labels present in the tracked test, never dynamic reasons or payloads.
  const labels = [...source.matchAll(/test\('([^'\r\n]+)'/g)].map(match => match[1]);
  const failedLabels = labels.filter(label => clean.includes('FAIL: ' + label));
  const failedTestNumbers = [...clean.matchAll(/FAIL\s*\[Test (\d+)\]/g)].map(match => Number(match[1]));
  const failedCheckIds = [...clean.matchAll(/\u2716\s*\[([A-Za-z0-9_.-]+)\]/g)]
    .map(match => match[1]).filter(id => /^TC-\d{1,3}$/.test(id) || source.includes("'" + id + "'"));
  const counts = clean.match(/PASSED:\s*(\d+)[^\r\n]*FAILED:\s*(\d+)/);
  const stackLines = [...clean.matchAll(/(?:tests[\\/])([a-zA-Z0-9_]+\.js):(\d+):\d+/g)]
    .map(match => ({ file: match[1], line: Number(match[2]) }));
  const errorCodes = [...new Set([...clean.matchAll(/\b(?:ERR_[A-Z_]+|EACCES|ENOSPC|ECONNREFUSED|BASELINE_EXTERNAL_NETWORK_BLOCKED)\b/g)].map(match => match[0]))];
  const errorClasses = [...new Set([...clean.matchAll(/\b(?:TypeError|ReferenceError|SyntaxError|AssertionError|RangeError)\b/g)].map(match => match[0]))];
  const result = { file, exitCode, signal, timedOut, durationMs: Date.now() - started,
    status: timedOut ? 'TIMEOUT' : exitCode === 0 ? 'LEGACY_EXIT_ZERO' : 'FAILED',
    failedLabels, failedTestNumbers, failedCheckIds, stackLines, errorCodes, errorClasses,
    reportedCounts: counts ? { passed: Number(counts[1]), failed: Number(counts[2]) } : null };
  report.suites.push(result);
  console.log(file + ': ' + result.status);
}

async function capture() {
  const requireWorkspace = createRequire(path.join(root, 'package.json'));
  const puppeteer = requireWorkspace('puppeteer');
  report.puppeteer = requireWorkspace('puppeteer/package.json').version;
  const candidates = [process.env.BASELINE_BROWSER, await puppeteer.executablePath(),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean);
  const executablePath = candidates.find(candidate => fs.existsSync(candidate));
  if (!executablePath) { report.browserBlocker = 'NO_INSTALLED_BROWSER'; return; }
  if (freeBytes(temporary) < 20 * 1024 * 1024) { report.browserBlocker = 'LESS_THAN_20_MIB_FREE'; return; }
  browser = await puppeteer.launch({ headless: true, executablePath, userDataDir: path.join(temporary, '.browser-profile'),
    args: ['--disable-background-networking', '--disable-sync', '--no-first-run', '--disk-cache-size=1048576', '--media-cache-size=1048576'] });
  report.browser = await browser.version();
  for (const width of [390, 1440]) {
    for (const theme of ['light', 'dark']) {
      if (interrupted) throw new Error('INTERRUPTED');
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      const evidence = { width, height: width === 390 ? 844 : 1000, theme, states: [], blockedRequests: 0, pageErrors: 0 };
      report.captures.push(evidence);
      page.on('pageerror', () => { evidence.pageErrors++; });
      await page.setViewport({ width, height: evidence.height, deviceScaleFactor: 1 });
      await page.setBypassServiceWorker(true);
      await page.setRequestInterception(true);
      page.on('request', request => {
        const url = new URL(request.url());
        const local = url.origin === 'http://127.0.0.1:8080';
        const asset = url.protocol === 'https:' && ['image', 'font', 'stylesheet'].includes(request.resourceType());
        if (local || asset || ['data:', 'blob:'].includes(url.protocol)) void request.continue().catch(() => {});
        else { evidence.blockedRequests++; void request.abort('blockedbyclient').catch(() => {}); }
      });
      page.setDefaultTimeout(12000);
      let step = 'language';
      const shot = async state => {
        if (freeBytes(destination) < 12 * 1024 * 1024) throw new Error('LOW_DISK_SPACE');
        await sleep(450);
        const filename = `${width}-${theme}-${state}.jpg`;
        const dom = await page.evaluate(() => ({
          theme: document.documentElement.getAttribute('data-theme'),
          screens: [...document.querySelectorAll('.screen.active')].map(element => element.id),
          dialogs: [...document.querySelectorAll('[role="dialog"][aria-hidden="false"]')].map(element => element.id),
          menuCards: document.querySelectorAll('.product-card').length,
          cartRows: document.querySelector('#cartSheetItemsList')?.children.length || 0,
          bodyOverflow: document.documentElement.scrollWidth > innerWidth,
          images: [...document.images].filter(image => image.getBoundingClientRect().width > 0)
            .reduce((count, image) => ({ total: count.total + 1, loaded: count.loaded + Number(image.complete && image.naturalWidth > 0),
              fallback: count.fallback + Number(image.currentSrc.startsWith('data:image/svg')) }), { total: 0, loaded: 0, fallback: 0 })
        }));
        await page.screenshot({ path: path.join(destination, filename), type: 'jpeg', quality: 65, fullPage: false });
        evidence.states.push({ state, file: filename, dom });
      };
      const click = async selector => {
        await page.waitForSelector(selector, { visible: true });
        await page.click(selector);
      };
      try {
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
        await page.goto('http://127.0.0.1:8080/?merchant=coffeenity&table=5', { waitUntil: 'networkidle2' });
        if (theme === 'dark') await click('#btnLangThemeToggle');
        await shot('language');
        step = 'chat';
        await click('.lang-card-pill[data-lang="id-ID"]');
        await page.waitForSelector('#screenChatCashier.active');
        await shot('chat');
        step = 'menu';
        await click('#btnModeTrigger');
        await click('#optModeMenu');
        await page.waitForSelector('#screenMenuCatalog.active .product-card');
        await shot('menu');
        step = 'modifier';
        await click('.product-card .product-card-body');
        await page.waitForSelector('#modifierModalBackdrop[aria-hidden="false"]');
        await shot('modifier');
        step = 'cart';
        await click('#btnAddCustomizedToCart');
        await page.waitForSelector('#modifierModalBackdrop[aria-hidden="true"]');
        await click('#btnCatalogCartPill');
        await page.waitForSelector('#cartBackdrop[aria-hidden="false"]');
        await shot('cart');
        evidence.status = 'CAPTURED';
      } catch (error) {
        evidence.status = 'PARTIAL';
        evidence.failedStep = step;
        evidence.errorType = error.name;
        if (error.message === 'LOW_DISK_SPACE') evidence.blocker = 'LOW_DISK_SPACE';
      } finally { await context.close(); }
    }
  }
  await browser.close();
  browser = null;
}

async function main() {
  fs.mkdirSync(destination, { recursive: true });
  report.baselineCommit = git(['rev-parse', '--verify', baseline + '^{commit}']).toString().trim();
  report.workspaceHead = git(['rev-parse', 'HEAD']).toString().trim();
  report.workingTreeAtStart = git(['status', '--porcelain']).toString().trim().split(/\r?\n/).filter(Boolean);
  try {
    report.freeBytesAtStart = freeBytes(os.tmpdir());
    if (report.freeBytesAtStart < 20 * 1024 * 1024) throw new Error('INSUFFICIENT_TEMP_SPACE');
    // Windows can permit wildcard and specific-address binds to coexist.
    await available('127.0.0.1');
    await available('0.0.0.0');
    try { await available('::'); } catch (error) { if (!['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(error.code)) throw error; }
    temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'aiodma-baseline-'));
    const entries = git(['ls-tree', '-r', '--name-only', '-z', report.baselineCommit]).toString().split('\0').filter(Boolean);
    report.snapshotFiles = [];
    let snapshotBytes = 0;
    let allocatedBytes = 0;
    const assetCopies = new Map();
    for (const file of entries) {
      if (!/^(server\.js|package\.json|index\.html|admin\.html|manifest\.json|sw\.js|[^/]+\.(png|jpg|jpeg|webp|svg|ico)|css\/.*|js\/.*|data\/.*\.json|tests\/.*\.js|assets\/.*)$/.test(file)) continue;
      const target = path.resolve(temporary, file);
      if (!target.startsWith(temporary + path.sep)) throw new Error('UNSAFE_SNAPSHOT_PATH');
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const contents = git(['show', report.baselineCommit + ':' + file]);
      snapshotBytes += contents.length;
      const digest = crypto.createHash('sha256').update(contents).digest('hex');
      const duplicate = file.startsWith('assets/') && assetCopies.get(digest);
      if (duplicate) fs.linkSync(duplicate, target);
      else {
        allocatedBytes += contents.length;
        if (allocatedBytes > 16 * 1024 * 1024 || freeBytes(temporary) - contents.length < 12 * 1024 * 1024) throw new Error('INSUFFICIENT_SNAPSHOT_SPACE');
        fs.writeFileSync(target, contents);
        if (file.startsWith('assets/')) assetCopies.set(digest, target);
      }
      report.snapshotFiles.push({ file, sha256: hash(target) });
    }
    fs.writeFileSync(path.join(temporary, '.baseline-guard.cjs'), guard);
    report.snapshotBytes = snapshotBytes;
    report.snapshotAllocatedBytes = allocatedBytes;
    const runner = fs.readFileSync(path.join(temporary, 'tests', 'run_all_tests.js'), 'utf8');
    const suites = [...runner.matchAll(/file:\s*'([a-zA-Z0-9_]+\.js)'/g)].map(match => match[1]);
    if (suites.length !== 12) throw new Error('UNEXPECTED_SUITE_INVENTORY');
    await startServer();
    if (process.env.BASELINE_TESTS_ONLY === '1') report.browserBlocker = 'EXPLICIT_TESTS_ONLY_RUN';
    else try { await capture(); } catch (error) { report.browserFailure = error.name; }
    for (const file of suites) {
      if (interrupted) throw new Error('INTERRUPTED');
      if (server.exitCode !== null || server.signalCode !== null) throw new Error('SERVER_DIED');
      await runSuite(file);
    }
    report.status = 'COMPLETED_WITH_LEGACY_RESULTS';
  } catch (error) {
    report.status = error.code === 'EADDRINUSE' ? 'BLOCKED_PORT_8080_IN_USE' : 'HARNESS_INCOMPLETE';
    report.errorCode = error.code || (/^[A-Z0-9_]+$/.test(error.message) ? error.message : error.name);
  } finally {
    const cleanupErrors = [];
    for (const action of [() => stop(activeTest), () => browser?.close(), () => stop(server)]) {
      try { await action(); } catch { cleanupErrors.push('PROCESS_CLEANUP_FAILED'); }
    }
    report.originalDataUnchanged = fs.existsSync(dataPath) && hash(dataPath) === dataBefore;
    report.serverStopped = !server || server.exitCode !== null || server.signalCode !== null;
    if (temporary) {
      const resolved = fs.realpathSync(temporary);
      const tempRoot = fs.realpathSync(os.tmpdir());
      if (path.dirname(resolved) !== tempRoot || !path.basename(resolved).startsWith('aiodma-baseline-')) throw new Error('UNSAFE_CLEANUP_PATH');
      try { fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
      catch { cleanupErrors.push('TEMP_CLEANUP_FAILED'); }
    }
    report.tempRemoved = !temporary || !fs.existsSync(temporary);
    report.cleanupErrors = cleanupErrors;
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(destination, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('Evidence: ' + path.relative(root, destination));
    console.log('Original data unchanged: ' + report.originalDataUnchanged + '; server stopped: ' + report.serverStopped + '; temp removed: ' + report.tempRemoved);
    process.exitCode = report.status !== 'COMPLETED_WITH_LEGACY_RESULTS' || !report.originalDataUnchanged || cleanupErrors.length ||
      report.browserFailure || report.browserBlocker || report.captures.some(capture => capture.status !== 'CAPTURED') || report.suites.some(suite => suite.status !== 'LEGACY_EXIT_ZERO') ? 1 : 0;
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  interrupted = true;
  activeTest?.kill('SIGKILL');
  server?.kill('SIGKILL');
});
main().catch(() => { console.error('Baseline harness failed; inspect structured evidence if present.'); process.exitCode = 1; });
