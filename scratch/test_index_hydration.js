const fs = require('fs');
const content = fs.readFileSync('public/index.html', 'utf8');

// Parse __INITIAL_STATE__
const startStr = 'window.__INITIAL_STATE__ =';
const startIndex = content.indexOf(startStr);
let braceCount = 0;
let jsonStart = startIndex + startStr.length;
while (jsonStart < content.length && content[jsonStart] !== '{') {
  jsonStart++;
}
let jsonEnd = jsonStart;
for (; jsonEnd < content.length; jsonEnd++) {
  if (content[jsonEnd] === '{') braceCount++;
  else if (content[jsonEnd] === '}') {
    braceCount--;
    if (braceCount === 0) {
      jsonEnd++;
      break;
    }
  }
}
const state = JSON.parse(content.slice(jsonStart, jsonEnd));

// Run scanObject
const urlMap = {};
const textMap = {};

function scanObject(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach(item => scanObject(item));
    return;
  }
  
  let imgUrl = null;
  const imgKeys = ['image', 'imageUrl', 'image_url', 'imgUrl', 'img_url', 'tile_image', 'logo', 'bgImage', 'headerImage', 'subHeaderImage'];
  for (let k of imgKeys) {
    const val = obj[k];
    if (val) {
      if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('//') || val.startsWith('/') || val.includes('.png') || val.includes('.jpg') || val.includes('.jpeg') || val.includes('.webp') || val.includes('.gif') || val.includes('.svg'))) {
        imgUrl = val;
        break;
      } else if (typeof val === 'object' && val.url && typeof val.url === 'string' && (val.url.startsWith('http') || val.url.startsWith('//') || val.url.startsWith('/') || val.url.includes('.png') || val.url.includes('.jpg') || val.url.includes('.jpeg') || val.url.includes('.webp') || val.url.includes('.gif') || val.url.includes('.svg'))) {
        imgUrl = val.url;
        break;
      }
    }
  }
  
  if (imgUrl) {
    const urlKeys = ['slug', 'url', 'targetUrl', 'target_url', 'redirectUrl', 'redirect_url', 'onClickLink', 'on_click_link', 'href'];
    urlKeys.forEach(k => {
      const val = obj[k];
      if (val && typeof val === 'string') {
        urlMap[val] = imgUrl;
        let clean = val.replace(/\/$/, '');
        urlMap[clean] = imgUrl;
        const parts = clean.split('/');
        if (parts.length > 0) {
          urlMap[parts[parts.length - 1]] = imgUrl;
        }
      }
    });
    
    const textKeys = ['text', 'header', 'name', 'title', 'alt', 'imageAlt', 'image_alt'];
    textKeys.forEach(k => {
      const val = obj[k];
      if (val && typeof val === 'string') {
        const cleanText = val.trim().toLowerCase();
        if (cleanText) {
          textMap[cleanText] = imgUrl;
        }
      }
    });
    
    if (typeof obj.image === 'object' && obj.image.alt && typeof obj.image.alt === 'string') {
      const cleanAlt = obj.image.alt.trim().toLowerCase();
      if (cleanAlt) {
        textMap[cleanAlt] = imgUrl;
      }
    }
  }
  
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      scanObject(obj[key]);
    }
  }
}

scanObject(state);

// Scan all images in the HTML using regex
console.log('\n--- Scanning All Img Elements in HTML ---');
const imgRegex = /<img([^>]*)\/?>/g;
let match;
while ((match = imgRegex.exec(content)) !== null) {
  const attrs = match[1];
  
  // Extract src, class, alt, title
  const srcMatch = attrs.match(/src="([^"]*)"/);
  const classMatch = attrs.match(/class="([^"]*)"/);
  const altMatch = attrs.match(/alt="([^"]*)"/);
  const titleMatch = attrs.match(/title="([^"]*)"/);
  
  const src = srcMatch ? srcMatch[1] : '';
  const className = classMatch ? classMatch[1] : '';
  const alt = altMatch ? altMatch[1] : '';
  const title = titleMatch ? titleMatch[1] : '';
  
  const isPlaceholder = src.startsWith('data:image/') || src === '' || src.includes('transparentImage') || /[lL]oader|[sS]himmer|transparent|loading/.test(className);
  
  if (isPlaceholder && (title || alt)) {
    let foundUrl = null;
    
    // Match by title
    if (title) {
      foundUrl = textMap[title.trim().toLowerCase()];
    }
    // Match by alt
    if (!foundUrl && alt) {
      foundUrl = textMap[alt.trim().toLowerCase()];
    }
    
    console.log(`Image (title="${title}", alt="${alt}")`);
    console.log(`  Placeholder src: ${src.slice(0, 50)}`);
    console.log(`  Found Hydrated URL: ${foundUrl}`);
  }
}
