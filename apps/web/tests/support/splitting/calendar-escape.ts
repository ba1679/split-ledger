import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { calendarContextKey, type CalendarContext } from './calendar-context.js';
import { calendarActionEvidenceKey, type CalendarActionEvidence } from './calendar-keyboard.js';
import { readBrowserSplittingSnapshot } from './fixture.js';

export const escapeCalendarPhrase = 'owner 按 Escape 關閉日期日曆';

/** Cancel the already open calendar through exactly one Escape keypress. */
export async function pressEscapeOnCalendar(page: Page, context: CalendarContext): Promise<void> {
  await expect(context.dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(context.dialog).toBeHidden();
}

export async function closeCalendarWithEscape(page: Page, world: LedgerWorld): Promise<void> {
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
    await pressEscapeOnCalendar(page, context);
  } finally {
    page.off('request', observe);
  }
}
