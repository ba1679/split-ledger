import { expect } from '@playwright/test';
import { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { seedOtherTripMember } from '../../../../api/tests/support/splitting/other-trip-member-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';

export const otherTripCarolPhrase = '其他旅行的 Carol 不屬於本旅行';

export const otherTripCarolStateKey = 'splitting:otherTripCarol';

export interface OtherTripCarolFixture {
  currentTripId: string;
  otherTripId: string;
  memberId: string;
  otherWorld: LedgerWorld;
  currentBefore: BrowserSplittingSnapshot;
  otherBefore: BrowserSplittingSnapshot;
  currentMembers: Record<string, unknown>[];
  otherMembers: Record<string, unknown>[];
}

/** Arrange a real same-owner foreign member, without opening or populating a form. */
export async function seedOtherTripCarol(world: LedgerWorld): Promise<void> {
  const currentTripId = splittingTripId(world);
  const aliases = [...world.splitting.ids.members];
  expect(aliases.map(([name]) => name).sort()).toEqual(['Alice', 'Amy']);
  const currentBefore = await readBrowserSplittingSnapshot(world);
  await seedOtherTripMember(world, 'Carol');
  const otherTripId = world.get<string>('splitting:otherTripId');
  const memberId = world.get<string>('splitting:otherMemberId');
  const otherWorld = new LedgerWorld(world.db, world.api, world.origin, `${world.namespace}-carol`);
  otherWorld.users.set('甲', world.users.get('甲')!);
  // A separate world lets the existing projection reader address the foreign trip
  // without rebinding the current trip or its ordinary member aliases.
  otherWorld.splitting.ids.trips.set('日本旅行', otherTripId);
  const otherBefore = await readBrowserSplittingSnapshot(otherWorld);
  expect(otherBefore.sources.trips[0]!.owner_id).toBe(currentBefore.sources.trips[0]!.owner_id);
  expect(otherBefore.sources.members.find((member) => member.id === memberId)).toMatchObject({
    name: 'Carol',
    trip_id: otherTripId,
    role: 'companion',
    is_active: true,
  });

  async function members(tripId: string): Promise<Record<string, unknown>[]> {
    const response = await callApi(world, 'GET', `/api/trips/${tripId}/members`);
    expect(response.status(), 'Product must provide same-owner members projections').toBe(200);
    const body = (await response.json()) as { items: Record<string, unknown>[] };
    expect(Array.isArray(body.items)).toBe(true);

    return body.items;
  }

  const currentMembers = await members(currentTripId);
  const otherMembers = await members(otherTripId);
  expect(currentMembers.map((member) => member.id).sort()).toEqual(
    aliases.map(([, id]) => id).sort(),
  );
  expect(currentMembers.map((member) => member.name).sort()).toEqual(['Alice', 'Amy']);
  expect(otherMembers.map((member) => member.id).sort()).toEqual(
    otherBefore.sources.members.map((member) => member.id).sort(),
  );
  expect(otherMembers.find((member) => member.id === memberId)).toMatchObject({ name: 'Carol' });
  expect(currentMembers.some((member) => member.id === memberId)).toBe(false);
  expect(world.splitting.ids.members.has('Carol')).toBe(false);
  for (const [name, id] of aliases) expect(world.splitting.ids.members.get(name)).toBe(id);
  expect(splittingTripId(world)).toBe(currentTripId);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(currentBefore);
  expect(await readBrowserSplittingSnapshot(otherWorld)).toEqual(otherBefore);
  world.set(otherTripCarolStateKey, {
    currentTripId,
    otherTripId,
    memberId,
    otherWorld,
    currentBefore,
    otherBefore,
    currentMembers,
    otherMembers,
  } satisfies OtherTripCarolFixture);
}
