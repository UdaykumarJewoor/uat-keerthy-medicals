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

function modifyHtml(html) {
  let modified = html;
  
  // Replace absolute and relative logo URLs with /image.png
  modified = modified.replace(/https?:\/\/(?:assets|www|images)\.1mg\.com\/[^\s"'`>]*tata_1mg_logo\.(?:svg|png|jpg|jpeg|gif)/gi, '/image.png');
  modified = modified.replace(/https?:\/\/(?:assets|www|images)\.1mg\.com\/[^\s"'`>]*1mg-logo-large\.(?:svg|png|jpg|jpeg|gif)/gi, '/image.png');
  modified = modified.replace(/\/images\/tata_1mg_logo\.svg/g, '/image.png');

  // Replace absolute references to the live site with localhost:3000
  modified = modified.replace(/https?:\/\/www\.1mg\.com/g, 'http://localhost:3000');
  modified = modified.replace(/https?:\/\/1mg\.com/g, 'http://localhost:3000');

  // Force logo replacement in CSS style
  const styleToInject = `
    <style>
      /* Force our logo on the main header logo elements */
      .Header__logo__Ellyq, 
      .Header__logoFallback___SCxk,
      img[src*="tata_1mg_logo"],
      img[src*="1mg-logo"],
      img[src*="image.png"],
      .DioRxProcessing__logo__NQ6Ju,
      .PackageCard__labLogo__t4Tk5 {
        content: url('/image.png') !important;
        opacity: 1 !important;
        visibility: visible !important;
        width: 100% !important;
        height: auto !important;
        max-width: 124px !important;
        max-height: 36px !important;
        object-fit: contain !important;
      }
      
      /* Force background images if any */
      .logo-container a, 
      .logo-container img {
        background-image: url('/image.png') !important;
      }
    </style>
  `;

  if (modified.includes('</head>')) {
    modified = modified.replace('</head>', `${styleToInject}\n</head>`);
  } else {
    modified += styleToInject;
  }

  // Inject click interceptor script if not already present
  if (!modified.includes('Navigation intercept error')) {
    const scriptToInject = `
    <script>
      (function() {
        document.addEventListener('click', function(e) {
          const anchor = e.target.closest('a');
          if (anchor && anchor.href) {
            try {
              const url = new URL(anchor.href);
              const is1mg = url.hostname === 'www.1mg.com' || url.hostname === '1mg.com' || url.hostname === 'localhost' || url.origin === window.location.origin;
              if (is1mg) {
                e.preventDefault();
                e.stopPropagation();
                const targetUrl = new URL(anchor.href);
                targetUrl.protocol = window.location.protocol;
                targetUrl.host = window.location.host;
                window.location.href = targetUrl.href;
              }
            } catch (err) {
              console.error('Navigation intercept error:', err);
            }
          }
        }, true);
      })();
    </script>
    `;
    if (modified.includes('</body>')) {
      modified = modified.replace('</body>', `${scriptToInject}\n</body>`);
    } else {
      modified += scriptToInject;
    }
  }

  return modified;
}

const server = http.createServer((req, res) => {
  let safeUrl = decodeURIComponent(req.url);
  
  // Strip query parameters for local file checking
  const urlPath = safeUrl.split('?')[0];

  // Intercept logo requests and serve the custom logo
  if (
    urlPath === '/image.png' || 
    urlPath === '/images/tata_1mg_logo.svg' || 
    urlPath.endsWith('tata_1mg_logo.svg') || 
    urlPath.endsWith('1mg-logo-large.png')
  ) {
    const logoPath = path.join(__dirname, 'subscription-plan', 'image.png');
    if (fs.existsSync(logoPath)) {
      res.writeHead(200, { 
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      fs.createReadStream(logoPath).pipe(res);
      return;
    }
  }

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
    
    if (ext === '.html') {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
          return;
        }
        const modifiedHtml = modifyHtml(data);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(modifiedHtml);
      });
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    }
    return;
  }

  // Otherwise, proxy the request to www.1mg.com
  console.log(`Proxying: ${req.method} ${req.url}`);
  
  const headers = { ...req.headers };
  headers['host'] = TARGET_HOST;
  headers['accept-encoding'] = 'identity'; // Request uncompressed content so we can modify HTML
  
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
    // Rewrite headers (location redirects and cookie domains)
    const responseHeaders = { ...proxyRes.headers };
    
    if (responseHeaders['location']) {
      let location = responseHeaders['location'];
      if (location.includes('www.1mg.com') || location.includes('1mg.com')) {
        try {
          const locUrl = new URL(location);
          locUrl.protocol = 'http';
          locUrl.host = req.headers['host'] || `localhost:${PORT}`;
          responseHeaders['location'] = locUrl.href;
        } catch (e) {}
      }
    }

    if (responseHeaders['set-cookie']) {
      let cookies = responseHeaders['set-cookie'];
      if (Array.isArray(cookies)) {
        responseHeaders['set-cookie'] = cookies.map(cookie => {
          return cookie.replace(/domain=\.?[a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+/gi, '');
        });
      } else if (typeof cookies === 'string') {
        responseHeaders['set-cookie'] = cookies.replace(/domain=\.?[a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+/gi, '');
      }
    }

    const contentType = proxyRes.headers['content-type'] || '';
    
    // If it's an HTML page, inject our click interceptor script and replace logo
    if (contentType.includes('text/html')) {
      let chunks = [];
      proxyRes.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      proxyRes.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let html = buffer.toString('utf8');
        
        const modifiedHtml = modifyHtml(html);
        const modifiedBuffer = Buffer.from(modifiedHtml, 'utf8');
        responseHeaders['content-length'] = modifiedBuffer.length;
        
        // Remove content-encoding header in case the remote server sent compressed data anyway
        delete responseHeaders['content-encoding'];
        
        res.writeHead(proxyRes.statusCode, responseHeaders);
        res.end(modifiedBuffer);
      });
    } else {
      res.writeHead(proxyRes.statusCode, responseHeaders);
      proxyRes.pipe(res);
    }
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
