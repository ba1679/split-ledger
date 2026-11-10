import { test } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { captureMobileSavedSplitting } from './mobile-saved-fixture.js';
import {
  desktopSplittingKey,
  openDesktopSplitting,
  type DesktopSplitting,
} from './desktop-splitting.js';
import {
  assertDesktopSplittingResult,
  desktopSplittingResultPhrase,
} from './desktop-splitting-result.js';

test('T194: fresh desktop displays the phone identities, source expense and exact thirds', async ({
  browser,
  page,
  world,
}) => {
  try {
    await seedBrowserSplittingExpenses(page, world, [
      { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
    ]);
    await captureMobileSavedSplitting(browser, world);
    await openDesktopSplitting(browser, world);
    await runIsolatedStep(
      {
        phrase: desktopSplittingResultPhrase,
        input: undefined,
        execute: assertDesktopSplittingResult,
      },
      world,
    );
  } finally {
    await (world.state.get(desktopSplittingKey) as DesktopSplitting | undefined)?.dispose();
    world.state.delete(desktopSplittingKey);
  }
});
