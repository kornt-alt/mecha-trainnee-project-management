// scripts/diagnose-repro.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3001;
const CDP_PORT = 9222;
const HOST = '127.0.0.1';
const BUILD_DIR = path.resolve(__dirname, '../build');
const SCREENSHOT_DIR = path.resolve(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath.startsWith('/PROJECT-MANAGEMENT')) {
    urlPath = urlPath.slice('/PROJECT-MANAGEMENT'.length);
  }
  if (!urlPath || urlPath === '/') {
    urlPath = '/index.html';
  }

  let filePath = path.join(BUILD_DIR, urlPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(BUILD_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading ' + urlPath);
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

async function run() {
  await new Promise((resolve) => server.listen(PORT, HOST, resolve));
  console.log(`Server listening on http://${HOST}:${PORT}/PROJECT-MANAGEMENT/`);

  const chromeUserData = `/tmp/chromium-profile-${Date.now()}`;
  const chrome = spawn('/usr/bin/chromium', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--user-data-dir=${chromeUserData}`,
    `--remote-debugging-port=${CDP_PORT}`,
    '--window-size=1280,900',
    'about:blank',
  ]);

  // Wait for CDP to be available
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 200));
    try {
      const res = await fetch(`http://${HOST}:${CDP_PORT}/json/list`);
      const list = await res.json();
      if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
        wsUrl = list[0].webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    console.error('Failed to get WebSocket debugger URL');
    chrome.kill();
    server.close();
    process.exit(1);
  }

  console.log('Connected to CDP at', wsUrl);
  const ws = new WebSocket(wsUrl);

  let messageId = 1;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && callbacks.has(data.id)) {
      const cb = callbacks.get(data.id);
      callbacks.delete(data.id);
      if (data.error) cb.reject(data.error);
      else cb.resolve(data.result);
    }
  };

  const send = (method, params = {}) => {
    const id = messageId++;
    return new Promise((resolve, reject) => {
      callbacks.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await new Promise((resolve) => (ws.onopen = resolve));

  await send('Page.enable');
  await send('DOM.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  console.log('Navigating to app...');
  await send('Page.navigate', { url: `http://${HOST}:${PORT}/PROJECT-MANAGEMENT/` });
  await new Promise((r) => setTimeout(r, 2000));

  const evalJs = async (expr) => {
    const res = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result ? res.result.value : null;
  };

  const screenshot = async (filename) => {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    fs.writeFileSync(path.join(SCREENSHOT_DIR, filename), buffer);
    console.log(`Saved screenshot: ${filename}`);
  };

  // Check initial state
  const overviewRects = await evalJs(`
    (() => {
      const card = document.querySelector('.category-treemap-card');
      const cardBody = card ? card.querySelector('.card-body') : null;
      const unfinished = document.querySelector('.unfinished-tasks-card');
      const row = document.querySelector('.dashboard-blocks-row');
      return {
        card: card ? card.getBoundingClientRect() : null,
        cardBody: cardBody ? cardBody.getBoundingClientRect() : null,
        unfinished: unfinished ? unfinished.getBoundingClientRect() : null,
        row: row ? row.getBoundingClientRect() : null,
      };
    })()
  `);
  console.log('Overview Mode Rects:', overviewRects);
  await screenshot('01-overview.png');

  // Click category with few projects: 'ซ่อมบำรุง' (4 projects)
  console.log("Clicking 'ซ่อมบำรุง'...");
  await evalJs(`
    (() => {
      const tiles = Array.from(document.querySelectorAll('.category-treemap-tile'));
      const target = tiles.find(t => t.textContent.includes('ซ่อมบำรุง'));
      if (target) target.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 600));

  const fewProjectsRects = await evalJs(`
    (() => {
      const card = document.querySelector('.category-treemap-card');
      const cardBody = card ? card.querySelector('.card-body') : null;
      const detail = document.querySelector('.category-detail');
      const scroll = document.querySelector('.category-detail-scroll');
      const table = document.querySelector('.category-detail-table');
      const unfinished = document.querySelector('.unfinished-tasks-card');
      const row = document.querySelector('.dashboard-blocks-row');
      const rows = document.querySelectorAll('.category-detail-table tbody tr');
      return {
        rowCount: rows.length,
        card: card ? card.getBoundingClientRect() : null,
        cardBody: cardBody ? cardBody.getBoundingClientRect() : null,
        detail: detail ? detail.getBoundingClientRect() : null,
        scroll: scroll ? { ...scroll.getBoundingClientRect(), scrollHeight: scroll.scrollHeight, clientHeight: scroll.clientHeight } : null,
        table: table ? table.getBoundingClientRect() : null,
        unfinished: unfinished ? unfinished.getBoundingClientRect() : null,
        row: row ? row.getBoundingClientRect() : null,
      };
    })()
  `);
  console.log("Few Projects ('ซ่อมบำรุง' - 4) Rects:", fewProjectsRects);
  await screenshot('02-category-few.png');

  // Click tab with many projects: 'ระบบซอฟต์แวร์' (8 projects)
  console.log("Clicking 'ระบบซอฟต์แวร์' tab...");
  await evalJs(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('.category-tab'));
      const target = tabs.find(t => t.textContent.includes('ระบบซอฟต์แวร์'));
      if (target) target.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 600));

  const manyProjectsRects = await evalJs(`
    (() => {
      const card = document.querySelector('.category-treemap-card');
      const cardBody = card ? card.querySelector('.card-body') : null;
      const detail = document.querySelector('.category-detail');
      const scroll = document.querySelector('.category-detail-scroll');
      const table = document.querySelector('.category-detail-table');
      const unfinished = document.querySelector('.unfinished-tasks-card');
      const row = document.querySelector('.dashboard-blocks-row');
      const rows = document.querySelectorAll('.category-detail-table tbody tr');
      return {
        rowCount: rows.length,
        card: card ? card.getBoundingClientRect() : null,
        cardBody: cardBody ? cardBody.getBoundingClientRect() : null,
        detail: detail ? detail.getBoundingClientRect() : null,
        scroll: scroll ? { ...scroll.getBoundingClientRect(), scrollHeight: scroll.scrollHeight, clientHeight: scroll.clientHeight } : null,
        table: table ? table.getBoundingClientRect() : null,
        unfinished: unfinished ? unfinished.getBoundingClientRect() : null,
        row: row ? row.getBoundingClientRect() : null,
      };
    })()
  `);
  console.log("Many Projects ('ระบบซอฟต์แวร์' - 8) Rects:", manyProjectsRects);
  await screenshot('03-category-many.png');

  // Test with even more projects (e.g. inject 20 projects to test behavior with large data)
  console.log('Injecting 20 projects to category and observing...');
  // Let's also scroll to bottom in 'ระบบซอฟต์แวร์'
  await evalJs(`
    (() => {
      const scroll = document.querySelector('.category-detail-scroll');
      if (scroll) scroll.scrollTop = scroll.scrollHeight;
    })()
  `);
  await new Promise((r) => setTimeout(r, 300));
  await screenshot('04-category-many-scrolled.png');

  // Clean up
  ws.close();
  chrome.kill();
  server.close();
  console.log('Diagnosis completed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
