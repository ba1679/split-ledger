import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import type { Identity, LedgerWorld } from '../../../../api/tests/support/world.js';
import { seedIdentity, SESSION_COOKIE } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { login } from '../browser.js';
import {
  browserSplittingStateKey,
  readBrowserSplittingSnapshot,
  type BrowserSplittingSnapshot,
} from './fixture.js';

export const otherAccountBrowserPhrase = '目前瀏覽器已改為另一個登入帳號';

export const accessBrowserStateKey = 'splitting:accessBrowser';

export interface AccessBrowserState {
  context: BrowserContext;
  page: Page;
  actor: Identity | null;
  owner: Identity;
  tripId: string;
  ownerSnapshot: BrowserSplittingSnapshot;
  companionIds: Record<string, string>;
  dispose: () => Promise<void>;
}

/** A genuine second auth account, deliberately sharing a companion's display name only. */
export async function createOtherAccountBrowser(browser: Browser, world: LedgerWorld) {
  const owner = await seedIdentity(world);
  const actor = await seedIdentity(world, 'splitting-access-outsider');
  expect(actor.id).not.toBe(owner.id);
  expect(actor.cookie).not.toBe(owner.cookie);
  await world.db.query('UPDATE auth."user" SET name=$2 WHERE id=$1', [actor.id, 'Amy']);
  actor.name = 'Amy';
  const context = await browser.newContext({
    baseURL: world.get<string>('webOrigin'),
    viewport: { width: 1280, height: 900 },
    timezoneId: 'Asia/Taipei',
    serviceWorkers: 'block',
  });
  try {
    expect(await context.cookies()).toEqual([]);
    const page = await context.newPage();
    await login(page, world, 'splitting-access-outsider');
    const cookies = (await context.cookies()).filter((cookie) => cookie.name === SESSION_COOKIE);
    expect(cookies).toHaveLength(1);
    expect(cookies[0]!.value).toBe(
      decodeURIComponent(actor.cookie.slice(SESSION_COOKIE.length + 1)),
    );
    const reply = await context.request.get('/api/auth/get-session');
    expect(reply.status(), 'Isolated browser must hold a real authenticated session').toBe(200);
    const session = (await reply.json()) as { user: { id: string; name: string } };
    expect(session.user).toMatchObject({ id: actor.id, name: 'Amy' });
    expect(page.url()).toBe('about:blank');

    return { context, page, actor, owner };
  } catch (error) {
    await context.close();
    throw error;
  }
}

/** Arrange the actor context only; owner authority and stable aliases remain intact. */
export async function seedOtherAccountBrowser(browser: Browser, world: LedgerWorld): Promise<void> {
  const initial = world.get<BrowserSplittingSnapshot>(browserSplittingStateKey);
  const aliases = [...world.splitting.ids.members];
  const ownerSnapshot = await readBrowserSplittingSnapshot(world);
  expect(ownerSnapshot).toEqual(initial);
  const isolated = await createOtherAccountBrowser(browser, world);
  try {
    const companionIds = Object.fromEntries(
      ownerSnapshot.sources.members
        .filter((member) => member.role === 'companion')
        .map((member) => [String(member.name), String(member.id)]),
    );
    expect(companionIds.Amy, 'Owner fixture must retain companion Amy').toBeTruthy();
    expect(isolated.actor.id).not.toBe(companionIds.Amy);
    expect([...world.splitting.ids.members]).toEqual(aliases);
    expect(await readBrowserSplittingSnapshot(world)).toEqual(ownerSnapshot);
    world.set(accessBrowserStateKey, {
      ...isolated,
      tripId: splittingTripId(world),
      ownerSnapshot,
      companionIds,
      dispose: () => isolated.context.close(),
    } satisfies AccessBrowserState);
  } catch (error) {
    await isolated.context.close();
    throw error;
  }
}
