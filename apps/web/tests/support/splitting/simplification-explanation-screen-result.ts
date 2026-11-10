import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingMemberId } from '../../../../api/tests/support/splitting/members-fixture.js';
import type { CountSettlementView } from '../../../../api/tests/support/splitting/simplification-count-result.js';
import { snapshotExactBalances } from '../../../../api/tests/support/splitting/simplification-mode-fixture.js';
import {
  assertChangedExplanationProjection,
  assertChangedExplanationText,
} from '../../../../api/tests/support/splitting/simplification-explanation-result.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import { simplificationToggleKey, type SimplificationToggle } from './toggle-simplification.js';

export const simplificationExplanationScreenPhrase =
  '三句內說明 Alice 改付 Carol、兩筆變一筆與淨額及來源紀錄不變';

/** UI copy must describe both original edges as well as the actual new destination. */
export function assertSimplificationExplanationScreenText(text: string): void {
  assertChangedExplanationText(text);
  expect(text).not.toMatch(/Simplify\s*Debts/i);
  for (const [payer, payee] of [
    ['Alice', 'Bob'],
    ['Bob', 'Carol'],
  ]) {
    expect(text, `Explanation must describe the original ${payer} → ${payee} payment`).toMatch(
      new RegExp(
        `${payer}\\s*(?:原本|原先|原來|原|需|向|\\s)*(?:付款給|付款|支付給|支付|付給|付|轉帳給|轉給|→|->)\\s*(?:JPY\\s*60\\s*)?${payee}`,
      ),
    );
  }
  expect(text, 'Original expense and repayment records must both be explained').toMatch(/支出/);
  expect(text).toMatch(/還款/);
}

/** Read-only authority and visible explanation check after the single switch operation. */
export async function assertSimplificationExplanationScreen(
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
  assertChangedExplanationProjection(snapshot.sources, view, {
    alice: splittingMemberId(world, 'Alice'),
    bob: splittingMemberId(world, 'Bob'),
    carol: splittingMemberId(world, 'Carol'),
  });
  assertSimplificationExplanationScreenText(view.explanation);
  const control = page.getByRole('switch', { name: '簡化付款', exact: true });
  await expect(control).toBeVisible();
  await expect(control).toBeChecked();
  await expect(page.getByText('簡化付款', { exact: true })).toBeVisible();
  await expect(page.getByText(view.explanation, { exact: true })).toBeVisible();
  expect(await page.locator('body').innerText()).not.toMatch(/改道|精確|公平|Simplify\s*Debts/i);
  expect(
    await readBrowserSplittingSnapshot(world),
    'Then must preserve the complete authority snapshot',
  ).toEqual(snapshot);
}
