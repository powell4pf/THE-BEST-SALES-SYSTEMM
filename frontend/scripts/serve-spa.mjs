import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.PORT || 5173);
const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

createServer(async (request, response) => {
  try {
    const requestPath = decodeURIComponent((request.url || '/').split('?')[0]);
    const safePath = normalize(requestPath).replace(/^([.][.][\\/])+/, '');
    let filePath = join(root, safePath === '/' ? 'index.html' : safePath);
    try { if ((await stat(filePath)).isDirectory()) filePath = join(filePath, 'index.html'); } catch { /* use SPA fallback below */ }
    try { await stat(filePath); } catch { filePath = join(root, 'index.html'); }
    const body = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(body);
  } catch {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Frontend server error');
  }
}).listen(port, '127.0.0.1', () => console.log(`Sales frontend running at http://127.0.0.1:${port}`));
