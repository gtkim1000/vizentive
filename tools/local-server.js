const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([^#][^=]*)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
}

const inquiryHandler = require('../api/inquiries');
const adminHandler = require('../api/admin-inquiries');
const port = Number(process.env.LOCAL_PORT || 8010);
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.pdf':'application/pdf' };

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1000000) reject(new Error('Request too large')); });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

async function serve(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  if (url.pathname === '/api/admin-inquiries') return adminHandler(req, res);
  if (url.pathname === '/api/inquiries') {
    if (req.method === 'POST') { try { req.body = await readBody(req); } catch { req.body = {}; } }
    return inquiryHandler(req, res);
  }

  const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const candidates = [path.join(root, 'public', relative), path.join(root, relative)];
  const file = candidates.find(candidate => candidate.startsWith(root + path.sep) && fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!file) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}

http.createServer((req, res) => Promise.resolve(serve(req, res)).catch(error => {
  console.error(error);
  if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Local server error' }));
})).listen(port, '127.0.0.1', () => console.log(`VIZENTIVE local server: http://127.0.0.1:${port}`));
