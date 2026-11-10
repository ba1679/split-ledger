import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { openCustomDateCalendar } from './calendar-context.js';
import { readBrowserSplittingSnapshot, seedBrowserSplittingExpenses } from './fixture.js';
import {
  openBrowserSettlementForm,
  settlementBeforeKey,
  settlementWritesKey,
} from './settlement-form.js';
import type { BrowserSplittingSnapshot } from './fixture.js';
import type { RepaymentBrowserWrite } from './repayment-draft.js';

export const settlementCalendarPhrase = 'owner 已開啟結清日期日曆且焦點在 2027-03-11';

/** Arrange a genuine JPY 100 obligation and open its unsaved custom DateField. */
export async function arrangeSettlementCalendar(page: Page, world: LedgerWorld): Promise<void> {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await openBrowserSettlementForm(page, world, 'Amy');
  const before = world.get<BrowserSplittingSnapshot>(settlementBeforeKey);
  expect(before.settlement.arrangements).toHaveLength(1);
  expect(before.settlement.arrangements[0]!.amount).toEqual({
    numerator: '100',
    denominator: '1',
    minorUnit: 0,
  });
  await openCustomDateCalendar(page, world, '結清日期');
  expect(
    world.get<RepaymentBrowserWrite[]>(settlementWritesKey),
    'Opening the settlement calendar must not submit a mutation',
  ).toEqual([]);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(before);
}
