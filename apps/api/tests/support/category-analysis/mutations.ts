import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { analysisContext, analysisSnapshot } from './fixture.js';

export async function patchAnalysisExpense(
  world: LedgerWorld,
  item: string,
  patch: Record<string, unknown>,
) {
  const c = analysisContext(world),
    id = c.expenses.get(item);
  expect(id).toBeTruthy();
  const response = await callApi(
    world,
    'PATCH',
    `/api/trips/${c.tripId}/expenses/${id}`,
    patch,
    'Alice',
  );
  expect(response.status(), await response.text()).toBe(200);
  const saved = (await world.db.query('SELECT * FROM expenses WHERE id=$1', [id])).rows[0];
  expect(saved.item).toBe(item);
  world.set('analysis:source', await analysisSnapshot(world));

  return saved;
}

export async function saveAnalysisAmount(
  world: LedgerWorld,
  item: string,
  currency: string,
  amount: string,
) {
  const c = analysisContext(world),
    before = await analysisSnapshot(world);
  const row = await patchAnalysisExpense(world, item, { currencyCode: currency, amount });
  const unit = (await world.db.query('SELECT minor_unit FROM currencies WHERE code=$1', [currency]))
    .rows[0].minor_unit as number;
  const [whole, decimal = ''] = amount.split('.');
  const minor = BigInt(whole!) * 10n ** BigInt(unit) + BigInt(decimal.padEnd(unit, '0'));
  expect(row).toMatchObject({
    currency_code: currency,
    minor_unit: unit,
    amount_minor: minor.toString(),
  });
  const original = before.expenses!.find((e) => e.id === c.expenses.get(item))!;
  expect(row).toMatchObject({
    payer_member_id: original.payer_member_id,
    category_id: original.category_id,
  });
  expect((await analysisSnapshot(world)).shares).toEqual(before.shares);
}

export async function saveAnalysisShares(world: LedgerWorld, item: string, names: string) {
  const c = analysisContext(world),
    before = await analysisSnapshot(world);
  const ids = names.split('、').map((n) => c.members.get(n));
  expect(ids.every(Boolean)).toBe(true);
  const row = await patchAnalysisExpense(world, item, { shareMemberIds: ids });
  const original = before.expenses!.find((e) => e.id === c.expenses.get(item))!;
  expect(row).toMatchObject({
    payer_member_id: original.payer_member_id,
    amount_minor: original.amount_minor,
    currency_code: original.currency_code,
  });
  expect(
    (
      await world.db.query(
        'SELECT member_id FROM expense_shares WHERE expense_id=$1 ORDER BY member_id',
        [row.id],
      )
    ).rows.map((r) => r.member_id),
  ).toEqual(ids.sort());
}

export async function deleteAnalysisExpense(world: LedgerWorld, item: string) {
  const c = analysisContext(world),
    id = c.expenses.get(item),
    before = await analysisSnapshot(world);
  const r = await callApi(
    world,
    'DELETE',
    `/api/trips/${c.tripId}/expenses/${id}`,
    undefined,
    'Alice',
  );
  expect(r.status()).toBe(204);
  const s = await analysisSnapshot(world);
  expect(s.expenses!.some((e) => e.id === id)).toBe(false);
  expect(s.shares!.some((e) => e.expense_id === id)).toBe(false);
  expect(s.expenses).toEqual(before.expenses!.filter((e) => e.id !== id));
  world.set('analysis:deletedExpenseId', id);
  world.set('analysis:source', s);
}

export async function renameAnalysisCategory(world: LedgerWorld, oldName: string, newName: string) {
  const c = analysisContext(world),
    id = c.categories.get(oldName),
    before = await analysisSnapshot(world);
  const r = await callApi(world, 'PATCH', `/api/categories/${id}`, { name: newName }, 'Alice');
  expect(r.status(), await r.text()).toBe(200);
  expect((await world.db.query('SELECT id,name FROM categories WHERE id=$1', [id])).rows).toEqual([
    { id, name: newName },
  ]);
  expect((await analysisSnapshot(world)).expenses).toEqual(before.expenses);
  c.categories.delete(oldName);
  c.categories.set(newName, id!);
  world.set('analysis:source', await analysisSnapshot(world));
}

export async function clearAnalysisCategory(world: LedgerWorld, item: string) {
  const c = analysisContext(world),
    before = await analysisSnapshot(world);
  const row = await patchAnalysisExpense(world, item, { categoryId: null });
  const original = before.expenses!.find((e) => e.id === c.expenses.get(item))!;
  expect(row).toMatchObject({
    category_id: null,
    amount_minor: original.amount_minor,
    payer_member_id: original.payer_member_id,
  });
  const after = await analysisSnapshot(world);
  expect(after.shares).toEqual(before.shares);
  expect(after.categories).toEqual(before.categories);
}

export async function disableAnalysisMember(world: LedgerWorld, oldName: string, newName: string) {
  const c = analysisContext(world),
    id = c.members.get(oldName),
    before = await analysisSnapshot(world);
  const r = await callApi(
    world,
    'PATCH',
    `/api/trips/${c.tripId}/members/${id}`,
    { name: newName, isActive: false },
    'Alice',
  );
  expect(r.status(), await r.text()).toBe(200);
  expect(
    (await world.db.query('SELECT id,name,is_active FROM trip_members WHERE id=$1', [id])).rows,
  ).toEqual([{ id, name: newName, is_active: false }]);
  expect((await analysisSnapshot(world)).shares).toEqual(before.shares);
  c.members.set(newName, id!);
  world.set('analysis:source', await analysisSnapshot(world));
}
