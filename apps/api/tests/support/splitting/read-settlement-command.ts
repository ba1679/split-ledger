import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { AccessSettlementView } from './access-fixture.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';

export const readSettlementPhrase = 'owner 查詢旅行分帳結算';

/** One owner GET preserves the complete projection and its opaque arrangement keys. */
export async function readTripSettlement(
  world: LedgerWorld,
  include?: 'explanationDetails',
): Promise<void> {
  const owner = world.users.get('甲');
  expect(owner, 'Settlement query requires the owner session').toBeDefined();
  const before = await snapshotSplittingSources(world);
  world.response = await world.api.get(`/api/trips/${splittingTripId(world)}/settlement`, {
    headers: { Cookie: owner!.cookie },
    ...(include === undefined ? {} : { params: { include } }),
  });
  const reply = (await world.response.json()) as AccessSettlementView;
  world.set('splitting:reply', reply);
  expect(world.response.status(), 'Product must provide the travel settlement endpoint').toBe(200);
  expect(reply.accountingRevision).toMatch(/^(?:0|[1-9]\d*)$/);
  expect(Array.isArray(reply.arrangements)).toBe(true);
  for (const arrangement of reply.arrangements) {
    expect(arrangement.key).toEqual(expect.any(String));
    expect(arrangement.key.length).toBeGreaterThan(0);
  }
  world.set('splitting:settlementView', reply);
  world.set('splitting:revision', reply.accountingRevision);
  world.set(
    'splitting:arrangementKeys',
    reply.arrangements.map((row) => row.key),
  );
  world.set('splitting:before', before);
  world.set('splitting:sourceSnapshot', before);
  expect(await snapshotSplittingSources(world), 'Settlement GET must not rewrite sources').toEqual(
    before,
  );
}
