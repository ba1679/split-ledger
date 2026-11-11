import { expect, type Locator, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';

export const calendarContextKey = 'splitting:calendarContext';

export interface CalendarContext {
  label: string;
  initialDate: string;
  input: Locator;
  trigger: Locator;
  dialog: Locator;
}

/** Retains the real initiating control so later keyboard/cancel steps can check focus restoration. */
export async function openCustomDateCalendar(
  page: Page,
  world: LedgerWorld,
  label: string,
  date = '2027-03-11',
): Promise<CalendarContext> {
  const input = page.getByRole('textbox', { name: label, exact: true });
  const trigger = page.getByRole('button', { name: `選擇${label}`, exact: true });
  const dialog = page.getByRole('dialog', { name: `選擇${label}`, exact: true });
  await expect(input, 'DateField must provide a manually editable date textbox').toBeVisible();
  await expect(page.locator('input[type="date"]'), 'Use the shared custom DateField').toHaveCount(
    0,
  );
  await input.fill(date.replaceAll('-', '/'));
  await input.press('Tab');
  await expect(input).toHaveValue(date.replaceAll('-', '/'));
  await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const [year, month, day] = date.split('-').map(Number);
  await expect(
    dialog.getByRole('button', { name: new RegExp(`^${year} 年 ${month} 月 ${day} 日，`) }),
    'Opening DateField must focus the selected date through the real calendar',
  ).toBeFocused();
  const context: CalendarContext = { label, initialDate: date, input, trigger, dialog };
  world.set(calendarContextKey, context);

  return context;
}
