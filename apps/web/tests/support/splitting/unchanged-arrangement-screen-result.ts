import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingMemberId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { snapshotExactBalances } from '../../../../api/tests/support/splitting/simplification-mode-fixture.js';
import { assertUnchangedArrangementProjection } from '../../../../api/tests/support/splitting/unchanged-arrangement-explanation-result.js';
import type { CountSettlementView } from '../../../../api/tests/support/splitting/simplification-count-result.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import { simplificationToggleKey, type SimplificationToggle } from './toggle-simplification.js';
import { assertArrangementsScreen } from './arrangements-screen-result.js';

export const unchangedArrangementScreenPhrase =
  '仍為 Amy 支付 Alice JPY 500 並提示目前的付款安排已無需調整';

export function assertUnchangedArrangementScreenText(text: string): void {
  expect(text).toContain('目前的付款安排已無需調整');
  expect(
    text.split(/[。！？!?]+/u).filter((sentence) => sentence.trim()).length,
  ).toBeLessThanOrEqual(3);
  expect(text).not.toMatch(/改道|精確|公平|Simplify\s*Debts|無需(?:再)?付款|不用(?:再)?付款/i);
}

/** Read the confirmed result; never toggle the mode or trigger another product operation. */
export async function assertUnchangedArrangementScreen(
  page: Page,
  world: LedgerWorld,
): Promise<void> {
  const action = world.get<SimplificationToggle>(simplificationToggleKey);
  expect(action.enabled).toBe(true);
  expect(action.outcome).toBe('saved');
  expect(action.confirmed).not.toBeNull();
  const snapshot = await readBrowserSplittingSnapshot(world);
  expect(snapshot).toEqual(action.after);
  expect(snapshot.settlement).toEqual(action.confirmed);
  for (const key of [
    'members',
    'expenses',
    'shares',
    'repayments',
    'settlements',
    'adjustments',
  ] as const)
    expect(snapshot.sources[key]).toEqual(action.before.snapshot.sources[key]);
  expect(snapshotExactBalances(snapshot.sources)).toEqual(
    snapshotExactBalances(action.before.snapshot.sources),
  );
  expect(snapshot.settlement.balances).toEqual(action.before.snapshot.settlement.balances);
  const view = snapshot.settlement as CountSettlementView & { explanation: string };
  assertUnchangedArrangementProjection(
    snapshot.sources,
    view,
    splittingMemberId(world, 'Amy'),
    splittingMemberId(world, 'Alice'),
  );
  assertUnchangedArrangementScreenText(view.explanation);
  const control = page.getByRole('switch', { name: '簡化付款', exact: true });
  await expect(control).toBeVisible();
  await expect(control).toBeChecked();
  await expect(page.getByText(view.explanation, { exact: true })).toBeVisible();
  expect(await page.locator('body').innerText()).not.toMatch(/改道|精確|公平|Simplify\s*Debts/i);
  await assertArrangementsScreen(page, world, [
    { 付款人: 'Amy', 收款人: 'Alice', 幣別: 'JPY', 金額: '500', 顯示: 'JPY 500' },
  ]);
  expect(await readBrowserSplittingSnapshot(world), 'Then must remain read-only').toEqual(snapshot);
}
