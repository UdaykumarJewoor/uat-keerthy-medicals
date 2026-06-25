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

console.log('urlMap size:', Object.keys(urlMap).length);
console.log('textMap size:', Object.keys(textMap).length);

console.log('Is "/categories/health-conditions/kidney-care-40" in urlMap?', !!urlMap["/categories/health-conditions/kidney-care-40"]);
console.log('Value in urlMap:', urlMap["/categories/health-conditions/kidney-care-40"]);
console.log('Is "kidney-care-40" in urlMap?', !!urlMap["kidney-care-40"]);

// Let's parse the HTML using simple regex to find category anchors and their images
const anchorRegex = /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
let match;
console.log('\n--- Scanning Category Anchors in HTML ---');
while ((match = anchorRegex.exec(content)) !== null) {
  const href = match[1];
  const innerHTML = match[2];
  if (href.includes('categories/')) {
    // Look for image inside
    const imgMatch = innerHTML.match(/<img[^>]*src="([^"]*)"[^>]*>/);
    if (imgMatch) {
      const imgPlaceholder = imgMatch[1];
      let cleanHref = href.replace(/\/$/, '');
      const pathSegments = cleanHref.split('/');
      const lastSegment = pathSegments[pathSegments.length - 1];
      const foundUrl = urlMap[href] || urlMap[cleanHref] || urlMap[lastSegment];
      
      console.log(`Href: ${href}`);
      console.log(`  Img Placeholder: ${imgPlaceholder.slice(0, 50)}...`);
      console.log(`  Found Hydrated URL: ${foundUrl}`);
    }
  }
}
