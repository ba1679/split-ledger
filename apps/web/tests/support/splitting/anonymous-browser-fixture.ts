import { expect, type Browser } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  browserSplittingStateKey,
  readBrowserSplittingSnapshot,
  type BrowserSplittingSnapshot,
} from './fixture.js';
import { accessBrowserStateKey, type AccessBrowserState } from './other-account-browser-fixture.js';

export const anonymousBrowserPhrase = '目前瀏覽器未登入且僅知道同行者 Amy 的資料';

export const anonymousKnownDataKey = 'splitting:anonymousKnownData';

/** No storageState, cookies, auth fixture, or owner page is reused. */
export async function createAnonymousBrowser(browser: Browser, world: LedgerWorld) {
  const context = await browser.newContext({
    baseURL: world.get<string>('webOrigin'),
    viewport: { width: 1280, height: 900 },
    timezoneId: 'Asia/Taipei',
    serviceWorkers: 'block',
  });
  try {
    expect(await context.storageState()).toEqual({ cookies: [], origins: [] });
    const page = await context.newPage();
    const response = await context.request.get('/api/auth/get-session');
    expect(response.status(), 'Anonymous browser session lookup must reach the real API').toBe(200);
    expect(await response.json(), 'Companion knowledge must not authenticate a browser').toBeNull();
    expect(await context.cookies()).toEqual([]);
    expect(page.url()).toBe('about:blank');

    return { context, page, actor: null };
  } catch (error) {
    await context.close();
    throw error;
  }
}

export async function seedAnonymousBrowser(browser: Browser, world: LedgerWorld): Promise<void> {
  const initial = world.get<BrowserSplittingSnapshot>(browserSplittingStateKey);
  const aliases = [...world.splitting.ids.members];
  const owner = world.users.get('甲');
  expect(owner, 'The existing owner remains authoritative').toBeDefined();
  const ownerSnapshot = await readBrowserSplittingSnapshot(world);
  expect(ownerSnapshot).toEqual(initial);
  const amy = ownerSnapshot.sources.members.find(
    (member) => member.name === 'Amy' && member.role === 'companion',
  );
  expect(amy, 'Existing non-auth companion Amy is required').toBeDefined();
  const auth = await world.db.query('SELECT id FROM auth."user" WHERE id=$1', [amy!.id]);
  expect(auth.rows, 'Companion UUID must not be an auth account').toEqual([]);
  const isolated = await createAnonymousBrowser(browser, world);
  try {
    expect([...world.splitting.ids.members]).toEqual(aliases);
    expect(await readBrowserSplittingSnapshot(world)).toEqual(ownerSnapshot);
    const tripId = splittingTripId(world);
    // This is test-side known input, never injected as credentials or cached API data.
    world.set(anonymousKnownDataKey, {
      tripPath: `/trips/${tripId}/settlement`,
      member: { id: String(amy!.id), name: 'Amy' },
    });
    world.set(accessBrowserStateKey, {
      ...isolated,
      owner: owner!,
      tripId,
      ownerSnapshot,
      companionIds: { Amy: String(amy!.id) },
      dispose: () => isolated.context.close(),
    } satisfies AccessBrowserState);
  } catch (error) {
    await isolated.context.close();
    throw error;
  }
}
