const https = require('https');

console.log('Fetching headers from https://uat-keerthy-medicals.netlify.app ...');

https.get('https://uat-keerthy-medicals.netlify.app/', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:');
  console.log(JSON.stringify(res.headers, null, 2));
  res.resume(); // Consume response to free memory
}).on('error', (err) => {
  console.error('Error:', err.message);
});
