import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { arrangeSharedExpenseForm, sharedExpenseBeforeKey } from './expense-draft.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import { openCustomDateCalendar } from './calendar-context.js';

export const expenseCalendarPhrase = 'owner 已開啟支出日期日曆且焦點在 2027-03-11';

export async function arrangeExpenseCalendar(page: Page, world: LedgerWorld): Promise<void> {
  const writes: string[] = [];
  const observe = (request: import('@playwright/test').Request) => {
    if (
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method()) &&
      new URL(request.url()).pathname.startsWith('/api/trips/')
    )
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
  };
  page.on('request', observe);
  try {
    await arrangeSharedExpenseForm(page, world);
    const before = world.get<BrowserSplittingSnapshot>(sharedExpenseBeforeKey);
    await openCustomDateCalendar(page, world, '支出日期');
    expect(writes, 'Opening the date calendar must not submit a write').toEqual([]);
    expect(await readBrowserSplittingSnapshot(world)).toEqual(before);
  } finally {
    page.off('request', observe);
  }
}
