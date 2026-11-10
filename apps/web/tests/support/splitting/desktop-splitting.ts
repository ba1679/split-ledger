import {
  expect,
  type Browser,
  type BrowserContext,
  type Page,
  type Response,
} from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { seedIdentity } from '../../../../api/tests/support/seed.js';
import { login } from '../browser.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import { mobileSavedSplittingKey, type MobileSavedSplitting } from './mobile-saved-fixture.js';

export const desktopSplittingPhrase = 'owner 在電腦開啟目前旅行分帳';

export const desktopSplittingKey = 'splitting:desktopSplitting';

export interface DesktopSplitting {
  context: BrowserContext;
  page: Page;
  tripId: string;
  phone: MobileSavedSplitting;
  members: { items: MobileSavedSplitting['members'] };
  expenses: BrowserSplittingSnapshot['expenses'];
  settlement: BrowserSplittingSnapshot['settlement'];
  writes: string[];
  dispose: () => Promise<void>;
}

/** Open the saved trip once with a fresh desktop cache and the same owner session. */
export async function openDesktopSplitting(browser: Browser, world: LedgerWorld): Promise<void> {
  const phone = world.get<MobileSavedSplitting>(mobileSavedSplittingKey);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(phone.snapshot);
  const context = await browser.newContext({
    baseURL: world.get<string>('webOrigin'),
    viewport: { width: 1280, height: 900 },
    timezoneId: 'Asia/Taipei',
    serviceWorkers: 'block',
  });
  try {
    expect(await context.cookies()).toEqual([]);
    const page = await context.newPage();
    expect(page.url()).toBe('about:blank');
    const owner = await seedIdentity(world);
    expect((await login(page, world)).id).toBe(owner.id);
    const sessionReply = await context.request.get('/api/auth/get-session');
    expect(sessionReply.status(), 'Fresh desktop context must authenticate as the owner').toBe(200);
    expect((await sessionReply.json()) as unknown).toMatchObject({ user: { id: owner.id } });
    const base = `/api/trips/${phone.tripId}`;
    const replies = new Map<string, Response>();
    const writes: string[] = [];
    page.on('request', (request) => {
      if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method()))
        writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
    });
    page.on('response', (response) => {
      const path = new URL(response.url()).pathname;
      if (
        response.request().method() === 'GET' &&
        ['members', 'expenses', 'settlement'].some((suffix) => path === `${base}/${suffix}`)
      )
        replies.set(path, response);
    });
    await page.goto(`/trips/${phone.tripId}`);
    await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
    await expect
      .poll(() => [...replies.keys()].sort(), {
        message: 'Desktop splitting page must fetch real members, expenses and settlement',
      })
      .toEqual(['expenses', 'members', 'settlement'].map((suffix) => `${base}/${suffix}`).sort());

    async function read<T>(suffix: string): Promise<T> {
      const reply = replies.get(`${base}/${suffix}`)!;
      expect(reply.status(), `Desktop ${suffix} query must complete successfully`).toBe(200);
      await reply.finished();

      return (await reply.json()) as T;
    }

    const state: DesktopSplitting = {
      context,
      page,
      tripId: phone.tripId,
      phone,
      members: await read('members'),
      expenses: await read('expenses'),
      settlement: await read('settlement'),
      writes,
      dispose: () => context.close(),
    };
    expect(writes, 'Reading on a second device must not write financial or member data').toEqual(
      [],
    );
    expect(await readBrowserSplittingSnapshot(world)).toEqual(phone.snapshot);
    world.set(desktopSplittingKey, state);
  } catch (error) {
    await context.close();
    throw error;
  }
}
