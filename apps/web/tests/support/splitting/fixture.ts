import { randomUUID } from 'node:crypto';
import currencyCatalog from '../../../../../packages/shared/data/currencies.json' with { type: 'json' };
import { expect, type Page } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  seedSplittingMembers,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  seedSplittingExpenses,
  snapshotSplittingSources,
  independentSplittingOracle,
  fixtureMinorAmount,
  type SplittingExpenseRow,
} from '../../../../api/tests/support/splitting/expense-fixture.js';
import type { SourceSnapshot } from '../../../../api/tests/support/splitting/types.js';
import { login } from '../browser.js';

export const browserSplittingStateKey = 'splitting:browserInitial';

export const browserSplittingExpensesPhrase = '分帳旅行已有以下支出：';

export interface BrowserExpense {
  id: string;
  tripId: string;
  item: string;
  amount: string;
  currencyCode: string;
  minorUnit: number;
  spentOn: string;
  category: unknown;
  payerMemberId: string;
  shares: { memberId: string; amount: ExactAmount }[];
}

export interface BrowserSettlement {
  accountingRevision: string;
  simplifyDebts: boolean;
  balances: { memberId: string; currencyCode: string; netAmount: ExactAmount }[];
  arrangements: {
    key: string;
    debtorMemberId: string;
    creditorMemberId: string;
    currencyCode: string;
    amount: ExactAmount;
  }[];
}

export interface BrowserSplittingSnapshot {
  sources: SourceSnapshot;
  expenses: { items: BrowserExpense[]; totalCount: number; nextCursor: string | null };
  settlement: BrowserSettlement;
  repayments: { items: Record<string, unknown>[] };
  totals: { totals: { currencyCode: string; amount: string; minorUnit: number }[] };
}

export function browserFixtureMemberNames(rows: readonly SplittingExpenseRow[]): string[] {
  expect(rows.length, 'Expense DataTable requires at least one row').toBeGreaterThan(0);
  const names = new Set(['Alice']);
  for (const row of rows) {
    expect(Object.keys(row).sort()).toEqual(['項目', '幣別', '金額', '付款人', '分攤者'].sort());
    expect(row.項目.trim()).not.toBe('');
    expect(row.幣別).toMatch(/^[A-Z]{3}$/);
    const shares = row.分攤者.split('、').map((name) => name.trim());
    expect(shares.every(Boolean), 'Share names must be nonempty').toBe(true);
    expect(new Set(shares).size, 'Share names must be unique').toBe(shares.length);
    for (const name of [row.付款人.trim(), ...shares]) {
      expect(name).not.toBe('');
      names.add(name === 'owner' ? 'Alice' : name);
    }
  }

  return [...names].sort();
}

/** Zero rows may survive removal of a currency's final source; all debt still comes from sources. */
export function assertBrowserSettlementBalances(
  sources: SourceSnapshot,
  balances: BrowserSettlement['balances'],
): void {
  const knownCurrencies = new Set(currencyCatalog.map((currency) => currency.code));
  const balanceKeys = balances.map((row) => `${row.memberId}:${row.currencyCode}`);
  expect(new Set(balanceKeys).size).toBe(balanceKeys.length);
  const currencies = new Set(
    [...sources.expenses, ...sources.repayments, ...sources.adjustments].map((row) =>
      String(row.currency_code),
    ),
  );
  for (const balance of balances) {
    expect(sources.members.some((member) => member.id === balance.memberId)).toBe(true);
    expect(
      knownCurrencies.has(balance.currencyCode),
      'Balance currency must exist in the catalog',
    ).toBe(true);
    const exact = balance.netAmount;
    expect(Object.keys(exact).sort()).toEqual(['denominator', 'minorUnit', 'numerator']);
    expect(exact.numerator).toMatch(/^(?:0|-?[1-9][0-9]*)$/);
    expect(exact.denominator).toMatch(/^[1-9][0-9]*$/);
    expect(Number.isInteger(exact.minorUnit) && exact.minorUnit >= 0 && exact.minorUnit <= 4).toBe(
      true,
    );
    let numerator = BigInt(exact.numerator);
    let denominator = BigInt(exact.denominator);
    if (numerator === 0n) expect(denominator, 'Zero must use canonical denominator 1').toBe(1n);
    numerator = numerator < 0n ? -numerator : numerator;
    while (denominator !== 0n) [numerator, denominator] = [denominator, numerator % denominator];
    expect(numerator, 'Exact balances must be reduced').toBe(1n);
    if (!currencies.has(balance.currencyCode))
      expect(exact.numerator, 'A currency without sources can only have a zero balance').toBe('0');
    expect(
      independentSplittingOracle.equal(
        balance.netAmount,
        independentSplittingOracle.balance(sources, balance.memberId, balance.currencyCode),
      ),
    ).toBe(true);
  }
  for (const member of sources.members)
    for (const currency of currencies) {
      const expected = independentSplittingOracle.balance(sources, String(member.id), currency);
      if (BigInt(expected.numerator) !== 0n)
        expect(balanceKeys).toContain(`${String(member.id)}:${currency}`);
    }
}

/** Real owner reads; zero balances may be omitted by the API contract. */
export async function readBrowserSplittingSnapshot(
  world: LedgerWorld,
): Promise<BrowserSplittingSnapshot> {
  const base = `/api/trips/${splittingTripId(world)}`;

  async function read<T>(suffix: string): Promise<T> {
    const reply = await callApi(world, 'GET', `${base}${suffix}`);
    expect(reply.status(), `Product must provide owner GET ${suffix}`).toBe(200);

    return (await reply.json()) as T;
  }

  const sources = await snapshotSplittingSources(world);
  const expenses = await read<BrowserSplittingSnapshot['expenses']>('/expenses?limit=100');
  const settlement = await read<BrowserSettlement>('/settlement');
  const repayments = await read<BrowserSplittingSnapshot['repayments']>('/repayments');
  const totals = await read<BrowserSplittingSnapshot['totals']>('/totals');
  expect(Array.isArray(expenses.items), 'Expense projection must supply items').toBe(true);
  expect(Array.isArray(settlement.balances), 'Settlement projection must supply balances').toBe(
    true,
  );
  expect(
    Array.isArray(settlement.arrangements),
    'Settlement projection must supply arrangements',
  ).toBe(true);
  expect(Array.isArray(repayments.items), 'Repayment projection must supply items').toBe(true);
  expect(Array.isArray(totals.totals), 'Totals projection must supply per-currency totals').toBe(
    true,
  );
  expect(expenses.totalCount).toBe(sources.expenses.length);
  expect(expenses.items.map((row) => row.id).sort()).toEqual(
    sources.expenses.map((row) => row.id).sort(),
  );
  for (const view of expenses.items) {
    const row = sources.expenses.find((source) => source.id === view.id)!;
    expect(view).toMatchObject({
      tripId: splittingTripId(world),
      item: row.item,
      currencyCode: row.currency_code,
      minorUnit: row.minor_unit,
      payerMemberId: row.payer_member_id,
      category: row.category_id,
    });
    expect(fixtureMinorAmount(view.amount, view.minorUnit).toString()).toBe(
      String(row.amount_minor),
    );
    const shares = sources.shares.filter((share) => share.expense_id === view.id);
    expect(Array.isArray(view.shares), 'Expense projection must supply exact shares').toBe(true);
    expect(view.shares.map((share) => share.memberId).sort()).toEqual(
      shares.map((share) => share.member_id).sort(),
    );
    for (const share of view.shares)
      expect(
        independentSplittingOracle.equal(
          share.amount,
          independentSplittingOracle.share(sources, view.id, share.memberId),
        ),
      ).toBe(true);
    const date = await world.db.query<{ date: string }>(
      'SELECT spent_on::text AS date FROM expenses WHERE id=$1',
      [view.id],
    );
    expect(view.spentOn).toBe(date.rows[0]!.date);
  }
  expect(settlement.accountingRevision).toBe(String(sources.trips[0]!.accounting_revision));
  expect(settlement.simplifyDebts).toBe(sources.trips[0]!.simplify_debts);
  assertBrowserSettlementBalances(sources, settlement.balances);
  expect(repayments.items.map((row) => row.id).sort()).toEqual(
    sources.repayments.map((row) => row.id).sort(),
  );
  expect(totals.totals.map((row) => row.currencyCode).sort()).toEqual(
    [...new Set(sources.expenses.map((row) => String(row.currency_code)))].sort(),
  );
  for (const total of totals.totals) {
    expect(total.minorUnit).toBe(
      Math.max(
        ...sources.expenses
          .filter((row) => row.currency_code === total.currencyCode)
          .map((row) => Number(row.minor_unit)),
      ),
    );
    const sum = sources.expenses
      .filter((row) => row.currency_code === total.currencyCode)
      .reduce(
        (value, row) =>
          value +
          BigInt(String(row.amount_minor)) *
            10n ** BigInt(total.minorUnit - Number(row.minor_unit)),
        0n,
      );
    expect(fixtureMinorAmount(total.amount, total.minorUnit)).toBe(sum);
  }
  expect(
    await snapshotSplittingSources(world),
    'Fixture authority reads must not mutate sources',
  ).toEqual(sources);

  return { sources, expenses, settlement, repayments, totals };
}

/** Arrange only: no navigation, product mock, or product schema creation. */
export async function seedBrowserSplittingExpenses(
  page: Page,
  world: LedgerWorld,
  rows: readonly SplittingExpenseRow[],
): Promise<void> {
  const names = browserFixtureMemberNames(rows);
  await seedSplittingMembers(world);
  const tripId = splittingTripId(world);
  const ownerId = world.get<string>('splitting:ownerId');
  for (const [name, id] of world.splitting.ids.members)
    if (!names.includes(name)) {
      await world.db.query('DELETE FROM trip_members WHERE id=$1 AND trip_id=$2', [id, tripId]);
      world.splitting.ids.members.delete(name);
    }
  for (const name of names)
    if (!world.splitting.ids.members.has(name)) {
      const id = randomUUID();
      await world.db.query(
        'INSERT INTO trip_members(id,owner_id,trip_id,role,name,is_active) VALUES($1,$2,$3,$4,$5,true)',
        [id, ownerId, tripId, 'companion', name],
      );
      world.splitting.ids.members.set(name, id);
    }
  await seedSplittingExpenses(world, rows);
  await world.db.query('UPDATE expenses SET spent_on=$2 WHERE trip_id=$1', [tripId, '2027-03-11']);
  await world.db.query('UPDATE trips SET start_date=$2,end_date=$2 WHERE id=$1', [
    tripId,
    '2027-03-11',
  ]);
  const initial = await readBrowserSplittingSnapshot(world);
  expect(initial.repayments.items).toEqual([]);
  expect(initial.sources.settlements).toEqual([]);
  expect(initial.sources.adjustments).toEqual([]);
  world.set(browserSplittingStateKey, initial);
  world.set('splitting:sourceSnapshot', initial.sources);
  world.set('splitting:expenseSources', initial.sources);
  world.set('splitting:initialRevision', initial.settlement.accountingRevision);
  world.set('splitting:revision', initial.settlement.accountingRevision);
  world.splitting.snapshot = initial.sources;
  await login(page, world);
}
