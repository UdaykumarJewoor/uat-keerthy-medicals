const fs = require('fs');
const content = fs.readFileSync('public/index.html', 'utf8');

console.log('Total content length:', content.length);

const keywords = ['diabetes', 'health concerns', 'bone', 'kidney', 'INITIAL_STATE'];

keywords.forEach(kw => {
  const index = content.toLowerCase().indexOf(kw.toLowerCase());
  console.log(`Keyword "${kw}": index = ${index}`);
  if (index !== -1) {
    console.log(`Context around "${kw}":`);
    console.log(content.slice(Math.max(0, index - 100), Math.min(content.length, index + 200)));
    console.log('---');
  }
});
