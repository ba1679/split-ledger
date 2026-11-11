import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import {
  expenseAuthorityWorld,
  seedMigratedLegacyExpense,
  type LegacySplittingContext,
} from './legacy-fixture.js';

test('T014: migrate a real pre-005 expense and retain fields, totals and owner-only shares', async ({
  world,
}) => {
  try {
    await runIsolatedStep(
      {
        phrase: '舊版機票支出已完成分帳資料遷移',
        input: undefined,
        execute: seedMigratedLegacyExpense,
      },
      world,
    );
    const authority = expenseAuthorityWorld(world);
    expect(authority).not.toBe(world);
    expect(world.get('splitting:legacyExpenseBefore')).toMatchObject({
      item: '機票',
      amount_minor: '800000',
      currency_code: 'TWD',
      minor_unit: 2,
      spent_on: '2027-01-15',
      category_id: null,
    });
    expect(authority.splitting.snapshot?.shares).toHaveLength(1);
    expect(authority.splitting.snapshot?.members).toHaveLength(1);
  } finally {
    if (world.state.has('splitting:legacyContext'))
      await world.get<LegacySplittingContext>('splitting:legacyContext').dispose();
  }
});
