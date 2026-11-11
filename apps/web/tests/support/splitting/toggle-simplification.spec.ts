import { test, expect } from '../fixtures.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { openDirectSettlementScreen } from './direct-settlement-screen.js';
import { arrangeRejectedSimplificationSave } from './rejected-simplification-save.js';
import {
  enableSimplificationPhrase,
  toggleSimplification,
  simplificationSaveOutcome,
  simplificationToggleKey,
  type SimplificationToggle,
} from './toggle-simplification.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedTrip } from '../../../../api/tests/support/seed.js';
import { login } from '../browser.js';

test('T171: only successful writes are confirmed; server failures remain unconfirmed', () => {
  expect(simplificationSaveOutcome(200)).toBe('saved');
  expect(simplificationSaveOutcome(400)).toBe('rejected');
  expect(simplificationSaveOutcome(409)).toBe('rejected');
  expect(simplificationSaveOutcome(500)).toBe('unconfirmed');
});

for (const rejected of [false, true])
  test(`T171: one switch operation waits for the real saved revision or rejection (${rejected})`, async ({
    page,
    world,
  }) => {
    await seedBrowserSplittingExpenses(page, world, [
      { 項目: '車票', 幣別: 'JPY', 金額: '60', 付款人: 'Bob', 分攤者: 'Alice' },
      { 項目: '門票', 幣別: 'JPY', 金額: '60', 付款人: 'Carol', 分攤者: 'Bob' },
    ]);
    await openDirectSettlementScreen(page, world);
    if (rejected) await arrangeRejectedSimplificationSave(page, world);
    await runIsolatedStep(
      {
        phrase: enableSimplificationPhrase,
        input: undefined,
        execute: () => toggleSimplification(page, world, true),
      },
      world,
    );
    expect(world.get<SimplificationToggle>(simplificationToggleKey).outcome).toBe(
      rejected ? 'rejected' : 'saved',
    );
  });

test('T171: actual settlement product exposes the accessible simplification switch', async ({
  page,
  world,
}) => {
  const trip = await seedTrip(world, '日本旅行');
  await login(page, world);
  await page.goto(`/trips/${trip.id}/settlement`);
  await expect(page.getByRole('switch', { name: '簡化付款', exact: true })).toBeVisible();
});
