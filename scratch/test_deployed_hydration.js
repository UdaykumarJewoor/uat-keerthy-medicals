const https = require('https');
const fs = require('fs');

console.log('Fetching live HTML from https://uat-keerthy-medicals.netlify.app ...');

https.get('https://uat-keerthy-medicals.netlify.app/', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Fetched HTML length:', data.length);
    if (data.length === 0) {
      console.log('Error: Empty response');
      return;
    }
    
    // Write to a temporary file to inspect
    fs.writeFileSync('scratch/live_index.html', data);
    console.log('Saved live HTML to scratch/live_index.html');
    
    // Check if "hydrateImages" is in the HTML
    const hasHydrator = data.includes('hydrateImages');
    console.log('Does live HTML contain "hydrateImages"?', hasHydrator);
    
    // Run the offline test on live HTML
    runHydrationTest(data);
  });
}).on('error', (err) => {
  console.error('Fetch error:', err.message);
});

function runHydrationTest(content) {
  // Parse __INITIAL_STATE__
  const startStr = 'window.__INITIAL_STATE__ =';
  const startIndex = content.indexOf(startStr);
  if (startIndex === -1) {
    console.log('__INITIAL_STATE__ not found in live HTML');
    return;
  }
  
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
  
  let state;
  try {
    state = JSON.parse(content.slice(jsonStart, jsonEnd));
  } catch (e) {
    console.log('Failed to parse INITIAL_STATE:', e.message);
    return;
  }
  
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
        }
      });
      
      const textKeys = ['text', 'header', 'name', 'title', 'alt', 'imageAlt', 'image_alt'];
      textKeys.forEach(k => {
        const val = obj[k];
        if (val && typeof val === 'string') {
          textMap[val.trim().toLowerCase()] = imgUrl;
        }
      });
    }
    
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        scanObject(obj[key]);
      }
    }
  }
  
  scanObject(state);
  
  console.log('\n--- Scanning Category/Product Images in Live HTML ---');
  const imgRegex = /<img([^>]*)\/?>/g;
  let match;
  let matchCount = 0;
  let totalImgCount = 0;
  while ((match = imgRegex.exec(content)) !== null) {
    totalImgCount++;
    const attrs = match[1];
    const srcMatch = attrs.match(/src="([^"]*)"/);
    const altMatch = attrs.match(/alt="([^"]*)"/);
    const titleMatch = attrs.match(/title="([^"]*)"/);
    
    const src = srcMatch ? srcMatch[1] : '';
    const alt = altMatch ? altMatch[1] : '';
    const title = titleMatch ? titleMatch[1] : '';
    
    let foundUrl = null;
    if (title) foundUrl = textMap[title.trim().toLowerCase()];
    if (!foundUrl && alt) foundUrl = textMap[alt.trim().toLowerCase()];
    
    if (foundUrl) {
      matchCount++;
      if (matchCount <= 5) {
        console.log(`Matched Image #${matchCount}: title="${title}", alt="${alt}" -> ${foundUrl}`);
      }
    }
  }
  console.log(`Total images scanned: ${totalImgCount}`);
  console.log(`Successfully matched images: ${matchCount}`);
}
