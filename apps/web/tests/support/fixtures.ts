import { test as apiTest } from '../../../api/tests/support/fixtures.js';
import { createBdd } from 'playwright-bdd';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
export const test = apiTest.extend<Record<never, never>, { webServer: string }>({
 webServer: [async ({ runtime }, use) => {
  const server = await createServer({ root: fileURLToPath(new URL('../../', import.meta.url)), configFile: false, server: { host: '127.0.0.1', port: Number(new URL(runtime.webOrigin).port), strictPort: true, proxy: { '/api': runtime.origin } }, logLevel: 'error' });
  try { await server.listen(); await use(runtime.webOrigin); } finally { await server.close(); }
 }, { scope: 'worker' }],
 baseURL: async ({ webServer }, use) => { await use(webServer); },
});
export const { Given, When, Then } = createBdd(test);
export { expect } from '@playwright/test';
export { LedgerWorld } from '../../../api/tests/support/world.js';
