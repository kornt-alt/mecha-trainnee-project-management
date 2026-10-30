// scripts/visual-verification.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3001;
const HOST = '127.0.0.1';
const BUILD_DIR = path.resolve(__dirname, '../build');
const SCREENSHOT_DIR = path.resolve(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const server = http.createServer((req, res) => {
  let p = req.url.split('?')[0].replace('/PROJECT-MANAGEMENT', '') || '/index.html';
  let fp = path.join(BUILD_DIR, p);
  if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) fp = path.join(BUILD_DIR, 'index.html');
  const ext = path.extname(fp).toLowerCase();
  const types = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.json': 'application/json',
  };
  res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
  fs.createReadStream(fp).pipe(res);
});

async function run() {
  await new Promise((resolve) => server.listen(PORT, HOST, resolve));
  console.log(`Server started on http://${HOST}:${PORT}/PROJECT-MANAGEMENT/`);

  const chromeUserData = `/tmp/cr-verify-${Date.now()}`;
  const chrome = spawn('/usr/bin/chromium', [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    `--user-data-dir=${chromeUserData}`,
    '--remote-debugging-port=9222',
    '--window-size=1280,1000',
    `http://${HOST}:${PORT}/PROJECT-MANAGEMENT/`,
  ]);

  await new Promise((r) => setTimeout(r, 2000));
  const res = await fetch(`http://${HOST}:9222/json/list`);
  const list = await res.json();
  const target = list.find((t) => t.type === 'page' && t.url.includes('PROJECT-MANAGEMENT'));
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  let id = 1;
  const send = (m, p = {}) =>
    new Promise((resolve, reject) => {
      const curId = id++;
      const handler = (e) => {
        const d = JSON.parse(e.data);
        if (d.id === curId) {
          ws.removeEventListener('message', handler);
          if (d.error) reject(d.error);
          else resolve(d.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method: m, params: p }));
    });

  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    return r.result ? r.result.value : null;
  };

  const takeScreenshot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(r.data, 'base64');
    fs.writeFileSync(path.join(SCREENSHOT_DIR, name), buf);
    console.log(`[Screenshot Saved] ${name}`);
  };

  // Wait for React
  for (let i = 0; i < 20; i++) {
    const found = await evalJs('!!document.querySelector(".category-treemap-card")');
    if (found) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  // Helper to extract rect
  const getRect = async (selector) => {
    return evalJs(`
      (() => {
        const el = document.querySelector('${selector}');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
      })()
    `);
  };

  // Helper to scroll page into view of treemap card so screenshots capture the card nicely
  await evalJs(`
    (() => {
      const card = document.querySelector('.category-treemap-card');
      if (card) card.scrollIntoView({ block: 'center' });
    })()
  `);
  await new Promise((r) => setTimeout(r, 400));

  console.log('\n--- 1. DESKTOP TESTS (1280x1000) ---');
  const deskOverviewRect = await getRect('.category-treemap-card');
  console.log('Desktop Overview Card Rect:', deskOverviewRect);
  await takeScreenshot('01-desktop-overview.png');

  // Click few projects: 'ซ่อมบำรุง' (4)
  console.log("Clicking 'ซ่อมบำรุง'...");
  await evalJs(`
    (() => {
      const tiles = Array.from(document.querySelectorAll('.category-treemap-tile'));
      const t = tiles.find(el => el.textContent.includes('ซ่อมบำรุง'));
      if (t) t.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 500));
  const deskFewRect = await getRect('.category-treemap-card');
  console.log('Desktop Few Projects Card Rect:', deskFewRect);
  await takeScreenshot('02-desktop-category-few.png');

  // Click many projects: 'ระบบซอฟต์แวร์' (8)
  console.log("Clicking 'ระบบซอฟต์แวร์'...");
  await evalJs(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('.category-tab'));
      const t = tabs.find(el => el.textContent.includes('ระบบซอฟต์แวร์'));
      if (t) t.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 500));
  const deskManyRect = await getRect('.category-treemap-card');
  console.log('Desktop Many Projects Card Rect:', deskManyRect);

  // Measure stationary controls BEFORE scroll
  const topBefore = await getRect('.category-detail-top');
  const headerBefore = await getRect('.category-detail-header');
  const searchBefore = await getRect('.category-detail-search');
  const theadBefore = await getRect('.category-detail-table thead');
  const firstRowBefore = await getRect('.category-detail-table tbody tr:first-child');

  await takeScreenshot('03-desktop-category-many.png');

  // Scroll table to bottom
  console.log('Scrolling project table to bottom...');
  await evalJs(`
    (() => {
      const scroll = document.querySelector('.category-detail-scroll');
      if (scroll) scroll.scrollTop = scroll.scrollHeight;
    })()
  `);
  await new Promise((r) => setTimeout(r, 400));

  const deskManyScrolledRect = await getRect('.category-treemap-card');
  console.log('Desktop Many Projects (Scrolled) Card Rect:', deskManyScrolledRect);

  // Measure stationary controls AFTER scroll
  const topAfter = await getRect('.category-detail-top');
  const headerAfter = await getRect('.category-detail-header');
  const searchAfter = await getRect('.category-detail-search');
  const theadAfter = await getRect('.category-detail-table thead');
  const firstRowAfter = await getRect('.category-detail-table tbody tr:first-child');

  console.log('--- STATIONARY & STICKY CHECKS (Desktop) ---');
  console.log('Top tabs moved Y:', topAfter.top - topBefore.top, '(should be 0)');
  console.log('Header title moved Y:', headerAfter.top - headerBefore.top, '(should be 0)');
  console.log('Search box moved Y:', searchAfter.top - searchBefore.top, '(should be 0)');
  console.log('Sticky thead moved Y:', theadAfter.top - theadBefore.top, '(should be 0)');
  console.log('First row moved Y:', firstRowAfter.top - firstRowBefore.top, '(should be negative / scrolled out)');

  await takeScreenshot('04-desktop-category-many-scrolled.png');

  console.log('\n--- 2. MOBILE TESTS (375x812) ---');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true,
  });

  // Back to overview
  await evalJs(`
    (() => {
      const btn = document.querySelector('.category-back-btn');
      if (btn) btn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 500));

  await evalJs(`
    (() => {
      const card = document.querySelector('.category-treemap-card');
      if (card) card.scrollIntoView({ block: 'center' });
    })()
  `);
  await new Promise((r) => setTimeout(r, 400));

  const mobOverviewRect = await getRect('.category-treemap-card');
  console.log('Mobile Overview Card Rect:', mobOverviewRect);
  await takeScreenshot('05-mobile-overview.png');

  // Click few projects: 'ซ่อมบำรุง'
  await evalJs(`
    (() => {
      const tiles = Array.from(document.querySelectorAll('.category-treemap-tile'));
      const t = tiles.find(el => el.textContent.includes('ซ่อมบำรุง'));
      if (t) t.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 500));
  const mobFewRect = await getRect('.category-treemap-card');
  console.log('Mobile Few Projects Card Rect:', mobFewRect);
  await takeScreenshot('06-mobile-category-few.png');

  // Click many projects: 'ระบบซอฟต์แวร์'
  await evalJs(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('.category-tab'));
      const t = tabs.find(el => el.textContent.includes('ระบบซอฟต์แวร์'));
      if (t) t.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 500));
  const mobManyRect = await getRect('.category-treemap-card');
  console.log('Mobile Many Projects Card Rect:', mobManyRect);
  await takeScreenshot('07-mobile-category-many.png');

  // Scroll mobile table
  await evalJs(`
    (() => {
      const scroll = document.querySelector('.category-detail-scroll');
      if (scroll) scroll.scrollTop = scroll.scrollHeight;
    })()
  `);
  await new Promise((r) => setTimeout(r, 400));
  const mobManyScrolledRect = await getRect('.category-treemap-card');
  console.log('Mobile Many Projects (Scrolled) Card Rect:', mobManyScrolledRect);
  await takeScreenshot('08-mobile-category-many-scrolled.png');

  console.log('\n=== SUMMARY VERIFICATION RESULTS ===');
  console.log(`Desktop Overview Card Height: ${deskOverviewRect.height}px`);
  console.log(`Desktop Few Projects Card Height: ${deskFewRect.height}px`);
  console.log(`Desktop Many Projects Card Height: ${deskManyRect.height}px`);
  console.log(`Desktop Scrolled Card Height: ${deskManyScrolledRect.height}px`);
  console.log(`Height Difference (Many vs Few): ${deskManyRect.height - deskFewRect.height}px (MUST BE 0)`);
  console.log(`Height Difference (Many vs Overview): ${deskManyRect.height - deskOverviewRect.height}px (MUST BE 0)`);

  console.log(`Mobile Overview Card Height: ${mobOverviewRect.height}px`);
  console.log(`Mobile Few Projects Card Height: ${mobFewRect.height}px`);
  console.log(`Mobile Many Projects Card Height: ${mobManyRect.height}px`);
  console.log(`Mobile Scrolled Card Height: ${mobManyScrolledRect.height}px`);
  console.log(`Mobile Height Difference (Many vs Few): ${mobManyRect.height - mobFewRect.height}px (MUST BE 0)`);
  console.log(`Mobile Height Difference (Many vs Overview): ${mobManyRect.height - mobOverviewRect.height}px (MUST BE 0)`);

  ws.close();
  chrome.kill();
  server.close();
  console.log('Visual verification script finished successfully.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
