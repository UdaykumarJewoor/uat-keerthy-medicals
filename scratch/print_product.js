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

console.log('Product 0:', JSON.stringify(state.homeReducer.homeData.widgets[6].value.data[0], null, 2));
console.log('Product 2:', JSON.stringify(state.homeReducer.homeData.widgets[6].value.data[2], null, 2));
