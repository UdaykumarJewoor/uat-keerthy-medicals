const fs = require('fs');
const content = fs.readFileSync('public/index.html', 'utf8');

const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/g;
let match;
console.log('--- Script tags in index.html ---');
let idx = 0;
while ((match = scriptRegex.exec(content)) !== null) {
  const attrs = match[1];
  const body = match[2];
  console.log(`[${idx++}] Attrs: ${attrs}`);
  if (body.trim()) {
    console.log(`  Body preview: ${body.trim().slice(0, 150)}...`);
  }
  console.log('---');
}
