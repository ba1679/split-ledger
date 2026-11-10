import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import {
  captureMobileSavedSplitting,
  mobileSavedSplittingKey,
  mobileSavedSplittingPhrase,
  type MobileSavedSplitting,
} from './mobile-saved-fixture.js';

test('T119: phone reads existing stable identities and shares, then closes its context', async ({
  browser,
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  const contexts = browser.contexts();
  await runIsolatedStep(
    {
      phrase: mobileSavedSplittingPhrase,
      input: undefined,
      execute: (context) => captureMobileSavedSplitting(browser, context),
    },
    world,
  );
  expect(browser.contexts()).toEqual(contexts);
  const saved = world.get<MobileSavedSplitting>(mobileSavedSplittingKey);
  expect(saved.memberIds).toHaveLength(3);
  expect(saved.expenseIds).toHaveLength(1);
  expect(saved.snapshot.expenses.items[0]!.shares).toHaveLength(3);
  expect(page.url()).toBe('about:blank');
});
