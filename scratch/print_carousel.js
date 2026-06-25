const fs = require('fs');
const content = fs.readFileSync('public/index.html', 'utf8');

const index = content.toLowerCase().indexOf('shop by health concerns');
if (index !== -1) {
  console.log(content.slice(index, index + 12000));
} else {
  console.log('Not found');
}
