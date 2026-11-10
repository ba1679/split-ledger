import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { captureMobileSavedSplitting } from './mobile-saved-fixture.js';
import {
  desktopSplittingKey,
  desktopSplittingPhrase,
  openDesktopSplitting,
  type DesktopSplitting,
} from './desktop-splitting.js';

test('T155: a fresh owner desktop reads the saved trip once without writes', async ({
  browser,
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await captureMobileSavedSplitting(browser, world);
  const existingContexts = browser.contexts();
  try {
    await runIsolatedStep(
      {
        phrase: desktopSplittingPhrase,
        input: undefined,
        execute: (context) => openDesktopSplitting(browser, context),
      },
      world,
    );
    const state = world.get<DesktopSplitting>(desktopSplittingKey);
    expect(existingContexts).not.toContain(state.context);
    expect(state.page.viewportSize()?.width).toBe(1280);
    expect(state.expenses).toEqual(state.phone.snapshot.expenses);
    expect(state.settlement).toEqual(state.phone.snapshot.settlement);
    expect(state.writes).toEqual([]);
    expect(page.url()).toBe('about:blank');
  } finally {
    await (world.state.get(desktopSplittingKey) as DesktopSplitting | undefined)?.dispose();
  }
});
