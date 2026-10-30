// scripts/serve-build.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const HOST = '127.0.0.1';
const BUILD_DIR = path.resolve(__dirname, '../build');

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

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/PROJECT-MANAGEMENT/`);
});
