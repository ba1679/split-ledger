import { test, expect } from '../fixtures.js';
import { seedExpense } from '../seed.js';
import { LedgerWorld } from '../world.js';
import { runIsolatedStep } from './harness.js';
import { seedMigratedLegacyExpense, type LegacySplittingContext } from './legacy-fixture.js';
import { readMigratedFlightExpense } from './read-migrated-expense-command.js';

test('T041 isolated migrated read retains its original response', async ({ world }) => {
  try {
    await seedMigratedLegacyExpense(world);
    await runIsolatedStep(
      {
        phrase: 'owner 讀取遷移後的機票支出',
        input: undefined,
        execute: readMigratedFlightExpense,
      },
      world,
    );
    expect(world.response?.status()).toBe(200);
    expect(world.get('splitting:reply')).toMatchObject({
      id: world.get('splitting:expenseId'),
      item: '機票',
    });
  } finally {
    if (world.state.has('splitting:legacyContext'))
      await world.get<LegacySplittingContext>('splitting:legacyContext').dispose();
  }
});

test('T041 direct read uses the selected authority without modifying the expense', async ({
  world,
}) => {
  const expense = await seedExpense(world, {
    item: '機票',
    amount: '8000',
    currencyCode: 'TWD',
    spentOn: '2027-01-15',
    categoryName: null,
  });
  const authority = new LedgerWorld(world.db, world.api, world.origin, world.namespace);
  authority.users.set('甲', world.users.get('甲')!);
  authority.splitting.ids.expenses.set('機票', expense.id);
  authority.set('splitting:tripId', expense.trip_id);
  world.set('splitting:legacyWorld', authority);
  const before = (await world.db.query('SELECT * FROM expenses WHERE id=$1', [expense.id])).rows;
  await readMigratedFlightExpense(world);
  expect(world.response?.status()).toBe(200);
  expect(world.get('splitting:reply')).toMatchObject({ id: expense.id, item: '機票' });
  expect((await world.db.query('SELECT * FROM expenses WHERE id=$1', [expense.id])).rows).toEqual(
    before,
  );
});
