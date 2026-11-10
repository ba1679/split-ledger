import { test, expect } from '../fixtures.js';
import { seedTrip } from '../../../../api/tests/support/seed.js';
import { createAnonymousBrowser, seedAnonymousBrowser } from './anonymous-browser-fixture.js';
import {
  createOtherAccountBrowser,
  seedOtherAccountBrowser,
  accessBrowserStateKey,
  type AccessBrowserState,
} from './other-account-browser-fixture.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import {
  directSplittingAccess,
  directSplittingAccessKey,
  navigateToProtectedSplitting,
  type DirectSplittingAccess,
} from './direct-splitting-access.js';

for (const actor of ['anonymous', 'other-account'] as const) {
  test(`T163: ${actor} uses its isolated browser for one direct visit and real denial`, async ({
    browser,
    page,
    world,
  }) => {
    const trip = await seedTrip(world, '日本旅行');
    const owner = world.users.get('甲')!;
    const isolated =
      actor === 'anonymous'
        ? { ...(await createAnonymousBrowser(browser, world)), owner }
        : await createOtherAccountBrowser(browser, world);
    const documents: string[] = [];
    isolated.page.on('request', (request) => {
      if (request.isNavigationRequest() && request.frame() === isolated.page.mainFrame())
        documents.push(request.url());
    });
    try {
      const result = await navigateToProtectedSplitting({ ...isolated, tripId: trip.id });
      expect(documents.filter((url) => new URL(url).pathname === result.path)).toHaveLength(1);
      expect(result.replies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: actor === 'anonymous' ? 401 : 404 }),
        ]),
      );
      expect(result.replies.every((reply) => reply.body !== undefined)).toBe(true);
      expect(result.writes).toEqual([]);
      expect(page.url()).toBe('about:blank');
    } finally {
      await isolated.context.close();
    }
  });

  test(`T163: ${actor} full Given/When retains protected responses for the privacy Then`, async ({
    browser,
    page,
    world,
  }) => {
    try {
      await seedBrowserSplittingExpenses(page, world, [
        { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
      ]);
      await (actor === 'anonymous' ? seedAnonymousBrowser : seedOtherAccountBrowser)(
        browser,
        world,
      );
      await directSplittingAccess(world);
      const result = world.get<DirectSplittingAccess>(directSplittingAccessKey);
      expect(result.browser).toBe(world.get(accessBrowserStateKey));
      expect(result.browser.page).not.toBe(page);
      expect(result.replies).not.toHaveLength(0);
    } finally {
      await (world.state.get(accessBrowserStateKey) as AccessBrowserState | undefined)?.dispose();
    }
  });
}
