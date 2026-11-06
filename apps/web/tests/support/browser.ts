import type { Page } from '@playwright/test';
import type { LedgerWorld } from '../../../api/tests/support/world.js';
import { seedIdentity, seedTrip, SESSION_COOKIE } from '../../../api/tests/support/seed.js';

export async function login(page: Page, world: LedgerWorld, label = '甲') {
  const identity = await seedIdentity(world, label);
  const raw = identity.cookie.slice(SESSION_COOKIE.length + 1);

  await page.context().addCookies([
    {
      name: SESSION_COOKIE,
      value: decodeURIComponent(raw),
      url: world.get<string>('webOrigin'),
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  return identity;
}

export async function openTrip(page: Page, world: LedgerWorld, name = '日本旅行') {
  const trip = await seedTrip(world, name);

  await page.goto(`/trips/${trip.id}`);

  return trip;
}

export async function openExpenseForm(page: Page, world: LedgerWorld, name = '日本旅行') {
  const trip = await seedTrip(world, name);

  await page.goto(`/trips/${trip.id}/expenses/new`);

  return trip;
}

export async function mockGoogle(
  page: Page,
  world: LedgerWorld,
  label = '甲',
  outcome: 'success' | 'cancel' | 'invalid' = 'success',
) {
  const user = await seedIdentity(world, label);

  await page.route('https://accounts.google.com/**', async (route) => {
    const url = new URL(route.request().url());
    const callback = new URL(url.searchParams.get('redirect_uri')!);

    callback.searchParams.set('state', url.searchParams.get('state') ?? '');
    if (outcome === 'cancel') callback.searchParams.set('error', 'access_denied');
    else {
      const { registerGoogleCode } = await import('../../../api/tests/support/google.js');

      callback.searchParams.set(
        'code',
        outcome === 'invalid' ? 'invalid-code' : registerGoogleCode(user, url),
      );
    }
    // WebKit route fulfillment rejects redirect statuses; only the external authorization
    // page is replaced. Its navigation still reaches the real Better Auth callback.
    const destination = JSON.stringify(callback.toString()).replaceAll(
      '<',
      String.fromCharCode(92) + 'u003c',
    );

    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<!doctype html><meta charset="utf-8"><script>location.replace(${destination})</script>`,
    });
  });

  return user;
}
