import { Then, expect } from '../../../support/fixtures.js';
import type { LoginWait } from '../../../support/loading/login-wait.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';
import { SESSION_COOKIE } from '../../../../../api/tests/support/seed.js';
import {
  managementSnapshot,
  sharedSnapshot,
} from '../../../../../api/tests/support/trip-management/baseline.js';

Then('登入只啟動一次且成功返回後結束等待', async ({ page, world }) => {
  const state = world.get<LoginWait>('loading:login'),
    ui = managementUI(world);
  expect(world.get<boolean>('loading:repeatComplete')).toBe(true);
  expect(state.requests.length).toBe(1);
  expect(state.externalStarts).toBe(1);
  expect(state.callbacks).toBe(1);
  expect(state.arrived).toBe(1);
  expect(state.finished).toBe(1);
  expect(state.released).toBe(true);
  await expect(page).toHaveURL(`${world.get<string>('webOrigin')}/trips`);
  await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: state.name, exact: true })).toHaveCount(0);
  await waitForManagementReads(ui);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: /正在登入|登入中/ })).toHaveCount(0);
  const me = await page.context().request.get('/api/me');
  expect(me.status()).toBe(200);
  const alice = world.users.get('Alice')!;
  expect(await me.json()).toMatchObject({ id: alice.id, name: 'Alice' });
  const cookies = (await page.context().cookies()).filter(
    (cookie) => cookie.name === SESSION_COOKIE,
  );
  expect(cookies.length).toBe(1);
  expect(cookies[0]!.httpOnly).toBe(true);
  // Correlate the actual authenticated browser cookie with the production session row.
  const token = decodeURIComponent(cookies[0]!.value).split('.')[0]!;
  const sessions = await world.db.query(
    'SELECT user_id,expires_at>now() AS active FROM auth.session WHERE token=$1',
    [token],
  );
  expect(sessions.rows).toEqual([{ user_id: alice.id, active: true }]);
  expect(await managementSnapshot(world)).toEqual(state.before);
  const before = world.get<Awaited<ReturnType<typeof sharedSnapshot>>>('management:sharedBefore');
  const after = await sharedSnapshot(world);
  const normalize = (user: Record<string, unknown>) =>
    user.id === alice.id
      ? Object.fromEntries(Object.entries(user).filter(([key]) => key !== 'updated_at'))
      : user;
  // OAuth may refresh Alice's own auth profile timestamp; travel/account isolation still holds.
  expect({ ...after, users: after.users.map(normalize) }).toEqual({
    ...before,
    users: before.users.map(normalize),
  });
  expect(ui.writes.length).toBe(1);
  expect(state.errors.map(String)).toEqual([]);
});
