import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { login } from '../browser.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import {
  anonymousBrowserPhrase,
  anonymousKnownDataKey,
  createAnonymousBrowser,
  seedAnonymousBrowser,
} from './anonymous-browser-fixture.js';
import { accessBrowserStateKey, type AccessBrowserState } from './other-account-browser-fixture.js';

test('T128: fresh anonymous context has no owner cookies or cached storage and no session', async ({
  browser,
  page,
  world,
}) => {
  const owner = await login(page, world);
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('owner-only-test-marker', 'private'));
  const ownerCookies = await page.context().cookies();
  const authBefore = await world.db.query('SELECT id FROM auth."user" ORDER BY id');
  const isolated = await createAnonymousBrowser(browser, world);
  try {
    await isolated.page.goto('/');
    expect(
      await isolated.page.evaluate(() => localStorage.getItem('owner-only-test-marker')),
    ).toBeNull();
    expect(await isolated.context.cookies()).toEqual([]);
    expect(await page.context().cookies()).toEqual(ownerCookies);
    const response = await page.context().request.get('/api/auth/get-session');
    expect((await response.json()).user.id).toBe(owner.id);
    expect(world.users.get('甲')).toEqual(owner);
    expect((await world.db.query('SELECT id FROM auth."user" ORDER BY id')).rows).toEqual(
      authBefore.rows,
    );
  } finally {
    await isolated.context.close();
  }
});

test('T128: isolated Given retains only known Amy input and separate owner authority', async ({
  browser,
  page,
  world,
}) => {
  try {
    await seedBrowserSplittingExpenses(page, world, [
      { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
    ]);
    const aliases = [...world.splitting.ids.members];
    await runIsolatedStep(
      {
        phrase: anonymousBrowserPhrase,
        input: undefined,
        execute: (context) => seedAnonymousBrowser(browser, context),
      },
      world,
    );
    const state = world.get<AccessBrowserState>(accessBrowserStateKey);
    expect(state.actor).toBeNull();
    expect(state.context).not.toBe(page.context());
    expect(await state.context.storageState()).toEqual({ cookies: [], origins: [] });
    expect(state.page.url()).toBe('about:blank');
    expect(state.companionIds).toEqual({ Amy: world.splitting.ids.members.get('Amy') });
    expect(world.get(anonymousKnownDataKey)).toEqual({
      tripPath: `/trips/${state.tripId}/settlement`,
      member: { id: state.companionIds.Amy, name: 'Amy' },
    });
    expect([...world.splitting.ids.members]).toEqual(aliases);
    expect(state.ownerSnapshot.expenses.items[0]!.shares).toHaveLength(3);
  } finally {
    const state = world.state.get(accessBrowserStateKey) as AccessBrowserState | undefined;
    await state?.dispose();
  }
});
