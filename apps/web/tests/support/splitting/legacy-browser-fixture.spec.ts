import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { expenseAuthorityWorld } from '../../../../api/tests/support/splitting/legacy-fixture.js';
import {
  legacyBrowserExpensePhrase,
  seedBrowserMigratedLegacyExpense,
  disposeBrowserMigratedLegacyExpense,
} from './legacy-browser-fixture.js';
import { browserSplittingStateKey, type BrowserSplittingSnapshot } from './fixture.js';

test('T113: archived personal flight is formally migrated and served to the actual browser', async ({
  page,
  world,
}) => {
  try {
    await runIsolatedStep(
      {
        phrase: legacyBrowserExpensePhrase,
        input: undefined,
        execute: async (context) => seedBrowserMigratedLegacyExpense(page, context),
      },
      world,
    );
    const initial = world.get<BrowserSplittingSnapshot>(browserSplittingStateKey);
    expect(page.url()).toBe('about:blank');
    expect(initial.sources.members).toHaveLength(1);
    expect(initial.sources.members[0]).toMatchObject({ name: 'Alice', role: 'owner' });
    const authority = expenseAuthorityWorld(world);
    expect(authority).not.toBe(world);
    const tripId = authority.get<string>('splitting:tripId');
    // A browser request through the same origin must reach the isolated app and DB.
    await page.goto(`${world.get<string>('webOrigin')}/trips/${tripId}`);
    const reply = await page.evaluate(async (id) => {
      const response = await fetch(`/api/trips/${id}/expenses`);

      return { status: response.status, body: await response.json() };
    }, tripId);
    expect(reply.status).toBe(200);
    expect(reply.body.items).toHaveLength(1);
    expect(reply.body.items[0].id).toBe(initial.expenses.items[0]!.id);
  } finally {
    await disposeBrowserMigratedLegacyExpense(page, world);
  }
});
