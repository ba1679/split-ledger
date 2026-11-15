import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import { assertOtherDataUnchanged } from '../../../../api/tests/support/trip-management/preservation.js';
import { SESSION_COOKIE } from '../../../../api/tests/support/seed.js';
import type { LoginWait } from './login-wait.js';
import { assertSpinnerOnly } from './spinner-result.js';
import { managementUI } from '../trips/management-fixture.js';

export async function assertLoginBusy(world: LedgerWorld): Promise<void> {
  const state = world.get<LoginWait>('loading:login'),
    ui = managementUI(world),
    page = ui.page;
  expect(state.arrived).toBe(1);
  expect(state.finished).toBe(0);
  expect(state.released).toBe(false);
  await expect(state.control).toHaveAccessibleName(state.name);
  await expect(state.control).toHaveAttribute('aria-busy', 'true');
  await assertSpinnerOnly(
    state.control.locator('[role="status"]'),
    /登入.*(?:Google|確認|處理)|(?:Google|正在).*登入/,
  );
  expect(await state.control.innerText()).not.toMatch(/正在登入|登入中|處理中|\d+%/);
  const box = await state.control.boundingBox();
  expect(box).not.toBeNull();
  for (const key of ['x', 'y', 'width', 'height'] as const)
    expect(Math.abs(box![key] - state.box![key])).toBeLessThanOrEqual(1);
  expect(await page.locator('body').innerText()).not.toMatch(
    /日本旅行|台南旅行|私人旅行|晚餐|Alice|已登入|登入成功/,
  );
  await expect(page.getByRole('region', { name: '成員淨額', exact: true })).toHaveCount(0);
  const me = await page.context().request.get('/api/me');
  expect(me.status()).toBe(401);
  expect(
    (await page.context().cookies()).filter((cookie) => cookie.name === SESSION_COOKIE).length,
  ).toBe(0);
  expect(state.requests.length).toBe(1);
  expect(state.externalStarts).toBe(0);
  expect(ui.writes.length).toBe(1);
  expect(await managementSnapshot(world)).toEqual(state.before);
  await assertOtherDataUnchanged(world);
}
