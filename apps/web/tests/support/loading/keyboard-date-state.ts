import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementUI } from '../trips/management-fixture.js';
import type { KeyboardDate } from './keyboard-date.js';

export async function enterKeyboardDateState(world: LedgerWorld): Promise<void> {
  const state = world.get<KeyboardDate>('loading:keyboardDate'),
    ui = managementUI(world),
    wait = state.wait;
  expect(ui.writes.length).toBe(1);
  const original = ui.writes[0]!;
  expect(wait.exchanges.length).toBe(1);
  expect(wait.finished).toBe(0);
  expect(wait.released).toBe(false);
  await expect(wait.control).toBeFocused();
  if (state.result === '成功') {
    wait.release();
    const response = await original.response();
    expect(response?.status()).toBe(200);
    expect(await response!.finished()).toBeNull();
    expect(await response!.json()).toEqual(wait.body);
    await expect(
      ui.page.getByRole('status').filter({ hasText: /日期已更新|已儲存日期|儲存成功|保存成功/ }),
    ).toBeVisible();
    await expect.poll(() => wait.finished).toBe(1);
  } else {
    expect(state.result).toBe('延遲');
    await expect(wait.control).toHaveAttribute('aria-busy', 'true');
    await expect(wait.control.getByRole('status')).toBeVisible();
    expect(wait.finished).toBe(0);
    expect(wait.released).toBe(false);
  }
  expect(ui.writes.length).toBe(1);
  expect(ui.writes[0]).toBe(original);
  expect(wait.exchanges.length).toBe(1);
  expect(wait.errors.map(String)).toEqual([]);
}
