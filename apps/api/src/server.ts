import { buildApp } from './app.js';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';

const production = process.env.NODE_ENV === 'production';

if (!production) {
  try {
    loadEnvFile(new URL('../../../.env', import.meta.url));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
if (production) {
  for (const name of [
    'DATABASE_URL',
    'APP_ORIGIN',
    'BETTER_AUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ]) {
    if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
  }
  if (!process.env.APP_ORIGIN!.startsWith('https://'))
    throw new Error('Production APP_ORIGIN requires HTTPS');
}
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid server port');
const staticRoot = production
  ? fileURLToPath(new URL('../../web/dist/', import.meta.url))
  : undefined;

if (staticRoot) await access(new URL('../../web/dist/index.html', import.meta.url));
const app = buildApp({ staticRoot });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await app.close();
  });
}
try {
  await app.listen({ host: production ? '0.0.0.0' : '127.0.0.1', port });
} catch {
  app.log.error('Application startup failed; check database connectivity and migrations');
  await app.close();
  process.exitCode = 1;
}
