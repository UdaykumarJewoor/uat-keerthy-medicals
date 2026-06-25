const fs = require('fs');
const content = fs.readFileSync('public/index.html', 'utf8');

const startStr = 'window.__INITIAL_STATE__ =';
const startIndex = content.indexOf(startStr);
if (startIndex === -1) {
  console.log('__INITIAL_STATE__ not found');
  process.exit(1);
}

// Extract JSON by balancing braces
let braceCount = 0;
let jsonStart = startIndex + startStr.length;
while (jsonStart < content.length && content[jsonStart] !== '{') {
  jsonStart++;
}

if (jsonStart >= content.length) {
  console.log('JSON start brace not found');
  process.exit(1);
}

let jsonEnd = jsonStart;
for (; jsonEnd < content.length; jsonEnd++) {
  if (content[jsonEnd] === '{') braceCount++;
  else if (content[jsonEnd] === '}') {
    braceCount--;
    if (braceCount === 0) {
      jsonEnd++; // Include the closing brace
      break;
    }
  }
}

const jsonStr = content.slice(jsonStart, jsonEnd);
console.log('Extracted JSON length:', jsonStr.length);

let state;
try {
  state = JSON.parse(jsonStr);
  console.log('Successfully parsed JSON');
} catch (e) {
  console.error('Failed to parse JSON:', e.message);
  process.exit(1);
}

function searchObj(obj, path = '') {
  if (!obj) return;
  if (typeof obj === 'string') {
    if (obj.toLowerCase().includes('kidney') || obj.toLowerCase().includes('derma')) {
      console.log(`Found string "${obj}" at path: ${path}`);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => searchObj(item, `${path}[${index}]`));
  } else if (typeof obj === 'object') {
    for (const key in obj) {
      searchObj(obj[key], `${path}.${key}`);
    }
  }
}

searchObj(state);
