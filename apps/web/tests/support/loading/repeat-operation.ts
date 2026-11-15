import { expect } from '@playwright/test';
import { repeatLogin } from './repeat-login.js';
import { repeatPagination } from './repeat-pagination.js';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { OperationWait } from './operation-wait.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';

/** Native pointer and keyboard attempts must be guarded; no synthetic submit/disabled bypass. */
export async function repeatOperation(world: LedgerWorld): Promise<void> {
  if (world.state.has('loading:login')) {
    await repeatLogin(world);

    return;
  }
  if (world.state.has('loading:pagination')) {
    await repeatPagination(world);

    return;
  }
  const state = world.get<OperationWait>('loading:operation'),
    ui = managementUI(world);
  expect(state.released).toBe(false);
  expect(ui.writes.length).toBe(1);
  const original = ui.writes[0]!;
  await expect(state.control).toBeVisible();
  const box = await state.control.boundingBox();
  expect(box).not.toBeNull();
  await ui.page.mouse.dblclick(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await ui.page.keyboard.press('Enter');
  await ui.page.keyboard.press('Enter');
  expect(ui.writes.length).toBe(1);
  expect(ui.writes[0] === original).toBe(true);
  expect(state.exchanges.length).toBe(1);
  state.release();
  const response = await original.response();
  expect(response?.status()).toBe(state.status);
  expect(await response!.finished()).toBeNull();
  if (state.status === 204) expect((await response!.body()).length).toBe(0);
  else expect(await response!.json()).toEqual(state.body);
  await expect.poll(() => state.finished).toBe(1);
  await waitForManagementReads(ui);
  expect(ui.writes.length).toBe(1);
  expect(state.exchanges.length).toBe(1);
  expect(state.errors.map(String)).toEqual([]);
  world.set('loading:repeatComplete', true);
}
