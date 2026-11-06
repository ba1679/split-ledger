import { buildApp } from './app.js';
import { loadEnvFile } from 'node:process';

try {
  loadEnvFile(new URL('../../../.env', import.meta.url));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
const app = buildApp();

await app.listen({ host: '127.0.0.1', port: Number(process.env.API_PORT ?? 3001) });
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, async () => {
    await app.close();
  });
