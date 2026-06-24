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

function rebrand(text) {
  if (typeof text !== 'string') return text;
  let rebranded = text;
  
  // Primary brand color replacements
  rebranded = rebranded.replace(/#ff6f61/gi, '#1b9c54');
  rebranded = rebranded.replace(/#ff5443/gi, '#1b9c54');
  rebranded = rebranded.replace(/#e55e51/gi, '#157e43');
  rebranded = rebranded.replace(/rgb\(\s*255\s*,\s*111\s*,\s*97\s*\)/gi, 'rgb(27, 156, 84)');
  rebranded = rebranded.replace(/255\s*,\s*111\s*,\s*97/g, '27, 156, 84');
  
  // Custom button gradients and colors (orange/pink/coral) used in partnerships page
  rebranded = rebranded.replace(/#eb5b26/gi, '#1b9c54');
  rebranded = rebranded.replace(/#e4336f/gi, '#157e43');
  rebranded = rebranded.replace(/rgba\(\s*235\s*,\s*91\s*,\s*38\s*,\s*([\d.]+)\)/gi, 'rgba(27, 156, 84, $1)');
  rebranded = rebranded.replace(/rgba\(\s*228\s*,\s*51\s*,\s*111\s*,\s*([\d.]+)\)/gi, 'rgba(21, 126, 67, $1)');
  rebranded = rebranded.replace(/235\s*,\s*91\s*,\s*38/g, '27, 156, 84');
  rebranded = rebranded.replace(/228\s*,\s*51\s*,\s*111/g, '21, 126, 67');
  
  return rebranded;
}

function modifyHtml(html, url) {
  let modified = html;

  // If this is the ayurveda page, block the React scripts to prevent hydration errors and "Failed to fetch widget data"
  if (url && (url.includes('/ayurveda') || url.includes('/ayurveda/'))) {
    modified = modified.replace(/<script async data-chunk=/g, '<script type="text/blocked" async data-chunk=');
    modified = modified.replace(/<script id="__LOADABLE_REQUIRED_CHUNKS__"/g, '<script id="__LOADABLE_REQUIRED_CHUNKS__" type="text/blocked"');
    modified = modified.replace(/<script id="__LOADABLE_REQUIRED_CHUNKS___ext"/g, '<script id="__LOADABLE_REQUIRED_CHUNKS___ext" type="text/blocked"');

    // Inject client-side image hydration script
    const imageHydrationScript = `
    <script>
      (function() {
        function hydrateImages() {
          console.log('[Image Hydrator] Running image hydration...');
          try {
            const initialData = window.__ROUTER_INITIAL_DATA__;
            if (!initialData) {
              console.log('[Image Hydrator] No __ROUTER_INITIAL_DATA__ found');
              return;
            }
            
            const slugMap = {};
            Object.keys(initialData).forEach(routeKey => {
              const routeData = initialData[routeKey]?.data;
              if (!routeData) return;
              const payload = routeData.payload;
              const widgets = Array.isArray(payload) ? payload : (payload?.data || routeData.data);
              if (Array.isArray(widgets)) {
                widgets.forEach(widget => {
                  const products = widget.value?.data || widget.data;
                  if (Array.isArray(products)) {
                    products.forEach(product => {
                      if (product.slug && product.image) {
                        slugMap[product.slug] = product.image;
                        const cleanSlug = product.slug.replace(/\\/$/, '');
                        slugMap[cleanSlug] = product.image;
                      }
                    });
                  }
                });
              }
            });

            console.log('[Image Hydrator] Found ' + Object.keys(slugMap).length + ' products in state');

            const links = document.querySelectorAll('a[href*="/ayurveda/"]');
            let count = 0;
            links.forEach(link => {
              const href = link.getAttribute('href');
              const cleanHref = href ? href.replace(/\\/$/, '') : '';
              const imageUrl = slugMap[href] || slugMap[cleanHref];
              if (imageUrl) {
                const img = link.querySelector('img');
                if (img) {
                  img.src = imageUrl;
                  // Remove any loading or transparent image classes
                  for (let c of [...img.classList]) {
                    if (c.includes('img-loading') || c.includes('transparentImage') || c.includes('Loader')) {
                      img.classList.remove(c);
                    }
                  }
                  // Force visible styles
                  img.style.opacity = '1';
                  img.style.visibility = 'visible';
                  img.style.display = 'block';
                  img.style.content = 'initial'; // Prevent content override
                  count++;
                }
              }
            });
            console.log('[Image Hydrator] Hydrated ' + count + ' images successfully');
          } catch (e) {
            console.error('[Image Hydrator] Error:', e);
          }
        }
        
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', hydrateImages);
        } else {
          hydrateImages();
        }
        
        // Run after delays to handle slow loads
        setTimeout(hydrateImages, 500);
        setTimeout(hydrateImages, 1500);
      })();
    </script>
    `;
    
    if (modified.includes('</body>')) {
      modified = modified.replace('</body>', `${imageHydrationScript}\n</body>`);
    } else {
      modified += imageHydrationScript;
    }
  }
  
  // Replace absolute and relative logo URLs with /image.png
  modified = modified.replace(/https?:\/\/(?:assets|www|images)\.1mg\.com\/[^\s"'`>]*tata_1mg_logo\.(?:svg|png|jpg|jpeg|gif)/gi, '/image.png');
  modified = modified.replace(/https?:\/\/(?:assets|www|images)\.1mg\.com\/[^\s"'`>]*1mg-logo-large\.(?:svg|png|jpg|jpeg|gif)/gi, '/image.png');
  modified = modified.replace(/\/images\/tata_1mg_logo\.svg/g, '/image.png');

  // Replace references to assets.1mg.com with our local assets_proxy
  modified = modified.replace(/https?:\/\/assets\.1mg\.com/g, 'http://localhost:3000/assets_proxy');
  modified = modified.replace(/\/\/assets\.1mg\.com/g, 'http://localhost:3000/assets_proxy');

  // Replace absolute references to the live site with localhost:3000
  modified = modified.replace(/https?:\/\/www\.1mg\.com/g, 'http://localhost:3000');
  modified = modified.replace(/https?:\/\/1mg\.com/g, 'http://localhost:3000');

  // Force logo replacement in CSS style
  const styleToInject = `
    <style>
      /* Force our logo on the main header logo elements */
      [class*="Header__logo__"],
      .Header__logoFallback___SCxk,
      img[src*="tata_1mg_logo"],
      img[src*="1mg-logo"],
      img[src*="image.png"],
      .DioRxProcessing__logo__NQ6Ju,
      .PackageCard__labLogo__t4Tk5,
      [class*="FooterSection__"] img[width="124px"][height="36px"],
      [class*="Footer__"] img[width="124px"][height="36px"],
      .footer img[width="124px"][height="36px"] {
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

      /* Hide or replace TATA digital logo/branding in header if any */
      img[src*="tata_logo"],
      img[src*="tata-logo"],
      img[src*="tatadigital"],
      .tata-logo,
      [class*="tata-logo"],
      [class*="TataLogo"],
      [class*="tataLogo"],
      [class*="header_logo_horizontal"] {
        display: none !important;
      }

      /* Force green color on buttons that use the coral gradient */
      [class*="PrimaryButton__coralGradient__"],
      [class*="PrimaryButton__coralGradientBright__"] {
        background: linear-gradient(91.23deg, #1b9c54 0%, #157e43 100%) !important;
      }
      [class*="PrimaryButton__coralOutlined__"] {
        color: #1b9c54 !important;
        border-color: #1b9c54 !important;
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

  return rebrand(modified);
}

const server = http.createServer((req, res) => {
  let safeUrl = decodeURIComponent(req.url);
  const urlPath = safeUrl.split('?')[0];

  // Intercept logo and favicon requests and serve the custom logo
  if (
    urlPath === '/image.png' || 
    urlPath.includes('tata_1mg_logo') || 
    urlPath.includes('1mg-logo') ||
    urlPath.includes('favicon') ||
    urlPath.includes('apple-touch-icon')
  ) {
    const logoPath = path.join(__dirname, 'image.png');
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
  
  // Intercept assets_proxy requests and proxy them to assets.1mg.com
  if (safeUrl.startsWith('/assets_proxy/')) {
    const assetPath = safeUrl.replace('/assets_proxy', '');
    console.log(`Proxying asset: ${req.method} ${assetPath}`);
    
    const headers = { ...req.headers };
    headers['host'] = 'assets.1mg.com';
    headers['accept-encoding'] = 'identity'; // Request uncompressed content so we can modify it
    
    if (headers['origin']) {
      headers['origin'] = 'https://assets.1mg.com';
    }
    if (headers['referer']) {
      headers['referer'] = 'https://assets.1mg.com' + assetPath;
    }

    const proxyReq = https.request({
      host: 'assets.1mg.com',
      port: 443,
      path: assetPath,
      method: req.method,
      headers: headers,
      rejectUnauthorized: false
    }, (proxyRes) => {
      const responseHeaders = { ...proxyRes.headers };
      const contentType = proxyRes.headers['content-type'] || '';

      // Allow CORS
      responseHeaders['access-control-allow-origin'] = '*';
      responseHeaders['access-control-allow-headers'] = '*';

      if (contentType.includes('text/css')) {
        let chunks = [];
        proxyRes.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        proxyRes.on('end', () => {
          const buffer = Buffer.concat(chunks);
          let css = buffer.toString('utf8');
          const rebrandedCss = rebrand(css);
          const modifiedBuffer = Buffer.from(rebrandedCss, 'utf8');
          responseHeaders['content-length'] = modifiedBuffer.length;
          delete responseHeaders['content-encoding'];
          
          res.writeHead(proxyRes.statusCode, responseHeaders);
          res.end(modifiedBuffer);
        });
      } else if (contentType.includes('text/html')) {
        let chunks = [];
        proxyRes.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        proxyRes.on('end', () => {
          const buffer = Buffer.concat(chunks);
          let html = buffer.toString('utf8');
          const modifiedHtml = modifyHtml(html, safeUrl);
          const modifiedBuffer = Buffer.from(modifiedHtml, 'utf8');
          responseHeaders['content-length'] = modifiedBuffer.length;
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
      console.error(`Asset proxy error for ${assetPath}: ${err.message}`);
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway');
    });

    req.pipe(proxyReq);
    return;
  }
  
  // urlPath is declared and checked at the top of createServer

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
        const modifiedHtml = modifyHtml(data, req.url);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(modifiedHtml);
      });
    } else if (ext === '.css') {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(200, { 'Content-Type': contentType });
          fs.createReadStream(filePath).pipe(res);
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(rebrand(data));
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
        
        const modifiedHtml = modifyHtml(html, req.url);
        const modifiedBuffer = Buffer.from(modifiedHtml, 'utf8');
        responseHeaders['content-length'] = modifiedBuffer.length;
        
        // Remove content-encoding header in case the remote server sent compressed data anyway
        delete responseHeaders['content-encoding'];
        
        res.writeHead(proxyRes.statusCode, responseHeaders);
        res.end(modifiedBuffer);
      });
    } else if (contentType.includes('text/css')) {
      let chunks = [];
      proxyRes.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      proxyRes.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let css = buffer.toString('utf8');
        const rebrandedCss = rebrand(css);
        const modifiedBuffer = Buffer.from(rebrandedCss, 'utf8');
        responseHeaders['content-length'] = modifiedBuffer.length;
        
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
