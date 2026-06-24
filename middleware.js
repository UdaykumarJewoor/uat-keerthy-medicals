import { NextResponse } from 'next/server';

const TARGET_HOST = 'www.1mg.com';
const ASSETS_HOST = 'assets.1mg.com';

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

function modifyHtml(html, urlStr, origin) {
  let modified = html;
  
  // Replace absolute and relative logo URLs with /image.png
  modified = modified.replace(/https?:\/\/(?:assets|www|images)\.1mg\.com\/[^\s"'`>]*tata_1mg_logo\.(?:svg|png|jpg|jpeg|gif)/gi, '/image.png');
  modified = modified.replace(/https?:\/\/(?:assets|www|images)\.1mg\.com\/[^\s"'`>]*1mg-logo-large\.(?:svg|png|jpg|jpeg|gif)/gi, '/image.png');
  modified = modified.replace(/\/images\/tata_1mg_logo\.svg/g, '/image.png');

  // Replace references to assets.1mg.com with our local assets_proxy
  modified = modified.replace(/https?:\/\/assets\.1mg\.com/g, `${origin}/assets_proxy`);
  modified = modified.replace(/\/\/assets\.1mg\.com/g, `${origin}/assets_proxy`);

  // Replace absolute references to the live site with our proxy origin
  modified = modified.replace(/https?:\/\/www\.1mg\.com/g, origin);
  modified = modified.replace(/https?:\/\/1mg\.com/g, origin);

  // If this is the ayurveda or partnerships page, block the React scripts to prevent hydration errors and opacity rendering issues
  if (urlStr.includes('/ayurveda') || urlStr.includes('/partnerships')) {
    modified = modified.replace(/<script async data-chunk=/g, '<script type="text/blocked" async data-chunk=');
    modified = modified.replace(/<script id="__LOADABLE_REQUIRED_CHUNKS__"/g, '<script id="__LOADABLE_REQUIRED_CHUNKS__" type="text/blocked"');
    modified = modified.replace(/<script id="__LOADABLE_REQUIRED_CHUNKS___ext"/g, '<script id="__LOADABLE_REQUIRED_CHUNKS___ext" type="text/blocked"');

    // Inject opacity override styles specifically for these static pages to bypass animation opacity 0
    const overrideStyles = `
    <style>
      [style*="opacity:0"],
      [style*="opacity: 0"],
      [style*="opacity:0;"],
      [style*="opacity: 0;"],
      .opacity-none,
      .opacity-0 {
        opacity: 1 !important;
        transform: none !important;
        visibility: visible !important;
        transition: none !important;
      }
    </style>
    `;
    if (modified.includes('</head>')) {
      modified = modified.replace('</head>', `${overrideStyles}\n</head>`);
    } else {
      modified += overrideStyles;
    }

    // Inject client-side hydration and interaction scripts
    const clientScript = `
    <script>
      (function() {
        // 1. Recursive Image Hydration
        function hydrateImages() {
          try {
            const slugMap = {};
            
            function scanObject(obj) {
              if (!obj || typeof obj !== 'object') return;
              if (Array.isArray(obj)) {
                obj.forEach(item => scanObject(item));
                return;
              }
              if (obj.slug && typeof obj.slug === 'string') {
                var imgUrl = obj.image || obj.imageUrl || obj.imgUrl || obj.tile_image || obj.logo;
                if (imgUrl && typeof imgUrl === 'string') {
                  slugMap[obj.slug] = imgUrl;
                  var cleanSlug = obj.slug;
                  if (cleanSlug.endsWith('/')) {
                    cleanSlug = cleanSlug.slice(0, -1);
                  }
                  slugMap[cleanSlug] = imgUrl;
                  var parts = cleanSlug.split('/');
                  if (parts.length > 0) {
                    slugMap[parts[parts.length - 1]] = imgUrl;
                  }
                }
              }
              for (var key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                  scanObject(obj[key]);
                }
              }
            }

            if (window.__INITIAL_STATE__) scanObject(window.__INITIAL_STATE__);
            if (window.__ROUTER_INITIAL_DATA__) scanObject(window.__ROUTER_INITIAL_DATA__);

            const links = document.querySelectorAll('a');
            links.forEach(link => {
              const href = link.getAttribute('href');
              if (!href) return;
              var cleanHref = href;
              if (cleanHref.endsWith('/')) {
                cleanHref = cleanHref.slice(0, -1);
              }
              const pathSegments = cleanHref.split('/');
              const lastSegment = pathSegments[pathSegments.length - 1];
              const imageUrl = slugMap[href] || slugMap[cleanHref] || slugMap[lastSegment];
              if (imageUrl) {
                const img = link.querySelector('img');
                if (img) {
                  img.src = imageUrl;
                  for (let c of [...img.classList]) {
                    if (c.includes('img-loading') || c.includes('transparentImage') || c.includes('Loader') || c.includes('ImageLoader') || c.includes('shimmer')) {
                      img.classList.remove(c);
                    }
                  }
                  img.style.opacity = '1';
                  img.style.visibility = 'visible';
                  img.style.display = 'block';
                  img.style.content = 'initial';
                }
              }
            });
          } catch (e) {
            console.error('[Image Hydrator] Error:', e);
          }
        }

        // 2. Tab Switcher
        function setupTabs() {
          try {
            const tabs = document.querySelectorAll('[class*="SolutionSection__tab__"]');
            const contents = document.querySelectorAll('[class*="SolutionSection__positionRelative__"] > div');
            
            if (tabs.length === 0 || contents.length === 0) return;
            
            tabs.forEach((tab, index) => {
              if (tab.dataset.tabListened) return;
              tab.dataset.tabListened = 'true';
              
              tab.addEventListener('click', () => {
                tabs.forEach(t => {
                  t.style.backgroundColor = '';
                });
                tab.style.backgroundColor = '#cde7fd';
                
                contents.forEach(c => {
                  c.style.display = 'none';
                  c.classList.remove('SolutionSection__activeItem__bIfWD');
                });
                
                const activeContent = contents[index];
                if (activeContent) {
                  activeContent.style.display = 'block';
                  activeContent.style.opacity = '1';
                  activeContent.style.position = 'relative';
                  activeContent.classList.add('SolutionSection__activeItem__bIfWD');
                }
              });
            });
          } catch (e) {
            console.error('[Tab Switcher] Error:', e);
          }
        }

        // 3. Mobile Menu Toggle
        function setupMobileMenu() {
          try {
            const hamburger = document.querySelector('[class*="Header__btnBg__"]');
            const mobileMenu = document.querySelector('#headerSlideIcon');
            if (hamburger && mobileMenu && !hamburger.dataset.menuListened) {
              hamburger.dataset.menuListened = 'true';
              hamburger.addEventListener('click', (e) => {
                e.stopPropagation();
                if (mobileMenu.style.display === 'block') {
                  mobileMenu.style.display = 'none';
                } else {
                  mobileMenu.style.display = 'block';
                }
              });
              document.addEventListener('click', () => {
                mobileMenu.style.display = 'none';
              });
              mobileMenu.addEventListener('click', (e) => {
                e.stopPropagation();
              });
            }
          } catch (e) {
            console.error('[Mobile Menu] Error:', e);
          }
        }

        function runAll() {
          hydrateImages();
          setupTabs();
          setupMobileMenu();
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', runAll);
        } else {
          runAll();
        }
        setTimeout(runAll, 500);
        setTimeout(runAll, 1500);
        setTimeout(runAll, 3000);
      })();
    </script>
    `;

    if (modified.includes('</body>')) {
      modified = modified.replace('</body>', `${clientScript}\n</body>`);
    } else {
      modified += clientScript;
    }
  }

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

export async function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const origin = url.origin;

  // Bypass if this is a loop-protection static check
  if (request.headers.get('x-static-check') === 'true') {
    return NextResponse.next();
  }

  // Skip Next.js internal requests, static assets, and favicon files
  if (
    path.startsWith('/_next/') ||
    path.startsWith('/api/') ||
    (path.includes('.') && 
     path !== '/image.png' && 
     !path.includes('tata_1mg_logo') && 
     !path.includes('1mg-logo') && 
     !path.includes('favicon') && 
     !path.includes('apple-touch-icon'))
  ) {
    return NextResponse.next();
  }

  // 1. Intercept logo and favicon requests
  if (
    path === '/image.png' || 
    path.includes('tata_1mg_logo') || 
    path.includes('1mg-logo') ||
    path.includes('favicon') ||
    path.includes('apple-touch-icon')
  ) {
    // Re-route to the local image.png in public folder
    const logoUrl = new URL('/image.png', request.url);
    const response = await fetch(logoUrl);
    if (response.status === 200) {
      const headers = new Headers(response.headers);
      headers.set('Content-Type', 'image/png');
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return new Response(response.body, { headers });
    }
  }

  // 2. Intercept assets_proxy requests
  if (path.startsWith('/assets_proxy/')) {
    const assetPath = path.replace('/assets_proxy', '');
    const assetUrl = `https://${ASSETS_HOST}${assetPath}${url.search}`;
    
    const headers = new Headers(request.headers);
    headers.set('Host', ASSETS_HOST);
    headers.delete('accept-encoding'); // Disable compression so we can edit body
    
    const proxyResponse = await fetch(assetUrl, {
      method: request.method,
      headers: headers,
      body: request.body
    });

    const responseHeaders = new Headers(proxyResponse.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    
    const contentType = responseHeaders.get('Content-Type') || '';
    if (contentType.includes('text/css')) {
      let css = await proxyResponse.text();
      css = rebrand(css);
      return new Response(css, { status: proxyResponse.status, headers: responseHeaders });
    } else if (contentType.includes('text/html')) {
      let html = await proxyResponse.text();
      html = modifyHtml(html, assetUrl, origin);
      return new Response(html, { status: proxyResponse.status, headers: responseHeaders });
    }

    return new Response(proxyResponse.body, proxyResponse);
  }

  // 3. Fallback to static assets first (if they exist in Next.js public folder)
  // To verify if a static file exists, we try to fetch it from localhost
  const staticUrl = new URL(path, request.url);
  let publicPath = path;
  if (path.endsWith('/')) {
    publicPath += 'index.html';
  } else if (!path.includes('.')) {
    publicPath += '/index.html';
  }
  
  const checkStaticUrl = new URL(publicPath, request.url);
  const staticResponse = await fetch(checkStaticUrl, {
    headers: {
      'x-static-check': 'true'
    }
  });
  if (staticResponse.status === 200) {
    const contentType = staticResponse.headers.get('Content-Type') || '';
    if (contentType.includes('text/html')) {
      let html = await staticResponse.text();
      html = modifyHtml(html, url.href, origin);
      return new Response(html, { status: staticResponse.status, headers: staticResponse.headers });
    }
    // Let Next.js serve the static asset normally
    return NextResponse.next();
  }

  // 4. Otherwise, proxy page requests to www.1mg.com
  const targetUrl = `https://${TARGET_HOST}${path}${url.search}`;
  const headers = new Headers(request.headers);
  headers.set('Host', TARGET_HOST);
  headers.delete('accept-encoding');
  
  const proxyResponse = await fetch(targetUrl, {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: 'manual'
  });

  const responseHeaders = new Headers(proxyResponse.headers);

  // Rewrite Redirects
  if (proxyResponse.status >= 300 && proxyResponse.status < 400) {
    const location = responseHeaders.get('Location');
    if (location && (location.includes('www.1mg.com') || location.includes('1mg.com'))) {
      try {
        const locUrl = new URL(location);
        locUrl.protocol = url.protocol;
        locUrl.host = url.host;
        responseHeaders.set('Location', locUrl.href);
      } catch (e) {}
    }
  }

  // Strip cookie domains
  const setCookie = responseHeaders.get('Set-Cookie');
  if (setCookie) {
    responseHeaders.set('Set-Cookie', setCookie.replace(/domain=\.?[a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+/gi, ''));
  }

  const contentType = responseHeaders.get('Content-Type') || '';
  if (contentType.includes('text/html')) {
    let html = await proxyResponse.text();
    html = modifyHtml(html, targetUrl, origin);
    return new Response(html, { status: proxyResponse.status, headers: responseHeaders });
  } else if (contentType.includes('text/css')) {
    let css = await proxyResponse.text();
    css = rebrand(css);
    return new Response(css, { status: proxyResponse.status, headers: responseHeaders });
  }

  return new Response(proxyResponse.body, { status: proxyResponse.status, headers: responseHeaders });
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
