import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { seedIdentity, seedTrip, seedExpense } from '../seed.js';
import type { CategoryAnalysisContext } from './context.js';
import type { AnalysisSeedRow } from './contracts.js';

export function analysisContext(world: LedgerWorld): CategoryAnalysisContext {
  return world.get<CategoryAnalysisContext>('analysis:context');
}

export async function analysisSnapshot(world: LedgerWorld) {
  const c = analysisContext(world);
  const result: Record<string, Record<string, unknown>[]> = {};
  for (const [key, table, filter] of [
    ['trips', 'trips', 'id'],
    ['members', 'trip_members', 'trip_id'],
    ['expenses', 'expenses', 'trip_id'],
    ['shares', 'expense_shares', 'trip_id'],
    ['repayments', 'repayments', 'trip_id'],
    ['settlements', 'settlements', 'trip_id'],
    ['adjustments', 'settlement_adjustments', 'trip_id'],
  ]) {
    result[key!] = (
      await world.db.query(
        `SELECT * FROM ${table} WHERE ${filter}=$1 ORDER BY to_jsonb(${table})::text`,
        [c.tripId],
      )
    ).rows;
  }
  result.categories = (
    await world.db.query('SELECT * FROM categories WHERE owner_id=$1 ORDER BY id', [
      world.users.get('Alice')!.id,
    ])
  ).rows;

  return result;
}

export async function createAnalysisTrip(world: LedgerWorld) {
  const owner = await seedIdentity(world, 'Alice');
  const trip = await seedTrip(world, '台南旅行', 'Alice', {
    startDate: '2027-04-03',
    endDate: '2027-04-05',
  });
  const ownerMember = (
    await world.db.query("SELECT id FROM trip_members WHERE trip_id=$1 AND role='owner'", [trip.id])
  ).rows[0].id as string;
  const context: CategoryAnalysisContext = {
    tripId: trip.id,
    ownerMemberId: ownerMember,
    members: new Map([['Alice', ownerMember]]),
    categories: new Map(),
    expenses: new Map(),
  };
  for (const name of ['Amy', 'Bob']) {
    const id = randomUUID();
    await world.db.query(
      "INSERT INTO trip_members(id,owner_id,trip_id,role,name,is_active) VALUES($1,$2,$3,'companion',$4,true)",
      [id, owner.id, trip.id, name],
    );
    context.members.set(name, id);
  }
  world.set('analysis:context', context);
  world.set('analysis:viewer', 'Alice');

  return context;
}

export async function seedAnalysisRows(world: LedgerWorld, rows: AnalysisSeedRow[]) {
  expect(rows.length).toBeGreaterThan(0);
  const c = await createAnalysisTrip(world);
  expect(
    (await world.db.query('SELECT id FROM expenses WHERE trip_id=$1', [c.tripId])).rows,
  ).toEqual([]);
  for (const row of rows) {
    expect(Object.keys(row).sort()).toEqual(
      ['項目', '分類', '幣別', '金額', '付款人', '分攤者'].sort(),
    );
    expect(c.expenses.has(row.項目!)).toBe(false);
    const participants = row.分攤者!.split('、');
    expect(new Set(participants).size).toBe(participants.length);
    for (const name of [...participants, row.付款人!]) expect(c.members.has(name)).toBe(true);
    const e = await seedExpense(world, {
      item: row.項目!,
      owner: 'Alice',
      tripName: '台南旅行',
      currencyCode: row.幣別!,
      amount: row.金額!,
      categoryName: row.分類 === '未分類' ? null : row.分類,
      spentOn: '2027-04-03',
    });
    const client = await world.db.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE expenses SET payer_member_id=$2 WHERE id=$1', [
        e.id,
        c.members.get(row.付款人!),
      ]);
      await client.query('DELETE FROM expense_shares WHERE expense_id=$1', [e.id]);
      for (const name of participants)
        await client.query(
          'INSERT INTO expense_shares(owner_id,trip_id,expense_id,member_id) VALUES($1,$2,$3,$4)',
          [e.owner_id, c.tripId, e.id, c.members.get(name)],
        );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    const stored = (
      await world.db.query('SELECT *,spent_on::text AS date FROM expenses WHERE id=$1', [e.id])
    ).rows[0];
    expect(stored).toMatchObject({
      item: row.項目,
      currency_code: row.幣別,
      payer_member_id: c.members.get(row.付款人!),
      date: '2027-04-03',
    });
    expect(
      (
        await world.db.query(
          'SELECT member_id FROM expense_shares WHERE expense_id=$1 ORDER BY member_id',
          [e.id],
        )
      ).rows.map((r) => r.member_id),
    ).toEqual(participants.map((n) => c.members.get(n)).sort());
    c.expenses.set(row.項目!, e.id);
    if (e.category_id) c.categories.set(row.分類!, e.category_id);
  }
  world.set('analysis:source', await analysisSnapshot(world));
}

export async function appendAnalysisRows(world: LedgerWorld, rows: AnalysisSeedRow[]) {
  const c = analysisContext(world);
  const before = await analysisSnapshot(world);
  for (const row of rows) {
    expect(c.expenses.has(row.項目!)).toBe(false);
    let categoryId: string | null = null;
    if (row.分類 !== '未分類') {
      const { seedCategory } = await import('../seed.js');
      categoryId = (await seedCategory(world, row.分類!, 'Alice')).id;
      c.categories.set(row.分類!, categoryId);
    }
    const { callApi } = await import('../seed.js');
    const id = randomUUID();
    const response = await callApi(
      world,
      'POST',
      `/api/trips/${c.tripId}/expenses`,
      {
        id,
        item: row.項目,
        amount: row.金額,
        currencyCode: row.幣別,
        spentOn: '2027-04-03',
        categoryId,
        payerMemberId: c.members.get(row.付款人!),
        shareMemberIds: row.分攤者!.split('、').map((n) => c.members.get(n)),
      },
      'Alice',
    );
    expect(response.status(), await response.text()).toBe(201);
    const saved = (await world.db.query('SELECT * FROM expenses WHERE id=$1', [id])).rows[0];
    expect(saved).toMatchObject({
      item: row.項目,
      category_id: categoryId,
      currency_code: row.幣別,
      payer_member_id: c.members.get(row.付款人!),
    });
    const shares = (
      await world.db.query(
        'SELECT member_id FROM expense_shares WHERE expense_id=$1 ORDER BY member_id',
        [id],
      )
    ).rows;
    expect(shares.map((r) => r.member_id)).toEqual(
      row
        .分攤者!.split('、')
        .map((n) => c.members.get(n))
        .sort(),
    );
    c.expenses.set(row.項目!, id);
  }
  for (const old of before.expenses!)
    expect((await world.db.query('SELECT * FROM expenses WHERE id=$1', [old.id])).rows[0]).toEqual(
      old,
    );
  world.set('analysis:source', await analysisSnapshot(world));
}

export async function seedEmptyAnalysis(world: LedgerWorld) {
  await createAnalysisTrip(world);
  expect(
    (
      await world.db.query('SELECT * FROM expenses WHERE trip_id=$1', [
        analysisContext(world).tripId,
      ])
    ).rows,
  ).toEqual([]);
  world.set('analysis:source', await analysisSnapshot(world));
}

export async function seedPagedAnalysis(
  world: LedgerWorld,
  count: number,
  currency: string,
  meal: string,
  ticketCurrency: string,
  ticket: string,
) {
  expect(Number.isInteger(count) && count > 0).toBe(true);
  await seedAnalysisRows(world, [
    ...Array.from({ length: count }, (_, i) => ({
      項目: `餐點${i + 1}`,
      分類: '餐飲',
      幣別: currency,
      金額: meal,
      付款人: 'Alice',
      分攤者: 'Alice',
    })),
    {
      項目: '機票',
      分類: '交通',
      幣別: ticketCurrency,
      金額: ticket,
      付款人: 'Alice',
      分攤者: 'Alice',
    },
  ]);
  const c = analysisContext(world);
  await world.db.query(
    "UPDATE trips SET name='日本旅行',start_date='2027-03-10',end_date='2027-03-15' WHERE id=$1",
    [c.tripId],
  );
  await world.db.query(
    "UPDATE expenses SET spent_on=CASE WHEN item='機票' THEN '2027-01-15'::date ELSE '2027-03-11'::date END WHERE trip_id=$1",
    [c.tripId],
  );
  const s = await analysisSnapshot(world);
  expect(s.expenses).toHaveLength(count + 1);
  expect(
    (
      await world.db.query('SELECT spent_on::text AS day FROM expenses WHERE id=$1', [
        c.expenses.get('機票'),
      ])
    ).rows,
  ).toEqual([{ day: '2027-01-15' }]);
  world.set('analysis:source', s);
}

export async function seedOtherAnalysisTrip(world: LedgerWorld, currency: string, amount: string) {
  const c = analysisContext(world),
    id = c.tripId;
  const expense = await seedExpense(world, {
    item: '另一旅行餐飲',
    owner: 'Alice',
    tripName: '另一台南旅行',
    currencyCode: currency,
    amount,
    categoryName: '餐飲',
    spentOn: '2027-04-03',
  });
  expect(expense.trip_id).not.toBe(id);
  expect(
    (await world.db.query('SELECT member_id FROM expense_shares WHERE expense_id=$1', [expense.id]))
      .rows,
  ).toHaveLength(1);
  world.set('analysis:otherTripId', expense.trip_id);
  expect(analysisContext(world).tripId).toBe(id);
  world.set('analysis:source', await analysisSnapshot(world));
}

export async function seedAnalysisPayments(
  world: LedgerWorld,
  repaymentCurrency: string,
  repayment: string,
  paidCurrency: string,
  paid: string,
) {
  const { callApi } = await import('../seed.js');
  const c = analysisContext(world),
    before = await analysisSnapshot(world);
  const first = await callApi(
    world,
    'POST',
    `/api/trips/${c.tripId}/repayments`,
    {
      id: randomUUID(),
      payerMemberId: c.members.get('Amy'),
      payeeMemberId: c.ownerMemberId,
      amount: repayment,
      currencyCode: repaymentCurrency,
      paidOn: '2027-04-03',
    },
    'Alice',
  );
  expect(first.status(), await first.text()).toBe(201);
  const read = await callApi(world, 'GET', `/api/trips/${c.tripId}/settlement`, undefined, 'Alice');
  expect(read.status()).toBe(200);
  const view = await read.json();
  const a = view.arrangements.find(
    (a: Record<string, unknown>) =>
      a.debtorMemberId === c.members.get('Bob') &&
      a.creditorMemberId === c.ownerMemberId &&
      a.currencyCode === paidCurrency,
  );
  expect(a, 'Bob→Alice arrangement exists').toBeTruthy();
  const save = await callApi(
    world,
    'POST',
    `/api/trips/${c.tripId}/settlements`,
    {
      id: randomUUID(),
      repaymentId: randomUUID(),
      arrangementKey: a.key,
      accountingRevision: view.accountingRevision,
      debtorMemberId: a.debtorMemberId,
      creditorMemberId: a.creditorMemberId,
      currencyCode: paidCurrency,
      expectedAmount: a.amount,
      paidAmount: paid,
      paidOn: '2027-04-03',
    },
    'Alice',
  );
  expect(save.status(), await save.text()).toBe(201);
  const s = await analysisSnapshot(world);
  expect(s.expenses).toEqual(before.expenses);
  expect(s.shares).toEqual(before.shares);
  expect(s.repayments).toHaveLength(2);
  expect(s.settlements).toHaveLength(1);
  expect(s.repayments!.map((r) => r.kind).sort()).toEqual(['independent', 'settlement']);
  world.set('analysis:source', s);
}

export async function seedHistoricalAnalysis(
  world: LedgerWorld,
  oldUnit: number,
  currency: string,
  oldAmount: string,
  newUnit: number,
  newCurrency: string,
  newAmount: string,
) {
  for (const unit of [oldUnit, newUnit])
    expect(Number.isInteger(unit) && unit >= 0 && unit <= 4).toBe(true);
  await seedAnalysisRows(world, [
    {
      項目: '歷史',
      分類: '餐飲',
      幣別: currency,
      金額: '1',
      付款人: 'Alice',
      分攤者: 'Alice、Amy',
    },
    {
      項目: '新精度',
      分類: '餐飲',
      幣別: newCurrency,
      金額: '1',
      付款人: 'Alice',
      分攤者: 'Alice、Amy',
    },
  ]);
  const c = analysisContext(world);
  for (const [item, unit, amount] of [
    ['歷史', oldUnit, oldAmount],
    ['新精度', newUnit, newAmount],
  ] as const) {
    const [whole, decimal = ''] = amount.split('.');
    expect(decimal.length).toBeLessThanOrEqual(unit);
    const minor = BigInt(whole!) * 10n ** BigInt(unit) + BigInt(decimal.padEnd(unit, '0') || '0');
    await world.db.query('UPDATE expenses SET amount_minor=$2,minor_unit=$3 WHERE id=$1', [
      c.expenses.get(item),
      String(minor),
      unit,
    ]);
    expect(
      (
        await world.db.query('SELECT amount_minor,minor_unit FROM expenses WHERE id=$1', [
          c.expenses.get(item),
        ])
      ).rows,
    ).toEqual([{ amount_minor: String(minor), minor_unit: unit }]);
  }
  world.set('analysis:source', await analysisSnapshot(world));
}
