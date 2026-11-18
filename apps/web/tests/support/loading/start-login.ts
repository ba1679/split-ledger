import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { LoginWait } from './login-wait.js';
import { managementUI } from '../trips/management-fixture.js';

export async function startLogin(world: LedgerWorld): Promise<void> {
  const state = world.get<LoginWait>('loading:login');
  await expect(state.control).toHaveAccessibleName(state.name);
  await state.control.scrollIntoViewIfNeeded();
  state.box = (await state.control.boundingBox())!;
  expect(state.box).not.toBeNull();
  expect(state.requests.length).toBe(0);
  await state.control.click();
  await expect.poll(() => state.arrived).toBe(1);
  expect(state.requests.length).toBe(1);
  expect(state.requests[0]!.postDataJSON()).toMatchObject({
    provider: 'google',
    callbackURL: `${world.get<string>('webOrigin')}/trips`,
  });
  expect(state.finished).toBe(0);
  expect(state.released).toBe(false);
  expect(state.externalStarts).toBe(0);
  expect(state.errors.map(String)).toEqual([]);
  expect(managementUI(world).writes.length).toBe(1);
}
