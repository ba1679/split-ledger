import { createBdd } from 'playwright-bdd';
import { Given, test } from '../../../support/fixtures.js';
import {
  seedMigratedLegacyExpense,
  type LegacySplittingContext,
} from '../../../support/splitting/legacy-fixture.js';

Given('舊版機票支出已完成分帳資料遷移', async ({ world }) => {
  await seedMigratedLegacyExpense(world);
});

createBdd(test).After(async ({ world }) => {
  if (world.state.has('splitting:legacyContext'))
    await world.get<LegacySplittingContext>('splitting:legacyContext').dispose();
});
