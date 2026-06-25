const fs = require('fs');
const content = fs.readFileSync('1mg.html', 'utf8');

// Find Quick order button and search container around it
const quickOrderIdx = content.indexOf('Quick order');
if (quickOrderIdx !== -1) {
  console.log('--- SURROUNDING HTML AROUND QUICK ORDER ---');
  console.log(content.slice(quickOrderIdx - 3000, quickOrderIdx + 2000));
} else {
  console.log('Quick order not found');
}
