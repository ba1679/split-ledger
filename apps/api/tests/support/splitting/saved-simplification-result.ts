import { expect, request } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { seedSession } from '../seed.js';
import { simplificationModeInput } from './change-simplification-command.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';

export const savedSimplificationPhrase = '簡化付款設定已保存為 {string}';

type ModeProjection = { simplifyDebts: boolean; accountingRevision: string };

/** All projections must identify the same persisted revision, not a client-only toggle. */
export function assertSavedModeProjections(
  mode: string,
  before: SourceSnapshot,
  after: SourceSnapshot,
  projections: readonly ModeProjection[],
): void {
  const enabled = simplificationModeInput(mode);
  expect(before.trips).toHaveLength(1);
  expect(after.trips).toHaveLength(1);
  const trip = after.trips[0]!;
  expect(trip.id).toBe(before.trips[0]!.id);
  expect(trip.simplify_debts).toBe(enabled);
  const revision = String(trip.accounting_revision);
  expect(revision).toMatch(/^(?:0|[1-9]\d*)$/);
  expect(BigInt(revision)).toBeGreaterThan(BigInt(String(before.trips[0]!.accounting_revision)));
  expect(projections).toHaveLength(5);
  for (const projection of projections)
    expect(projection).toMatchObject({ simplifyDebts: enabled, accountingRevision: revision });
}

/** PATCH result, DB, and two authenticated readers all agree without another ledger command. */
export async function assertSavedSimplification(world: LedgerWorld, mode: string): Promise<void> {
  simplificationModeInput(mode);
  expect(world.response, 'The mode PATCH must have been performed').toBeDefined();
  expect(world.response!.status(), 'Product must accept the mode PATCH').toBe(200);
  const patch = (await world.response!.json()) as ModeProjection;
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = await snapshotSplittingSources(world);
  const owner = world.users.get('甲')!;
  const tripId = splittingTripId(world);
  const projections: ModeProjection[] = [patch];
  for (const path of [`/api/trips/${tripId}`, `/api/trips/${tripId}/settlement`]) {
    const response = await world.api.get(path, { headers: { Cookie: owner.cookie } });
    expect(response.status(), `Owner can re-read ${path}`).toBe(200);
    const view = (await response.json()) as ModeProjection & { id?: string };
    if (path === `/api/trips/${tripId}`) expect(view.id).toBe(tripId);
    projections.push(view);
  }
  const session = await seedSession(world, '甲');
  expect(session.id).toBe(owner.id);
  expect(session.cookie).not.toBe(owner.cookie);
  const context = await request.newContext({
    baseURL: world.origin,
    extraHTTPHeaders: { Cookie: session.cookie },
  });
  try {
    for (const path of [`/api/trips/${tripId}`, `/api/trips/${tripId}/settlement`]) {
      const response = await context.get(path);
      expect(response.status(), `A new owner session can re-read ${path}`).toBe(200);
      const view = (await response.json()) as ModeProjection & { id?: string };
      if (path === `/api/trips/${tripId}`) expect(view.id).toBe(tripId);
      projections.push(view);
    }
  } finally {
    await context.dispose();
  }
  assertSavedModeProjections(mode, before, after, projections);
  expect(
    await snapshotSplittingSources(world),
    'Confirmation GETs must preserve ledger sources',
  ).toEqual(after);
}
