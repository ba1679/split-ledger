import { expect, type Locator, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { calendarContextKey, type CalendarContext } from './calendar-context.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';

export const keyboardDatePhrase = 'owner 以鍵盤選擇日期 2027-03-12';

export const calendarActionEvidenceKey = 'splitting:calendarActionEvidence';

export interface CalendarActionEvidence {
  before: BrowserSplittingSnapshot;
  initialDate: string;
  trigger: Locator;
  writes: string[];
}

/** A single user selection through the focused calendar, never a form submission. */
export async function selectMarchTwelfthWithKeyboard(
  page: Page,
  context: CalendarContext,
): Promise<void> {
  expect(context.initialDate).toBe('2027-03-11');
  await expect(context.dialog).toBeVisible();
  await expect(context.input).toHaveValue('2027/03/11');
  await expect(
    context.dialog.getByRole('button', { name: /^2027 年 3 月 11 日，/ }),
    'The selection must start at the date arranged by Given',
  ).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(
    context.dialog.getByRole('button', { name: /^2027 年 3 月 12 日，/ }),
    'ArrowRight must move the real calendar focus to March 12',
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(context.dialog).toBeHidden();
  await expect(context.trigger).toBeFocused();
}

export async function chooseCalendarDateWithKeyboard(
  page: Page,
  world: LedgerWorld,
): Promise<void> {
  const context = world.get<CalendarContext>(calendarContextKey);
  const before = await readBrowserSplittingSnapshot(world);
  const writes: string[] = [];
  const observe = (request: Request) => {
    const path = new URL(request.url()).pathname;
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method()) && path.startsWith('/api/'))
      writes.push(`${request.method()} ${path}`);
  };
  world.set(calendarActionEvidenceKey, {
    before,
    initialDate: context.initialDate,
    trigger: context.trigger,
    writes,
  } satisfies CalendarActionEvidence);
  page.on('request', observe);
  try {
    await selectMarchTwelfthWithKeyboard(page, context);
  } finally {
    page.off('request', observe);
  }
}
