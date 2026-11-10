import { expect, type Page, type Request } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  lostSettlementResponseKey,
  type LostSettlementResponseState,
} from './lost-settlement-response.js';
import { settlementSaveKey, type BrowserSettlementSave } from './save-settlement.js';
import { settlementWritesKey } from './settlement-form.js';
import type { RepaymentBrowserWrite } from './repayment-draft.js';
import {
  readClosedBrowserSettlement,
  settlementSummaryAmount,
} from './closed-settlement-result.js';

export const recoveredSettlementPhrase = '畫面查證原結清成功且不重複記錄';

/** An authority read in Then cannot substitute for the application's original UUID lookup. */
export function assertRecoveredSettlementEvidence(
  action: BrowserSettlementSave,
  loss: LostSettlementResponseState,
  writes: RepaymentBrowserWrite[],
  tripId: string,
): void {
  expect(['recovered', 'unconfirmed']).toContain(action.outcome);
  expect(action.status).toBeNull();
  expect(action.response).toBeNull();
  const { paidAmount, ...draft } = action.command;
  expect(paidAmount).toMatch(/^[1-9]\d*$/);
  expect(draft).toEqual(loss.draft);
  expect(action.payload).toEqual(action.command);
  expect(action.before).toEqual(loss.before);
  expect(loss.command).toEqual(action.command);
  expect(loss.authoritativeAfter).toBeDefined();
  expect(action.after).toEqual(loss.authoritativeAfter);
  expect(loss.savedResponse).toMatchObject({
    id: draft.id,
    repayment: { id: draft.repaymentId },
  });
  expect(loss.failure).toBeUndefined();
  expect(loss.availability).toBe('available');
  expect(draft.id).not.toBe(draft.repaymentId);
  expect(loss.ids.commandId).toBe(draft.id);
  expect(loss.ids.repaymentId).toBe(draft.repaymentId);
  const expected = [
    { method: 'POST', path: `/api/trips/${tripId}/settlements`, body: action.command },
  ];
  expect(writes).toEqual(expected);
  expect(loss.mutations).toEqual(expected);
  expect(loss.ids.mutationIds).toEqual([draft.id]);
  expect(loss.lookups.length, 'The browser must verify its original settlement').toBeGreaterThan(0);
  for (const lookup of loss.lookups)
    expect(lookup).toEqual({ id: draft.id, actualStatus: 200, browserStatus: 200 });
  expect(loss.ids.lookupIds).toEqual(loss.lookups.map((lookup) => lookup.id));
}

/** Observe recovery only: no click, navigation, route restoration or business mutation. */
export async function assertRecoveredSettlementScreen(page: Page, world: LedgerWorld) {
  const action = world.get<BrowserSettlementSave>(settlementSaveKey);
  const loss = world.get<LostSettlementResponseState>(lostSettlementResponseKey);
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
            (lookup) => lookup.id === action.command.id && lookup.browserStatus === 200,
          ),
        {
          message: 'Wait for the application to verify its original settlement UUID',
          timeout: 5000,
        },
      )
      .toBe(true);
    const check = () =>
      assertRecoveredSettlementEvidence(
        action,
        loss,
        world.get<RepaymentBrowserWrite[]>(settlementWritesKey),
        tripId,
      );
    check();
    // Verifies exactly one record/payment and two opposite adjustments, preserved
    // original expense shares and histories, closed arrangement, and unchanged rereads.
    const { record } = await readClosedBrowserSettlement(world);
    expect(record).toEqual(loss.savedResponse);
    const summary = page
      .getByRole('status')
      .filter({ hasText: /結清成功|已結清|結清已儲存|結清已保存/ });
    await expect(summary).toHaveCount(1);
    await expect(summary).toBeVisible();
    const text = await summary.innerText();
    const obligation = settlementSummaryAmount(record.obligation as ExactAmount).replace(
      '.',
      '\\.',
    );
    expect(text).toMatch(new RegExp(`應付[^\\n]*${obligation}\\b(?![.\\d])`));
    expect(text).toMatch(new RegExp(`實付[^\\n]*JPY ${action.command.paidAmount}\\b(?![.\\d])`));
    await expect(
      page.getByText(/尚無法確認|尚未確認|結果未明/).filter({ visible: true }),
    ).toHaveCount(0);
    check();
    expect(writes, 'Recovery must not repeat any business write').toEqual([]);
  } finally {
    world.response = originalResponse;
    page.off('request', capture);
  }
}
