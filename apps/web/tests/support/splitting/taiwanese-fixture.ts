import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import { callApi, seedIdentity, seedTrip } from '../../../../api/tests/support/seed.js';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { login } from '../browser.js';
import { setBrowserLanguages } from '../browser-languages.js';

export async function seedTaiwaneseCompanions(
  page: Page,
  world: LedgerWorld,
  companions: readonly string[] = ['小宇'],
  language = 'zh-TW',
  tripName = '日本旅行',
): Promise<void> {
  const owner = await seedIdentity(world, '小安');
  const trip = await seedTrip(world, tripName, '小安');
  world.users.set('甲', owner);
  world.set('splitting:ownerId', owner.id);
  world.splitting.ids.trips.set('日本旅行', trip.id);
  const path = `/api/trips/${trip.id}/members`;
  for (const name of companions) {
    const id = randomUUID();
    const created = await callApi(world, 'POST', path, { id, name }, '小安');
    expect(created.status()).toBe(201);
    world.splitting.ids.members.set(name, id);
  }
  const { items } = await (await callApi(world, 'GET', path, undefined, '小安')).json();
  const primary = items.find((member: { role: string }) => member.role === 'owner');
  expect(items).toHaveLength(companions.length + 1);
  for (const name of companions)
    expect(items).toContainEqual(
      expect.objectContaining({ id: world.splitting.ids.members.get(name), name }),
    );
  expect(primary.name).toBe('小安');
  world.splitting.ids.members.set('小安', primary.id);
  await setBrowserLanguages(page.context(), [language]);
  await login(page, world, '小安');
}
