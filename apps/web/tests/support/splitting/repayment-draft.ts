import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { snapshotSplittingSources } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { chooseCurrency } from '../expense-helpers.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';

export const repaymentDraftPhrase = 'owner 已填 Amy 支付 {word} JPY {word} 的獨立還款';

export const repaymentDraftKey = 'splitting:repaymentDraft';

export const repaymentBeforeKey = 'splitting:repaymentBefore';

export const repaymentWritesKey = 'splitting:repaymentWrites';

export interface RepaymentDraft {
  id: string;
  payerMemberId: string;
  payeeMemberId: string;
  currencyCode: 'JPY';
  amount: string;
  paidOn: string;
}

export interface RepaymentBrowserWrite {
  method: string;
  path: string;
  body: unknown;
}

/** Validation cases must reach the form unchanged; never coerce 0 to a valid payment. */
export function repaymentDraftValues(payee: string, amount: string) {
  expect(['Alice', 'Amy']).toContain(payee);
  expect(amount).toMatch(/^[0-9]+$/);

  return { payer: 'Amy', payee, amount, currencyCode: 'JPY', paidOn: '2027-03-12' } as const;
}

/** Real accessible controls only. Opening and filling never submits the form. */
export class IndependentRepaymentForm {
  constructor(readonly page: Page) {}

  async open(tripId: string): Promise<void> {
    await this.page.goto(`/trips/${tripId}/repayments/new`);
    await expect(
      this.page.getByRole('combobox', { name: '付款人', exact: true }),
      'Independent repayment must expose its payer control',
    ).toBeVisible();
    await expect(this.page.getByRole('combobox', { name: '收款人', exact: true })).toBeVisible();
    await expect(this.page.getByRole('button', { name: '儲存還款', exact: true })).toBeVisible();
  }

  async fill(payee: string, amount: string, paidOn = '2027-03-12'): Promise<void> {
    repaymentDraftValues(payee, amount);
    await this.page
      .getByRole('combobox', { name: '付款人', exact: true })
      .selectOption({ label: 'Amy' });
    await this.page
      .getByRole('combobox', { name: '收款人', exact: true })
      .selectOption({ label: payee });
    await chooseCurrency(this.page, 'JPY');
    await this.page.getByLabel('金額', { exact: true }).fill(amount);
    const date = this.page.getByRole('textbox', { name: '還款日期', exact: true });
    await date.fill(paidOn.replaceAll('-', '/'));
    await date.press('Tab');
    await expect(this.page.getByLabel('金額', { exact: true })).toHaveValue(amount);
    await expect(date).toHaveValue(paidOn.replaceAll('-', '/'));
  }
}

export async function fillIndependentRepaymentDraft(
  page: Page,
  world: LedgerWorld,
  payee: string,
  amount: string,
): Promise<void> {
  const values = repaymentDraftValues(payee, amount);
  const before = await readBrowserSplittingSnapshot(world);
  const tripId = splittingTripId(world);
  world.set(repaymentBeforeKey, before);
  world.set(repaymentWritesKey, []);
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method()) &&
      path.startsWith(`/api/trips/${tripId}`)
    )
      world
        .get<RepaymentBrowserWrite[]>(repaymentWritesKey)
        .push({ method: request.method(), path, body: request.postDataJSON() });
  });
  const form = new IndependentRepaymentForm(page);
  await form.open(tripId);
  await form.fill(payee, amount);
  // GREEN seam: the real form exposes its retained draft UUID via data-command-id.
  // This reads committed DOM metadata rather than guessing StrictMode initializer calls.
  const repaymentForm = page.locator('form').filter({
    has: page.getByRole('button', { name: '儲存還款', exact: true }),
  });
  await expect(repaymentForm, 'Independent repayment has one actual save form').toHaveCount(1);
  await expect(
    repaymentForm,
    'The actual repayment draft must expose its preallocated command UUID before any POST',
  ).toHaveAttribute(
    'data-command-id',
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  const id = (await repaymentForm.getAttribute('data-command-id'))!;
  const draft: RepaymentDraft = {
    id,
    payerMemberId: splittingMemberId(world, 'Amy'),
    payeeMemberId: splittingMemberId(world, payee),
    amount: values.amount,
    currencyCode: 'JPY',
    paidOn: values.paidOn,
  };
  world.set(repaymentDraftKey, draft);
  world.set('splitting:repaymentRequest', draft);
  world.set('splitting:repaymentId', id);
  world.splitting.ids.repayments.set('browserPending', id);
  expect(
    world.get<RepaymentBrowserWrite[]>(repaymentWritesKey),
    'Given must not save a repayment',
  ).toEqual([]);
  expect(await snapshotSplittingSources(world)).toEqual(before.sources);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(
    world.get<BrowserSplittingSnapshot>(repaymentBeforeKey),
  );
}
