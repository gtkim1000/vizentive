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
const spatialBootstrapHandler = require('../api/spatial/bootstrap');
const spatialNextHandler = require('../api/spatial/next');
const port = Number(process.env.LOCAL_PORT || 8010);
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.pdf':'application/pdf', '.mp4':'video/mp4', '.webm':'video/webm', '.mov':'video/quicktime', '.mp3':'audio/mpeg', '.woff':'font/woff', '.woff2':'font/woff2' };

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
  if (url.pathname === '/api/spatial/bootstrap') return spatialBootstrapHandler(req, res);
  if (url.pathname === '/api/spatial/next') return spatialNextHandler(req, res);
  if (url.pathname === '/api/inquiries') {
    if (req.method === 'POST') { try { req.body = await readBody(req); } catch { req.body = {}; } }
    return inquiryHandler(req, res);
  }

  const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const candidates = [path.join(root, 'public', relative), path.join(root, relative)];
  const file = candidates.find(candidate => candidate.startsWith(root + path.sep) && fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!file) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }

  const stat = fs.statSync(file);
  const contentType = mime[path.extname(file).toLowerCase()] || 'application/octet-stream';
  // 정적 자산은 매번 재검증(304)만 하면 되도록 no-cache(무기한 캐시 금지와는 다름) +
  // 변경 시각 기반 조건부 GET을 지원 — 폰으로 반복 테스트할 때마다 이미지/영상을
  // 통째로 재전송하지 않기 위함. HTML은 항상 최신 반영이 우선이라 no-store 유지.
  const isHtml = contentType.startsWith('text/html');
  const lastModified = stat.mtime.toUTCString();
  const baseHeaders = isHtml
    ? { 'Cache-Control': 'no-store' }
    : { 'Cache-Control': 'no-cache', 'Last-Modified': lastModified, 'Accept-Ranges': 'bytes' };

  if (!isHtml && req.headers['if-modified-since'] === lastModified) {
    res.writeHead(304, baseHeaders);
    return res.end();
  }

  const range = !isHtml && req.headers.range ? /^bytes=(\d*)-(\d*)$/.exec(req.headers.range) : null;
  if (range) {
    const start = range[1] ? parseInt(range[1], 10) : 0;
    const end = range[2] ? parseInt(range[2], 10) : stat.size - 1;
    if (start >= stat.size || end >= stat.size || start > end) {
      res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${stat.size}` });
      return res.end();
    }
    res.writeHead(206, { ...baseHeaders, 'Content-Type': contentType, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }

  res.writeHead(200, { ...baseHeaders, 'Content-Type': contentType, 'Content-Length': stat.size });
  fs.createReadStream(file).pipe(res);
}

const host = process.env.LOCAL_HOST || '0.0.0.0'; // 기본값을 0.0.0.0으로 — 재시작마다 LOCAL_HOST를 안 챙겨도 항상 휴대폰 접속 가능. 이 PC만으로 제한하려면 LOCAL_HOST=127.0.0.1로 명시.
const server = http.createServer((req, res) => Promise.resolve(serve(req, res)).catch(error => {
  console.error(error);
  if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Local server error' }));
}));
// 포트 충돌(EADDRINUSE)을 처리 안 하면 Node가 스택트레이스만 던지고 죽어서 "왜 안 되는지" 알기 어려움 —
// 대부분의 원인은 이미 다른 터미널/세션에서 서버가 떠 있는 것이므로 그 안내를 명확히 하고 종료.
server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`포트 ${port}가 이미 사용 중입니다 — 다른 터미널/세션에서 로컬 서버가 이미 실행 중일 가능성이 높습니다.`);
    console.error(`   http://127.0.0.1:${port} 로 먼저 접속해 이미 떠 있는지 확인해보세요. 그래도 새로 띄우려면 기존 프로세스를 먼저 종료하세요.`);
    process.exit(1);
  }
  throw error;
});
server.listen(port, host, () => console.log(`VIZENTIVE local server: http://${host === '0.0.0.0' ? '<이 PC의 로컬 IP>' : host}:${port}`));
