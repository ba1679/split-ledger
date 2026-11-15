import { When, expect } from '../../../support/fixtures.js';
import { awaitAuthReadHeld, type AuthWait } from '../../../support/loading/auth-wait.js';
import { managementUI } from '../../../support/trips/management-fixture.js';

When('使用者開啟網站', async ({ page, world }) => {
  const state = world.get<AuthWait>('loading:auth');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await awaitAuthReadHeld(world);
  expect(state.finished).toBe(0);
  expect(state.errors.map(String)).toEqual([]);
  const ui = managementUI(world);
  expect(ui.writes.length).toBe(0);
  expect(ui.reads.length).toBeGreaterThan(0);
  expect(ui.reads.every((read) => new URL(read.url()).pathname === '/api/me')).toBe(true);
});
