import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  seedSplittingMembers,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { login } from '../browser.js';
import { openCustomDateCalendar } from './calendar-context.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import { IndependentRepaymentForm, repaymentBeforeKey } from './repayment-draft.js';

export const repaymentCalendarPhrase = 'owner 已開啟還款日期日曆且焦點在 2027-03-11';

/** Arrange a real Alice/Amy form and retain the shared DateField focus context. */
export async function arrangeRepaymentCalendar(page: Page, world: LedgerWorld): Promise<void> {
  await seedSplittingMembers(world);
  const tripId = splittingTripId(world);
  for (const name of ['Bob', 'Carol']) {
    const id = world.splitting.ids.members.get(name)!;
    await world.db.query('DELETE FROM trip_members WHERE id=$1 AND trip_id=$2', [id, tripId]);
    world.splitting.ids.members.delete(name);
  }
  await world.db.query('UPDATE trips SET start_date=$2,end_date=$2 WHERE id=$1', [
    tripId,
    '2027-03-11',
  ]);
  const before = await readBrowserSplittingSnapshot(world);
  expect(before.sources.members.map((member) => member.name).sort()).toEqual(['Alice', 'Amy']);
  expect(before.expenses.items).toEqual([]);
  world.set(repaymentBeforeKey, before);
  await login(page, world);
  const writes: string[] = [];
  const observe = (request: Request) => {
    const path = new URL(request.url()).pathname;
    if (
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method()) &&
      path.startsWith('/api/trips/')
    )
      writes.push(`${request.method()} ${path}`);
  };
  page.on('request', observe);
  try {
    await new IndependentRepaymentForm(page).open(tripId);
    await openCustomDateCalendar(page, world, '還款日期');
    expect(writes, 'Opening the repayment calendar must not submit a write').toEqual([]);
    expect(await readBrowserSplittingSnapshot(world)).toEqual(before);
  } finally {
    page.off('request', observe);
  }
}
