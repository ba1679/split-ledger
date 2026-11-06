import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';

const requireApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const requireWeb = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { default: Fastify } = await import(requireApi.resolve('fastify'));
const { Pool } = requireApi('pg');
for (const url of [
  'postgres://ledger:ledger_local@127.0.0.1:54329/ledger',
  'postgres://ledger_test:ledger_test_local@127.0.0.1:54330/ledger_test',
]) {
  const pool = new Pool({ connectionString: url });

  try {
    await pool.query('SELECT 1');
  } finally {
    await pool.end();
  }
}
const app = Fastify();

app.get('/health', async () => ({ ok: true }));
await app.listen({ port: 0, host: '127.0.0.1' });

try {
  const response = await fetch(`${app.listeningOrigin}/health`);

  if (!response.ok) throw Error('Fastify smoke failed');
} finally {
  await app.close();
}
await mkdir('.cache/smoke-web', { recursive: true });
await writeFile('.cache/smoke-web/index.html', '<h1>Vite ready</h1>');
const { createServer } = await import(requireWeb.resolve('vite'));
const vite = await createServer({
  root: '.cache/smoke-web',
  configFile: false,
  server: { port: 0, host: '127.0.0.1' },
});

try {
  await vite.listen();
  const url = vite.resolvedUrls.local[0];
  const response = await fetch(url);

  if (!(await response.text()).includes('Vite ready')) throw Error('Vite smoke failed');
} finally {
  await vite.close();
}
console.log('PostgreSQL, Fastify and Vite smoke passed');
