import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const PORT = Number(process.env.PORT || 4500);
const ROOT = resolve('.');
process.env.ADMIN_PASSWORD ||= 'zac-local';
process.env.ZAC_STORE_PATH ||= resolve('.data/dev-store.json');

const API_ROUTES = new Map([
  ['/api/config', './api/config.js'],
  ['/api/waitlist', './api/waitlist.js'],
  ['/api/questionnaire', './api/questionnaire.js'],
  ['/api/program', './api/program.js'],
  ['/api/admin/session', './api/admin/session.js'],
  ['/api/admin/overview', './api/admin/overview.js'],
  ['/api/admin/program', './api/admin/program.js'],
]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

const server = createServer(async (incoming, outgoing) => {
  try {
    const origin = `http://${incoming.headers.host || `localhost:${PORT}`}`;
    const url = new URL(incoming.url || '/', origin);
    const routeModule = API_ROUTES.get(url.pathname);
    if (routeModule) {
      const request = await webRequest(incoming, url);
      const handler = (await import(routeModule)).default;
      const response = await handler.fetch(request);
      outgoing.statusCode = response.status;
      response.headers.forEach((value, key) => outgoing.setHeader(key, value));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
      return;
    }

    if (!['GET', 'HEAD'].includes(incoming.method || 'GET')) {
      outgoing.writeHead(405, { allow: 'GET, HEAD' }).end();
      return;
    }
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    if (pathname.endsWith('/')) pathname += 'index.html';
    const filePath = resolve(ROOT, `.${pathname}`);
    if (!filePath.startsWith(`${ROOT}${sep}`)) {
      outgoing.writeHead(403).end('Forbidden');
      return;
    }
    const info = await stat(filePath).catch(() => null);
    if (!info?.isFile()) {
      outgoing.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }
    const body = await readFile(filePath);
    outgoing.writeHead(200, {
      'content-type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    });
    outgoing.end(incoming.method === 'HEAD' ? undefined : body);
  } catch (error) {
    console.error(error);
    outgoing.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end('Internal server error');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Metodo ZAC: http://127.0.0.1:${PORT}`);
  console.log(`Dashboard: http://127.0.0.1:${PORT}/admin.html`);
  console.log(`Password locale dashboard: ${process.env.ADMIN_PASSWORD}`);
});

async function webRequest(incoming, url) {
  const chunks = [];
  for await (const chunk of incoming) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  return new Request(url, {
    method: incoming.method,
    headers: incoming.headers,
    body: ['GET', 'HEAD'].includes(incoming.method || 'GET') ? undefined : body,
  });
}
