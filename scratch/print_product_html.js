const fs = require('fs');
const content = fs.readFileSync('public/index.html', 'utf8');

const index = content.toLowerCase().indexOf('unienzyme-digestive-enzymes-for-indigestion');
if (index !== -1) {
  console.log(content.slice(index - 500, index + 3000));
} else {
  console.log('Not found');
}
