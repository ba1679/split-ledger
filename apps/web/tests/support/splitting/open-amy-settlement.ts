import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import type { RepaymentBrowserWrite } from './repayment-draft.js';
import {
  SettlementPaymentForm,
  settlementArrangement,
  settlementBeforeKey,
  settlementWritesKey,
} from './settlement-form.js';

export const openAmySettlementPhrase = 'owner 開啟 Amy 支付 Alice 的實付結清表單';

export const openedAmySettlementKey = 'splitting:openedAmySettlement';

/** Read the latest arrangement, then open its real link exactly once without editing fields. */
export async function openAmySettlement(page: Page, world: LedgerWorld): Promise<void> {
  const before = await readBrowserSplittingSnapshot(world);
  const tripId = splittingTripId(world);
  const arrangement = settlementArrangement(
    before.settlement,
    'Amy',
    splittingMemberId(world, 'Amy'),
    splittingMemberId(world, 'Alice'),
  );
  const writes: RepaymentBrowserWrite[] = [];
  world.set(settlementBeforeKey, before);
  world.set(settlementWritesKey, writes);
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()) &&
      path.startsWith(`/api/trips/${tripId}`)
    )
      writes.push({ method: request.method(), path, body: request.postDataJSON() });
  });
  const form = new SettlementPaymentForm(page);
  await form.open(tripId, arrangement.key);
  await expect(
    page.getByText(/應付(?:金額)?/).first(),
    'Wait for the obligation label',
  ).toBeVisible();
  await expect(form.paidAmount).toHaveValue('');
  world.set(openedAmySettlementKey, {
    before,
    arrangement,
    accountingRevision: before.settlement.accountingRevision,
    text: await page.locator('main').innerText(),
  });
  expect(writes, 'Opening the payment form must not save any command').toEqual([]);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(before);
}
