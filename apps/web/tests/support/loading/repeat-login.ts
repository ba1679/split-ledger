import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { LoginWait } from './login-wait.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';

/** The shared repeat step completes the original OAuth start; it never starts another flow. */
export async function repeatLogin(world: LedgerWorld): Promise<void> {
  const state = world.get<LoginWait>('loading:login'),
    ui = managementUI(world),
    page = ui.page;
  expect(state.requests.length).toBe(1);
  expect(state.externalStarts).toBe(0);
  expect(state.callbacks).toBe(0);
  expect(state.finished).toBe(0);
  expect(state.released).toBe(false);
  const original = state.requests[0]!;
  const box = await state.control.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.dblclick(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  expect(state.requests.length).toBe(1);
  state.release();
  const response = await original.response();
  expect(response?.status()).toBe(200);
  expect(await response!.finished()).toBeNull();
  await expect(page).toHaveURL(`${world.get<string>('webOrigin')}/trips`);
  await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
  await waitForManagementReads(ui);
  expect(state.requests.length).toBe(1);
  expect(state.requests[0] === original).toBe(true);
  expect(state.arrived).toBe(1);
  expect(state.finished).toBe(1);
  expect(state.externalStarts).toBe(1);
  expect(state.callbacks).toBe(1);
  expect(ui.writes.length).toBe(1);
  expect(state.errors.map(String)).toEqual([]);
  world.set('loading:repeatComplete', true);
}
