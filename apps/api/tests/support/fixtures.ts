import { test as base, createBdd } from 'playwright-bdd';
import { request, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createWorkerDatabase } from './database.js';
import { LedgerWorld } from './world.js';
import { buildApp } from '../../src/app.js';
type Runtime = { database: Awaited<ReturnType<typeof createWorkerDatabase>>; origin: string };
export const test = base.extend<{ world: LedgerWorld }, { runtime: Runtime }>({
 runtime: [async ({}, use, workerInfo) => {
  const database = await createWorkerDatabase(workerInfo.workerIndex);
  const app = buildApp();
  await app.listen({ host: '127.0.0.1', port: 0 });
  try { await use({ database, origin: app.listeningOrigin }); } finally { await app.close(); await database.dispose(); }
 }, { scope: 'worker' }],
 world: async ({ runtime }, use) => {
  const api = await request.newContext({ baseURL: runtime.origin });
  try { await use(new LedgerWorld(runtime.database.pool, api, runtime.origin, randomUUID())); } finally { await api.dispose(); }
 },
});
export const { Given, When, Then } = createBdd(test);
export { expect };
