import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import { captureSplittingRejectionBaseline } from './rejection.js';

export const changeSimplificationPhrase = 'owner 將簡化付款切換為 {string}';

export function simplificationModeInput(mode: string): boolean {
  if (mode === '開啟') return true;
  if (mode === '關閉') return false;
  throw Error(`Unsupported simplification mode: ${mode}`);
}

/** Exercise exactly one owner-authorized mode PATCH; confirmation reads belong to Then. */
export async function changeSimplificationMode(world: LedgerWorld, mode: string): Promise<void> {
  const simplifyDebts = simplificationModeInput(mode);
  const tripId = splittingTripId(world);
  await captureSplittingRejectionBaseline(world);
  const before = world.splitting.snapshot!;
  world.set('splitting:before', before);
  world.set('splitting:mode', mode);
  world.set('splitting:simplifyDebts', simplifyDebts);
  world.response = await world.api.patch(`/api/trips/${tripId}`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
    data: { simplifyDebts },
  });
  world.set('splitting:reply', await world.response.json());
  if (world.response.ok()) {
    const persisted = await world.db.query(
      'SELECT id,simplify_debts,accounting_revision::text FROM trips WHERE id=$1',
      [tripId],
    );
    expect(persisted.rows, 'Accepted mode PATCH must persist its setting and revision').toEqual([
      {
        id: tripId,
        simplify_debts: simplifyDebts,
        accounting_revision: expect.stringMatching(/^\d+$/),
      },
    ]);
    const revision = String(persisted.rows[0]!.accounting_revision);
    expect(BigInt(revision)).toBeGreaterThan(BigInt(String(before.trips[0]!.accounting_revision)));
    world.set('splitting:revision', revision);
  } else {
    expect(
      await snapshotSplittingSources(world),
      'Rejected mode PATCH must preserve sources',
    ).toEqual(before);
  }
}
