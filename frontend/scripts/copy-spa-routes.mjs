import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, '..', 'dist');
const entry = join(dist, 'index.html');
const routes = ['login', 'customers', 'products', 'stock', 'invoices', 'statements', 'credit-notes', 'reports', 'portal', 'settings'];

for (const route of routes) {
  const target = join(dist, route, 'index.html');
  mkdirSync(dirname(target), { recursive: true });
  cpSync(entry, target);
}

console.log(`SPA route fallbacks written for ${routes.length} routes.`);
