import { expect, request, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi, seedSession } from '../../../../api/tests/support/seed.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { independentSplittingOracle } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import {
  browserOverpaymentWarningKey,
  type BrowserOverpaymentWarning,
} from './overpayment-warning.js';
import {
  repaymentDraftKey,
  repaymentWritesKey,
  type RepaymentBrowserWrite,
} from './repayment-draft.js';

export const staleBrowserWarningPhrase = '另一裝置已將代付由 JPY 1000 改成 JPY 900';

export const staleBrowserWarningKey = 'splitting:staleBrowserWarning';

/** Commit a real second-session correction while the first device keeps its old warning. */
export async function lowerExpenseOnAnotherDevice(page: Page, world: LedgerWorld): Promise<void> {
  const original = structuredClone(
    world.get<BrowserOverpaymentWarning>(browserOverpaymentWarningKey),
  );
  const before = await readBrowserSplittingSnapshot(world);
  expect(before).toEqual(original.before);
  const expense = before.expenses.items.find(
    (row) => row.item === '代付' && row.currencyCode === 'JPY',
  );
  expect(expense, 'The original JPY 1000 advance must exist').toBeDefined();
  expect(expense!.amount).toBe('1000');
  const session = await seedSession(world, '甲');
  expect(session.id).toBe(world.users.get('甲')!.id);
  expect(session.cookie).not.toBe(world.users.get('甲')!.cookie);
  const context = await request.newContext({
    baseURL: world.origin,
    extraHTTPHeaders: { Cookie: session.cookie, Origin: world.get<string>('webOrigin') },
  });
  try {
    const response = await context.patch(
      `/api/trips/${splittingTripId(world)}/expenses/${expense!.id}`,
      {
        data: { amount: '900' },
      },
    );
    expect(response.status(), 'A real same-owner second device must commit the correction').toBe(
      200,
    );
    expect(await response.json()).toMatchObject({
      id: expense!.id,
      amount: '900',
      currencyCode: 'JPY',
    });
  } finally {
    await context.dispose();
  }
  const after = await readBrowserSplittingSnapshot(world);
  expect(after.settlement.accountingRevision).toBe(
    (BigInt(before.settlement.accountingRevision) + 1n).toString(),
  );
  expect(after.sources.expenses.filter((row) => row.id !== expense!.id)).toEqual(
    before.sources.expenses.filter((row) => row.id !== expense!.id),
  );
  const saved = after.sources.expenses.find((row) => row.id === expense!.id)!;
  const old = before.sources.expenses.find((row) => row.id === expense!.id)!;
  expect(saved).toEqual({ ...old, amount_minor: '900', updated_at: saved.updated_at });
  expect(after.sources.shares.filter((row) => row.expense_id !== expense!.id)).toEqual(
    before.sources.shares.filter((row) => row.expense_id !== expense!.id),
  );
  expect(after.expenses.items.find((row) => row.id === expense!.id)!.shares).toHaveLength(1);
  expect(
    independentSplittingOracle.equal(
      after.expenses.items.find((row) => row.id === expense!.id)!.shares[0]!.amount,
      { numerator: '900', denominator: '1', minorUnit: 0 },
    ),
  ).toBe(true);
  for (const key of ['members', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after.sources[key]).toEqual(before.sources[key]);
  const amyId = splittingMemberId(world, 'Amy');
  const aliceId = splittingMemberId(world, 'Alice');
  expect(
    independentSplittingOracle.equal(
      independentSplittingOracle.balance(after.sources, amyId, 'JPY'),
      { numerator: '-500', denominator: '1', minorUnit: 0 },
    ),
  ).toBe(true);
  const arrangement = after.settlement.arrangements.filter((row) => row.currencyCode === 'JPY');
  expect(arrangement).toHaveLength(1);
  expect(arrangement[0]).toMatchObject({ debtorMemberId: amyId, creditorMemberId: aliceId });
  expect(
    independentSplittingOracle.equal(arrangement[0]!.amount, {
      numerator: '500',
      denominator: '1',
      minorUnit: 0,
    }),
  ).toBe(true);
  expect(after.settlement.balances.filter((row) => row.currencyCode !== 'JPY')).toEqual(
    before.settlement.balances.filter((row) => row.currencyCode !== 'JPY'),
  );
  // Keys may bind the revision; compare the unaffected financial facts without opaque keys.
  const otherArrangements = (snapshot: typeof before) =>
    snapshot.settlement.arrangements
      .filter((row) => row.currencyCode !== 'JPY')
      .map(({ key: _key, ...row }) => row);
  expect(otherArrangements(after)).toEqual(otherArrangements(before));
  await expect(page.getByText(/超額.*JPY\s*100/)).toBeVisible();
  await expect(page.getByText(/Alice.*(?:應付|支付).*Amy.*JPY\s*100/)).toBeVisible();
  await expect(page.getByRole('button', { name: /確認.*(?:還款|保存|儲存)/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '取消', exact: true })).toBeVisible();
  await expect(page.getByText(/超額.*JPY\s*200/)).toHaveCount(0);
  expect(world.get(browserOverpaymentWarningKey)).toEqual(original);
  expect(world.get(repaymentDraftKey)).toEqual(original.request);
  expect(world.get('splitting:overpaymentConfirmation')).toEqual(original.confirmation);
  expect(world.get('splitting:overpaymentWarning')).toEqual(original.warning);
  expect(world.get('splitting:warningSnapshot')).toEqual(original.before.sources);
  expect(world.get<RepaymentBrowserWrite[]>(repaymentWritesKey)).toEqual([original.warningPost]);
  const pending = await callApi(
    world,
    'GET',
    `/api/trips/${splittingTripId(world)}/repayments/${original.request.id}`,
  );
  expect(pending.status(), 'The old warning must still be unconfirmed').toBe(404);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(after);
  world.set(staleBrowserWarningKey, { before, after, original, expenseId: expense!.id });
  world.set('splitting:sourceSnapshot', after.sources);
  world.set('splitting:before', after.sources);
  world.splitting.snapshot = after.sources;
}
