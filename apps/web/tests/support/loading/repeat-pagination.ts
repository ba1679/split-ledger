import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { PaginationRead } from './pagination-fixture.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';

export async function repeatPagination(world: LedgerWorld): Promise<void> {
  const state = world.get<PaginationRead>('loading:pagination'),
    ui = managementUI(world);
  expect(state.requests.length).toBe(1);
  expect(state.released).toBe(false);
  expect(state.finished).toBe(0);
  const original = state.requests[0]!;
  const box = await state.control.boundingBox();
  expect(box).not.toBeNull();
  await ui.page.mouse.dblclick(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await ui.page.keyboard.press('Enter');
  await ui.page.keyboard.press('Enter');
  expect(state.requests.length).toBe(1);
  expect(state.requests[0] === original).toBe(true);
  state.release();
  const response = await original.response();
  expect(response?.status()).toBe(200);
  expect(await response!.finished()).toBeNull();
  expect(await response!.json()).toEqual(state.second);
  await expect.poll(() => state.finished).toBe(1);
  await waitForManagementReads(ui);
  expect(state.requests.length).toBe(1);
  expect(state.arrived).toBe(1);
  expect(ui.writes.length).toBe(0);
  expect(state.errors.map(String)).toEqual([]);
  world.set('loading:repeatComplete', true);
}
