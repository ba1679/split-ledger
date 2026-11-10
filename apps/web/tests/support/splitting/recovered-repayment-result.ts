import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  lostRepaymentResponseKey,
  type LostRepaymentResponseState,
} from './lost-repayment-response.js';
import {
  independentRepaymentSaveKey,
  type IndependentRepaymentSave,
} from './save-independent-repayment.js';
import { repaymentWritesKey, type RepaymentBrowserWrite } from './repayment-draft.js';
import { assertSavedPartialRepaymentScreen } from './saved-partial-repayment-result.js';

export const recoveredRepaymentPhrase = '畫面查證原還款成功且不重複新增';

/** Browser recovery must come from its original UUID GET, never from the Then's API reads. */
export function assertRecoveredRepaymentEvidence(
  action: IndependentRepaymentSave,
  loss: LostRepaymentResponseState,
  writes: RepaymentBrowserWrite[],
  tripId: string,
): void {
  expect(['recovered', 'unconfirmed']).toContain(action.outcome);
  expect(action.status).toBeNull();
  expect(action.response).toBeNull();
  expect(action.draft).toEqual(loss.draft);
  expect(action.payload).toEqual(action.draft);
  expect(action.before).toEqual(loss.before);
  expect(loss.authoritativeAfter).toBeDefined();
  expect(action.after).toEqual(loss.authoritativeAfter);
  expect(loss.savedResponse).toMatchObject({ id: action.draft.id });
  expect(loss.failure).toBeUndefined();
  expect(loss.availability).toBe('available');
  expect(loss.ids.commandId).toBe(action.draft.id);
  expect(loss.ids.repaymentId).toBe(action.draft.id);
  const expected = [
    { method: 'POST', path: `/api/trips/${tripId}/repayments`, body: action.draft },
  ];
  expect(writes).toEqual(expected);
  expect(loss.mutations).toEqual(expected);
  expect(loss.ids.mutationIds).toEqual([action.draft.id]);
  expect(loss.lookups.length, 'The browser must verify the original repayment').toBeGreaterThan(0);
  for (const lookup of loss.lookups)
    expect(lookup).toEqual({ id: action.draft.id, actualStatus: 200, browserStatus: 200 });
  expect(loss.ids.lookupIds).toEqual(loss.lookups.map((lookup) => lookup.id));
}

/** Observe existing recovery only: no verification click, route restoration or navigation. */
export async function assertRecoveredRepaymentScreen(
  page: Page,
  world: LedgerWorld,
): Promise<void> {
  const action = world.get<IndependentRepaymentSave>(independentRepaymentSaveKey);
  const loss = world.get<LostRepaymentResponseState>(lostRepaymentResponseKey);
  const tripId = splittingTripId(world);
  const originalResponse = world.response;
  const writes: string[] = [];
  const capture = (request: Request) => {
    if (
      new URL(request.url()).pathname.startsWith('/api/') &&
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method())
    )
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
  };
  page.on('request', capture);
  try {
    await expect
      .poll(
        () =>
          loss.lookups.some(
            (lookup) => lookup.id === action.draft.id && lookup.browserStatus === 200,
          ),
        {
          message: 'Wait for the application to verify its original repayment UUID',
          timeout: 5000,
        },
      )
      .toBe(true);
    const check = () =>
      assertRecoveredRepaymentEvidence(
        action,
        loss,
        world.get<RepaymentBrowserWrite[]>(repaymentWritesKey),
        tripId,
      );
    check();
    // Reuses read-only full source/list/settlement and visible success/history assertions.
    await assertSavedPartialRepaymentScreen(page, world);
    check();
    expect(writes, 'Recovery must not repeat any business write').toEqual([]);
  } finally {
    world.response = originalResponse;
    page.off('request', capture);
  }
}
