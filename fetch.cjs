const https = require('https');
const zlib = require('zlib');

const options = {
  hostname: 'www.api-football.com',
  port: 443,
  path: '/news/post/fifa-world-cup-2026-using-api-sports-widgets',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/110.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive'
  }
};

const req = https.request(options, (res) => {
  let chunks = [];
  res.on('data', (d) => { chunks.push(d); });
  res.on('end', () => {
    let buffer = Buffer.concat(chunks);
    if (res.headers['content-encoding'] === 'gzip') {
      buffer = zlib.gunzipSync(buffer);
    } else if (res.headers['content-encoding'] === 'br') {
      buffer = zlib.brotliDecompressSync(buffer);
    } else if (res.headers['content-encoding'] === 'deflate') {
      buffer = zlib.inflateSync(buffer);
    }
    console.log(buffer.toString('utf-8').substring(0, 10000));
  });
});

req.on('error', (error) => { console.error(error); });
req.end();
