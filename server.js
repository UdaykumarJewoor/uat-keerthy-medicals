const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const TARGET_HOST = 'www.1mg.com';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let safeUrl = decodeURIComponent(req.url);
  
  // Strip query parameters for local file checking
  const urlPath = safeUrl.split('?')[0];

  if (safeUrl === '/' || safeUrl.startsWith('/?')) {
    safeUrl = '/1mg.html';
  }

  let filePath = path.join(__dirname, urlPath === '/' ? '/1mg.html' : urlPath);

  // If the path exists and is a directory, check for an index.html inside it
  if (filePath.startsWith(__dirname) && fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // If the file exists locally and is inside this directory, serve it
  if (filePath.startsWith(__dirname) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Otherwise, proxy the request to www.1mg.com
  console.log(`Proxying: ${req.method} ${req.url}`);
  
  const headers = { ...req.headers };
  headers['host'] = TARGET_HOST;
  
  if (headers['origin']) {
    headers['origin'] = 'https://' + TARGET_HOST;
  }
  if (headers['referer']) {
    headers['referer'] = 'https://' + TARGET_HOST + req.url;
  }

  const proxyReq = https.request({
    host: TARGET_HOST,
    port: 443,
    path: req.url,
    method: req.method,
    headers: headers,
    rejectUnauthorized: false
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`Proxy error for ${req.url}: ${err.message}`);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway');
  });

  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}/`);
});
