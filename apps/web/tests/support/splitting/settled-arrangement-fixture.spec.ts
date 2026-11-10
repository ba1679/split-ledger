import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import {
  browserSettledArrangementPhrase,
  browserSettledHistoryKey,
  settleBrowserAmyArrangement,
} from './settled-arrangement-fixture.js';
import type { BrowserSplittingSnapshot } from './fixture.js';

test('T104: Given settles a current rational arrangement through API and retains immutable history', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await runIsolatedStep(
    {
      phrase: browserSettledArrangementPhrase,
      input: undefined,
      execute: settleBrowserAmyArrangement,
    },
    world,
  );
  const history = world.get<BrowserSplittingSnapshot>(browserSettledHistoryKey);
  expect(history.sources.repayments).toHaveLength(1);
  expect(history.sources.adjustments).toHaveLength(2);
  expect(page.url()).toBe('about:blank');
});
