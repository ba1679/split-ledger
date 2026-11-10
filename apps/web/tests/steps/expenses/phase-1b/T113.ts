import { createBdd } from 'playwright-bdd';
import { Given, test } from '../../../support/fixtures.js';
import {
  legacyBrowserExpensePhrase,
  seedBrowserMigratedLegacyExpense,
  disposeBrowserMigratedLegacyExpense,
} from '../../../support/splitting/legacy-browser-fixture.js';

Given(legacyBrowserExpensePhrase, async ({ page, world }) => {
  await seedBrowserMigratedLegacyExpense(page, world);
});

createBdd(test).After(async ({ page, world }) => {
  await disposeBrowserMigratedLegacyExpense(page, world);
});
