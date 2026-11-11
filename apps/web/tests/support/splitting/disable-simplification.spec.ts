import { test, expect } from '../fixtures.js';
import { seedTrip } from '../../../../api/tests/support/seed.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { login } from '../browser.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { saveEnabledSimplification } from './saved-simplification-fixture.js';
import { openConfirmedSettlementScreen } from './settlement-screen.js';
import {
  toggleSimplification,
  simplificationToggleKey,
  type SimplificationToggle,
} from './toggle-simplification.js';

test('T172: one real switch operation restores persisted direct arrangements', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '車票', 幣別: 'JPY', 金額: '60', 付款人: 'Bob', 分攤者: 'Alice' },
    { 項目: '門票', 幣別: 'JPY', 金額: '60', 付款人: 'Carol', 分攤者: 'Bob' },
  ]);
  await saveEnabledSimplification(world);
  await openConfirmedSettlementScreen(page, world, true);
  await runIsolatedStep(
    {
      phrase: 'owner 關閉簡化付款',
      input: undefined,
      execute: () => toggleSimplification(page, world, false),
    },
    world,
  );
  const toggle = world.get<SimplificationToggle>(simplificationToggleKey);
  expect(toggle.enabled).toBe(false);
  expect(toggle.payload).toEqual({ simplifyDebts: false });
  expect(toggle.outcome).toBe('saved');
  expect(toggle.confirmed?.simplifyDebts).toBe(false);
  expect(toggle.before.snapshot.settlement.arrangements).toHaveLength(1);
  expect(toggle.confirmed?.arrangements).toHaveLength(2);
});

test('T172: actual settlement product provides the named switch for disabling', async ({
  page,
  world,
}) => {
  const trip = await seedTrip(world, '日本旅行');
  await login(page, world);
  await page.goto(`/trips/${trip.id}/settlement`);
  await expect(page.getByRole('switch', { name: '簡化付款', exact: true })).toBeVisible();
});
