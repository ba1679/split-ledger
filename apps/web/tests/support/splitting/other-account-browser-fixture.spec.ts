import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { login } from '../browser.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import {
  accessBrowserStateKey,
  createOtherAccountBrowser,
  otherAccountBrowserPhrase,
  seedOtherAccountBrowser,
  type AccessBrowserState,
} from './other-account-browser-fixture.js';

test('T127: second real auth session uses fresh cookie and storage context without changing owner', async ({
  browser,
  page,
  world,
}) => {
  const owner = await login(page, world);
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('owner-only-test-marker', 'private'));
  const ownerCookies = await page.context().cookies();
  const isolated = await createOtherAccountBrowser(browser, world);
  try {
    await isolated.page.goto('/');
    expect(
      await isolated.page.evaluate(() => localStorage.getItem('owner-only-test-marker')),
    ).toBeNull();
    expect(await page.context().cookies()).toEqual(ownerCookies);
    const response = await page.context().request.get('/api/auth/get-session');
    expect(response.status()).toBe(200);
    expect((await response.json()).user.id).toBe(owner.id);
    expect(world.users.get('甲')).toEqual(owner);
    expect(world.splitting.ids.members.has('Amy')).toBe(false);
  } finally {
    await isolated.context.close();
  }
});

test('T127: isolated Given preserves real owner sources and companion identity before direct access', async ({
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
        phrase: otherAccountBrowserPhrase,
        input: undefined,
        execute: (context) => seedOtherAccountBrowser(browser, context),
      },
      world,
    );
    const state = world.get<AccessBrowserState>(accessBrowserStateKey);
    expect(state.context).not.toBe(page.context());
    expect(state.page.url()).toBe('about:blank');
    expect(state.actor!.id).not.toBe(state.owner.id);
    expect(state.companionIds.Amy).toBe(world.splitting.ids.members.get('Amy'));
    expect([...world.splitting.ids.members]).toEqual(aliases);
    expect(state.ownerSnapshot.expenses.items[0]!.shares).toHaveLength(3);
  } finally {
    const state = world.state.get(accessBrowserStateKey) as AccessBrowserState | undefined;
    await state?.dispose();
  }
});
