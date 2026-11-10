import { expect, request, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { seedSession } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { independentSplittingOracle } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import {
  SettlementPaymentForm,
  settlementBeforeKey,
  settlementFormKey,
  settlementWritesKey,
  type BrowserSettlementDraft,
} from './settlement-form.js';
import type { RepaymentBrowserWrite } from './repayment-draft.js';

export const staleSettlementFormPhrase = '另一裝置已修改點心而目前結清表單仍為舊安排';

export const staleSettlementFormKey = 'splitting:staleBrowserSettlementForm';

/** Mutate only the second device; the first keeps its original command and input. */
export async function changeSnackOnAnotherDevice(page: Page, world: LedgerWorld): Promise<void> {
  const original = structuredClone(world.get<BrowserSettlementDraft>(settlementFormKey));
  expect(original.expectedAmount).toEqual({ numerator: '100', denominator: '3', minorUnit: 0 });
  const before = await readBrowserSplittingSnapshot(world);
  expect(before).toEqual(world.get(settlementBeforeKey));
  const snack = before.expenses.items.filter((row) => row.item === '點心');
  expect(snack).toHaveLength(1);
  expect(snack[0]).toMatchObject({ amount: '100', currencyCode: 'JPY' });
  const expenseId = snack[0]!.id;
  const tripId = splittingTripId(world);
  const form = new SettlementPaymentForm(page);
  const paidAmount = await form.paidAmount.inputValue();
  const date = page.getByRole('textbox', { name: '結清日期', exact: true });
  const paidOn = await date.inputValue();
  const url = page.url();
  const browserRefreshes: string[] = [];
  const observeRefresh = (event: Request) => {
    if (
      event.method() === 'GET' &&
      new URL(event.url()).pathname === `/api/trips/${tripId}/settlement`
    )
      browserRefreshes.push(event.url());
  };
  page.on('request', observeRefresh);
  try {
    const session = await seedSession(world, '甲');
    expect(session.id).toBe(world.users.get('甲')!.id);
    expect(session.cookie).not.toBe(world.users.get('甲')!.cookie);
    const context = await request.newContext({
      baseURL: world.origin,
      extraHTTPHeaders: { Cookie: session.cookie, Origin: world.get<string>('webOrigin') },
    });
    try {
      const response = await context.patch(`/api/trips/${tripId}/expenses/${expenseId}`, {
        data: { amount: '200' },
      });
      expect(response.status(), 'A real second owner session must update the snack').toBe(200);
      expect(await response.json()).toMatchObject({
        id: expenseId,
        amount: '200',
        currencyCode: 'JPY',
      });
    } finally {
      await context.dispose();
    }
    const after = await readBrowserSplittingSnapshot(world);
    expect(after.settlement.accountingRevision).toBe(
      (BigInt(original.accountingRevision) + 1n).toString(),
    );
    const updated = after.sources.expenses.find((row) => row.id === expenseId)!;
    const old = before.sources.expenses.find((row) => row.id === expenseId)!;
    expect(updated).toEqual({ ...old, amount_minor: '200', updated_at: updated.updated_at });
    expect(after.sources.expenses.filter((row) => row.id !== expenseId)).toEqual(
      before.sources.expenses.filter((row) => row.id !== expenseId),
    );
    const shares = after.expenses.items.find((row) => row.id === expenseId)!.shares;
    expect(shares.map((row) => row.memberId).sort()).toEqual(
      snack[0]!.shares.map((row) => row.memberId).sort(),
    );
    expect(shares).toHaveLength(3);
    for (const share of shares)
      expect(
        independentSplittingOracle.equal(share.amount, {
          numerator: '200',
          denominator: '3',
          minorUnit: 0,
        }),
      ).toBe(true);
    expect(after.sources.shares.filter((row) => row.expense_id !== expenseId)).toEqual(
      before.sources.shares.filter((row) => row.expense_id !== expenseId),
    );
    for (const key of ['members', 'repayments', 'settlements', 'adjustments'] as const)
      expect(after.sources[key]).toEqual(before.sources[key]);
    const current = after.settlement.arrangements.filter(
      (row) =>
        row.debtorMemberId === original.debtorMemberId &&
        row.creditorMemberId === original.creditorMemberId &&
        row.currencyCode === original.currencyCode,
    );
    expect(current).toHaveLength(1);
    expect(current[0]!.key).not.toBe(original.arrangementKey);
    expect(
      independentSplittingOracle.equal(current[0]!.amount, {
        numerator: '200',
        denominator: '3',
        minorUnit: 0,
      }),
    ).toBe(true);
    await expect(form.paidAmount).toHaveValue(paidAmount);
    await expect(date).toHaveValue(paidOn);
    await expect(page.getByText(/JPY\s*33\.33/).first()).toBeVisible();
    expect(page.url()).toBe(url);
    const commandForm = page
      .locator('form')
      .filter({ has: page.getByRole('button', { name: '結清這筆安排', exact: true }) });
    await expect(commandForm).toHaveAttribute('data-command-id', original.id);
    await expect(commandForm).toHaveAttribute('data-repayment-id', original.repaymentId);
    expect(world.get(settlementFormKey)).toEqual(original);
    expect(world.get(settlementBeforeKey)).toEqual(before);
    expect(world.get<RepaymentBrowserWrite[]>(settlementWritesKey)).toEqual([]);
    expect(browserRefreshes, 'The first device must not refresh its old arrangement').toEqual([]);
    world.set(staleSettlementFormKey, { original, before, after, expenseId, paidAmount, paidOn });
    world.set('splitting:sourceSnapshot', after.sources);
    world.set('splitting:before', after.sources);
    world.splitting.snapshot = after.sources;
  } finally {
    page.off('request', observeRefresh);
  }
}
