import { expect, type Locator, type Page } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { snapshotSplittingSources } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSettlement } from './fixture.js';
import type { RepaymentBrowserWrite } from './repayment-draft.js';

export const settlementFormPhrase = 'owner 已開啟 {word} 支付 Alice 的實付結清表單';

export const settlementFormKey = 'splitting:browserSettlementForm';

export const settlementBeforeKey = 'splitting:browserSettlementBefore';

export const settlementWritesKey = 'splitting:browserSettlementWrites';

export interface BrowserSettlementDraft {
  id: string;
  repaymentId: string;
  arrangementKey: string;
  accountingRevision: string;
  debtorMemberId: string;
  creditorMemberId: string;
  currencyCode: string;
  expectedAmount: ExactAmount;
  paidOn: string;
}

export function settlementArrangement(
  view: BrowserSettlement,
  payer: string,
  debtorMemberId: string,
  creditorMemberId: string,
): BrowserSettlement['arrangements'][number] {
  expect(['Amy', 'Bob'], 'This sentence supports Amy or Bob only').toContain(payer);
  const matches = view.arrangements.filter(
    (row) =>
      row.debtorMemberId === debtorMemberId &&
      row.creditorMemberId === creditorMemberId &&
      row.currencyCode === 'JPY',
  );
  expect(matches, 'There must be exactly one current JPY arrangement to Alice').toHaveLength(1);
  const arrangement = matches[0]!;
  expect(arrangement.key).not.toBe('');
  expect(BigInt(arrangement.amount.numerator)).toBeGreaterThan(0n);
  expect(BigInt(arrangement.amount.denominator)).toBeGreaterThan(0n);

  return structuredClone(arrangement);
}

/** Open through the real current-arrangement link; this object never submits. */
export class SettlementPaymentForm {
  constructor(readonly page: Page) {}

  get paidAmount(): Locator {
    return this.page.getByLabel('實付金額', { exact: true });
  }

  async open(tripId: string, arrangementKey: string): Promise<void> {
    await this.page.goto(`/trips/${tripId}/settlement`);
    const links = this.page.locator(`a[href*="/trips/${tripId}/settlements/new"]`);
    await expect(links.first(), 'Settlement must expose arrangement payment links').toBeVisible();
    const matching = [];
    for (const link of await links.all()) {
      const href = await link.getAttribute('href');
      const url = new URL(href!, this.page.url());
      if ([...url.searchParams.values()].includes(arrangementKey)) matching.push(link);
    }
    expect(matching, 'Open the link bound to the exact server arrangement key').toHaveLength(1);
    await matching[0]!.click();
    await expect(
      this.paidAmount,
      'Settlement form must expose an actual payment field',
    ).toBeVisible();
    await expect(this.paidAmount).toHaveValue('');
    await expect(
      this.page.getByRole('button', { name: '結清這筆安排', exact: true }),
    ).toBeVisible();
  }
}

export async function openBrowserSettlementForm(
  page: Page,
  world: LedgerWorld,
  payer: string,
): Promise<void> {
  expect(['Amy', 'Bob']).toContain(payer);
  const before = await readBrowserSplittingSnapshot(world);
  const tripId = splittingTripId(world);
  const arrangement = settlementArrangement(
    before.settlement,
    payer,
    splittingMemberId(world, payer),
    splittingMemberId(world, 'Alice'),
  );
  world.set(settlementBeforeKey, before);
  world.set(settlementWritesKey, []);
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method()) &&
      path.startsWith(`/api/trips/${tripId}`)
    )
      world
        .get<RepaymentBrowserWrite[]>(settlementWritesKey)
        .push({ method: request.method(), path, body: request.postDataJSON() });
  });
  const form = new SettlementPaymentForm(page);
  await form.open(tripId, arrangement.key);
  const date = page.getByRole('textbox', { name: '結清日期', exact: true });
  await expect(date).toBeVisible();
  await date.fill('2027/03/12');
  await date.press('Tab');
  await expect(date).toHaveValue('2027/03/12');
  // GREEN seam: these attributes mirror the actual command state used by POST,
  // rather than the number or order of randomUUID calls (StrictMode may repeat them).
  const commandForm = page.locator('form').filter({
    has: page.getByRole('button', { name: '結清這筆安排', exact: true }),
  });
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  await expect(commandForm, 'Settlement command must belong to one real form').toHaveCount(1);
  await expect(commandForm).toHaveAttribute('data-command-id', uuid);
  await expect(commandForm).toHaveAttribute('data-repayment-id', uuid);
  const id = (await commandForm.getAttribute('data-command-id'))!;
  const repaymentId = (await commandForm.getAttribute('data-repayment-id'))!;
  expect(repaymentId, 'The two reserved commands must have distinct UUIDs').not.toBe(id);
  const draft: BrowserSettlementDraft = {
    id,
    repaymentId,
    arrangementKey: arrangement.key,
    accountingRevision: before.settlement.accountingRevision,
    debtorMemberId: arrangement.debtorMemberId,
    creditorMemberId: arrangement.creditorMemberId,
    currencyCode: arrangement.currencyCode,
    expectedAmount: structuredClone(arrangement.amount),
    paidOn: '2027-03-12',
  };
  world.set(settlementFormKey, draft);
  world.set('splitting:settlementSnapshot', draft);
  world.set('splitting:settlementId', draft.id);
  world.set('splitting:settlementRepaymentId', draft.repaymentId);
  world.splitting.ids.settlements.set('browserPending', draft.id);
  world.splitting.ids.repayments.set('browserPendingSettlement', draft.repaymentId);
  await expect(form.paidAmount).toHaveValue('');
  expect(
    world.get<RepaymentBrowserWrite[]>(settlementWritesKey),
    'Opening a form must not submit a mutation',
  ).toEqual([]);
  expect(await snapshotSplittingSources(world)).toEqual(before.sources);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(before);
}
