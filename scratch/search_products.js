const fs = require('fs');
const content = fs.readFileSync('public/index.html', 'utf8');

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

function searchObj(obj, path = '') {
  if (!obj) return;
  if (typeof obj === 'string') {
    if (obj.toLowerCase().includes('unienzyme') || obj.toLowerCase().includes('cofsils') || obj.toLowerCase().includes('clocip')) {
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
