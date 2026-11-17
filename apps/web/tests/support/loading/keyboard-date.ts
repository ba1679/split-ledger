import { expect, type Locator } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementUI } from '../trips/management-fixture.js';
import { managementTripId } from '../../../../api/tests/support/trip-management/baseline.js';
import type { OperationWait } from './operation-wait.js';
import { arrangeOperationWait } from './operation-wait.js';
import { tabTo } from './keyboard-fixture.js';

export interface KeyboardDate {
  result: string;
  wait: OperationWait;
  trigger: Locator;
  originalName: string;
  target: { startDate: string; endDate: string };
  announcements: string[];
}

export async function arrangeKeyboardDate(world: LedgerWorld, result: string): Promise<void> {
  expect(['延遲', '成功']).toContain(result);
  const page = managementUI(world).page,
    tripId = managementTripId(world);
  const trigger = page.getByRole('button', { name: '旅行日期', exact: true });
  await tabTo(page, trigger);
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (const [label, value] of [
    ['開始日', '2027/03/09'],
    ['結束日', '2027/03/16'],
  ]) {
    const input = dialog.getByRole('textbox', { name: label, exact: true });
    await tabTo(page, input);
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.insertText(value!);
    await page.keyboard.press('Tab');
    await expect(input).toHaveValue(value!);
  }
  const control = dialog.getByRole('button', { name: '儲存變更', exact: true });
  await tabTo(page, control);
  const name = (await control.innerText()).trim();
  await arrangeOperationWait(page, world, '保存旅行名稱與日期', {
    operation: '保存旅行名稱與日期',
    tripId,
    method: 'PATCH',
    path: `/api/trips/${tripId}`,
    status: 200,
    control,
    name,
  });
  const wait = world.get<OperationWait>('loading:operation');
  const state: KeyboardDate = {
    result,
    wait,
    trigger,
    originalName: name,
    target: { startDate: '2027-03-09', endDate: '2027-03-16' },
    announcements: [],
  };
  await page.exposeFunction('ledgerDateAnnouncement', (text: string) =>
    state.announcements.push(text),
  );
  await page.evaluate(() => {
    const last = new WeakMap<Element, string>();
    const observer = new MutationObserver(() => {
      for (const element of document.querySelectorAll(
        '[role="status"],[aria-live="polite"],[aria-live="assertive"]',
      )) {
        const text = element.textContent?.trim() ?? '';
        if (text && text !== last.get(element)) {
          last.set(element, text);
          void (
            window as unknown as { ledgerDateAnnouncement(text: string): Promise<void> }
          ).ledgerDateAnnouncement(text);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
  });
  wait.box = (await control.boundingBox())!;
  await expect(control).toBeFocused();
  wait.focus = 'control';
  await page.keyboard.press('Enter');
  await expect.poll(() => wait.after !== undefined || wait.errors.length > 0).toBe(true);
  expect(wait.errors.map(String)).toEqual([]);
  const writes = managementUI(world).writes;
  expect(writes.length).toBe(1);
  expect(writes[0]!.method()).toBe('PATCH');
  expect(new URL(writes[0]!.url()).pathname).toBe(wait.path);
  expect(writes[0]!.postDataJSON()).toMatchObject(state.target);
  expect(wait.exchanges.length).toBe(1);
  expect(wait.finished).toBe(0);
  expect(wait.released).toBe(false);
  world.set('loading:keyboardDate', state);
}
