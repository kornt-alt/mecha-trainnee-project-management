// scripts/reproduce-and-diagnose.js
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
  let urlPath = req.url.split('?')[0];
  if (urlPath.startsWith('/PROJECT-MANAGEMENT')) {
    urlPath = urlPath.slice('/PROJECT-MANAGEMENT'.length);
  }
  if (!urlPath || urlPath === '/') urlPath = '/index.html';
  let filePath = path.join(BUILD_DIR, urlPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(BUILD_DIR, 'index.html');
  }
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.json': 'application/json',
  };
  res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
  fs.createReadStream(filePath).pipe(res);
});

async function run() {
  await new Promise((resolve) => server.listen(PORT, HOST, resolve));
  console.log(`Server started on http://${HOST}:${PORT}/PROJECT-MANAGEMENT/`);

  const chromeUserData = `/tmp/cr-repro-${Date.now()}`;
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

  if (!target) {
    throw new Error('Target page not found');
  }

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
    const outPath = path.join(SCREENSHOT_DIR, name);
    fs.writeFileSync(outPath, buf);
    console.log(`Saved screenshot: ${name}`);
  };

  // Wait for React to mount
  for (let i = 0; i < 20; i++) {
    const found = await evalJs('!!document.querySelector(".category-treemap-card")');
    if (found) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  // 1. Initial Overview Mode measurements
  const overviewData = await evalJs(`
    (() => {
      const card = document.querySelector('.category-treemap-card');
      const cardBody = card.querySelector('.card-body');
      const unfinished = document.querySelector('.unfinished-tasks-card');
      const row = document.querySelector('.dashboard-blocks-row');
      const col = card.parentElement;
      return {
        cardHeight: card.getBoundingClientRect().height,
        cardBodyHeight: cardBody.getBoundingClientRect().height,
        colHeight: col.getBoundingClientRect().height,
        unfinishedHeight: unfinished ? unfinished.getBoundingClientRect().height : null,
        rowHeight: row ? row.getBoundingClientRect().height : null,
      };
    })()
  `);
  console.log('=== OVERVIEW MODE ===');
  console.log(overviewData);
  await takeScreenshot('01-repro-overview.png');

  // 2. Click category with few projects: 'ซ่อมบำรุง' (4 projects)
  await evalJs(`
    (() => {
      const tiles = Array.from(document.querySelectorAll('.category-treemap-tile'));
      const t = tiles.find(el => el.textContent.includes('ซ่อมบำรุง'));
      if (t) t.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 500));

  const fewData = await evalJs(`
    (() => {
      const card = document.querySelector('.category-treemap-card');
      const cardBody = card.querySelector('.card-body');
      const detail = document.querySelector('.category-detail');
      const scroll = document.querySelector('.category-detail-scroll');
      const table = document.querySelector('.category-detail-table');
      const unfinished = document.querySelector('.unfinished-tasks-card');
      const row = document.querySelector('.dashboard-blocks-row');
      const col = card.parentElement;
      const rows = document.querySelectorAll('.category-detail-table tbody tr');
      return {
        rowCount: rows.length,
        cardHeight: card.getBoundingClientRect().height,
        cardBodyHeight: cardBody.getBoundingClientRect().height,
        detailHeight: detail ? detail.getBoundingClientRect().height : null,
        scrollHeight: scroll ? scroll.getBoundingClientRect().height : null,
        tableHeight: table ? table.getBoundingClientRect().height : null,
        colHeight: col.getBoundingClientRect().height,
        unfinishedHeight: unfinished ? unfinished.getBoundingClientRect().height : null,
        rowHeight: row ? row.getBoundingClientRect().height : null,
      };
    })()
  `);
  console.log('=== FEW PROJECTS ("ซ่อมบำรุง" - 4) ===');
  console.log(fewData);
  await takeScreenshot('02-repro-few.png');

  // 3. Click category with many projects: 'ระบบซอฟต์แวร์' (8 projects)
  await evalJs(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('.category-tab'));
      const t = tabs.find(el => el.textContent.includes('ระบบซอฟต์แวร์'));
      if (t) t.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 500));

  const manyData = await evalJs(`
    (() => {
      const card = document.querySelector('.category-treemap-card');
      const cardBody = card.querySelector('.card-body');
      const detail = document.querySelector('.category-detail');
      const scroll = document.querySelector('.category-detail-scroll');
      const table = document.querySelector('.category-detail-table');
      const unfinished = document.querySelector('.unfinished-tasks-card');
      const row = document.querySelector('.dashboard-blocks-row');
      const col = card.parentElement;
      const rows = document.querySelectorAll('.category-detail-table tbody tr');
      return {
        rowCount: rows.length,
        cardHeight: card.getBoundingClientRect().height,
        cardBodyHeight: cardBody.getBoundingClientRect().height,
        detailHeight: detail ? detail.getBoundingClientRect().height : null,
        scrollHeight: scroll ? scroll.getBoundingClientRect().height : null,
        tableHeight: table ? table.getBoundingClientRect().height : null,
        colHeight: col.getBoundingClientRect().height,
        unfinishedHeight: unfinished ? unfinished.getBoundingClientRect().height : null,
        rowHeight: row ? row.getBoundingClientRect().height : null,
      };
    })()
  `);
  console.log('=== MANY PROJECTS ("ระบบซอฟต์แวร์" - 8) ===');
  console.log(manyData);
  await takeScreenshot('03-repro-many.png');

  // 4. Now dynamically inject 20 projects into the table to see what happens with really many projects!
  console.log('=== TESTING INJECTED 25 PROJECTS ===');
  await evalJs(`
    (() => {
      const tbody = document.querySelector('.category-detail-table tbody');
      if (tbody) {
        for (let i = 1; i <= 20; i++) {
          const tr = document.createElement('tr');
          tr.innerHTML = '<td class="category-detail-name">โปรเจกต์ทดสอบเพิ่มเติม #' + i + '</td><td class="text-nowrap"><span class="badge category-detail-status category-status-in-progress">กำลังทำ</span></td><td class="text-nowrap">30 พ.ย. 2569</td>';
          tbody.appendChild(tr);
        }
      }
    })()
  `);
  await new Promise((r) => setTimeout(r, 300));

  const injectedData = await evalJs(`
    (() => {
      const card = document.querySelector('.category-treemap-card');
      const cardBody = card.querySelector('.card-body');
      const detail = document.querySelector('.category-detail');
      const scroll = document.querySelector('.category-detail-scroll');
      const table = document.querySelector('.category-detail-table');
      const unfinished = document.querySelector('.unfinished-tasks-card');
      const row = document.querySelector('.dashboard-blocks-row');
      const col = card.parentElement;
      const rows = document.querySelectorAll('.category-detail-table tbody tr');
      return {
        rowCount: rows.length,
        cardHeight: card.getBoundingClientRect().height,
        cardBodyHeight: cardBody.getBoundingClientRect().height,
        detailHeight: detail ? detail.getBoundingClientRect().height : null,
        scrollHeight: scroll ? scroll.getBoundingClientRect().height : null,
        tableHeight: table ? table.getBoundingClientRect().height : null,
        colHeight: col.getBoundingClientRect().height,
        unfinishedHeight: unfinished ? unfinished.getBoundingClientRect().height : null,
        rowHeight: row ? row.getBoundingClientRect().height : null,
      };
    })()
  `);
  console.log('=== 28 PROJECTS (INJECTED) ===');
  console.log(injectedData);
  await takeScreenshot('04-repro-injected-many.png');

  // Detailed DOM Hierarchy Inspection
  const hierarchy = await evalJs(`
    (() => {
      let el = document.querySelector('.category-detail-scroll');
      const chain = [];
      while (el && el !== document.body) {
        const cs = window.getComputedStyle(el);
        chain.push({
          tag: el.tagName.toLowerCase(),
          className: el.className,
          rect: el.getBoundingClientRect(),
          height: cs.height,
          minHeight: cs.minHeight,
          maxHeight: cs.maxHeight,
          flex: cs.flex,
          flexGrow: cs.flexGrow,
          flexShrink: cs.flexShrink,
          flexBasis: cs.flexBasis,
          display: cs.display,
          alignItems: cs.alignItems,
          alignSelf: cs.alignSelf,
          overflow: cs.overflow,
          overflowY: cs.overflowY,
        });
        el = el.parentElement;
      }
      return chain;
    })()
  `);
  console.log('=== DOM HIERARCHY CHAIN ===');
  console.log(JSON.stringify(hierarchy, null, 2));

  ws.close();
  chrome.kill();
  server.close();
  console.log('Reproduction done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
