import { test as base, createBdd } from 'playwright-bdd';
import { request, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createWorkerDatabase } from './database.js';
import { LedgerWorld } from './world.js';
import { installGoogleMock } from './google.js';
import { TEST_AUTH_SECRET } from './seed.js';
import { createScenarioTripManagementHooks } from './trip-management/job-completion.js';
import type { TripManagementHooks } from '../../src/modules/trips/management/dependencies.js';
import { buildApp } from '../../src/app.js';
import { createScenarioSplittingHooks } from './splitting/transaction-fault-fixture.js';
import { disposeTripManagementContext } from './trip-management/context.js';

type Runtime = {
  database: Awaited<ReturnType<typeof createWorkerDatabase>>;
  origin: string;
  webOrigin: string;
  worlds: Set<LedgerWorld>;
};

export const test = base.extend<{ world: LedgerWorld }, { runtime: Runtime }>({
  // Playwright requires an object-destructured fixture parameter even with no dependencies.
  runtime: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, workerInfo) => {
      const database = await createWorkerDatabase(workerInfo.workerIndex);
      const restoreGoogle = installGoogleMock();
      const webOrigin = `http://127.0.0.1:${44000 + workerInfo.workerIndex}`;
      let app: ReturnType<typeof buildApp> | undefined;
      const worlds = new Set<LedgerWorld>();

      try {
        app = buildApp({
          tripManagementHooks: createScenarioTripManagementHooks(worlds),
          pool: database.pool,
          splittingHooks: createScenarioSplittingHooks(worlds),
          appOrigin: webOrigin,
          authSecret: TEST_AUTH_SECRET,
          google: { clientId: 'ledger-test-google', clientSecret: 'isolated-test-google-secret' },
        } as Parameters<typeof buildApp>[0] & { tripManagementHooks: TripManagementHooks });
        await app.listen({ host: '127.0.0.1', port: 0 });
        await use({ database, origin: app.listeningOrigin, webOrigin, worlds });
      } finally {
        try {
          await app?.close();
        } finally {
          try {
            await database.dispose();
          } finally {
            restoreGoogle();
          }
        }
      }
    },
    { scope: 'worker' },
  ],
  world: async ({ runtime }, use) => {
    const api = await request.newContext({ baseURL: runtime.origin });

    const world = new LedgerWorld(runtime.database.pool, api, runtime.origin, randomUUID());
    runtime.worlds.add(world);
    try {
      world.set('webOrigin', runtime.webOrigin);
      await use(world);
    } finally {
      runtime.worlds.delete(world);
      world.splitting.hooks = undefined;
      try {
        await disposeTripManagementContext(world.tripManagement);
      } finally {
        await api.dispose();
      }
    }
  },
});

export const { Given, When, Then } = createBdd(test);

export { expect };
