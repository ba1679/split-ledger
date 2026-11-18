import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import { ownerRead } from '../../../../api/tests/support/trip-management/preservation.js';
import { assertMemberBalanceProjection } from '../../../../api/tests/support/splitting/member-balances-result.js';
import type { OperationWait } from './operation-wait.js';

export const omitFields = (row: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)));

function unchanged(
  before: TripManagementSnapshot,
  after: TripManagementSnapshot,
  changed: (keyof TripManagementSnapshot)[],
) {
  for (const key of Object.keys(before) as (keyof TripManagementSnapshot)[])
    if (!changed.includes(key))
      expect(after[key], `Only declared operation data may change: ${key}`).toEqual(before[key]);
}

function accounting(
  before: TripManagementSnapshot,
  after: TripManagementSnapshot,
  changedFields: string[] = [],
) {
  expect(
    omitFields(after.trips[0]!, ['accounting_revision', 'updated_at', ...changedFields]),
  ).toEqual(omitFields(before.trips[0]!, ['accounting_revision', 'updated_at', ...changedFields]));
  expect(String(after.trips[0]!.accounting_revision)).toBe(
    String(BigInt(String(before.trips[0]!.accounting_revision)) + 1n),
  );
}

export async function assertOperationBusiness(
  world: LedgerWorld,
  state: OperationWait,
  after: TripManagementSnapshot,
): Promise<void> {
  const before = state.before,
    op = state.operation;
  const request = world.get<{
    body: Record<string, unknown>;
    effectiveBody?: Record<string, unknown>;
    id?: string;
    repaymentId?: string;
  }>('loading:operationRequest');
  const target = state.targetId ?? request.id;
  const owner = world.users.get('Alice')!.id;
  if (['新增支出', '修改支出', '刪除支出'].includes(op)) {
    unchanged(before, after, ['trips', 'expenses', 'shares']);
    accounting(before, after);
    expect(after.expenses.filter((row) => row.id !== target)).toEqual(
      before.expenses.filter((row) => row.id !== target),
    );
    expect(after.shares.filter((row) => row.expense_id !== target)).toEqual(
      before.shares.filter((row) => row.expense_id !== target),
    );
    const rows = after.expenses.filter((row) => row.id === target);
    if (op === '刪除支出') {
      expect(rows).toEqual([]);
      expect(after.shares.filter((row) => row.expense_id === target)).toEqual([]);
    } else {
      expect(rows.length).toBe(1);
      expect(rows[0]).toMatchObject({
        id: target,
        owner_id: owner,
        trip_id: state.tripId,
        item: '點心',
        amount_minor: op === '新增支出' ? '100' : '200',
        currency_code: 'JPY',
        minor_unit: 0,
        payer_member_id: world.splitting.ids.members.get('Alice'),
        category_id: (request.effectiveBody ?? request.body).categoryId,
      });
      expect(
        after.shares
          .filter((row) => row.expense_id === target)
          .map((row) => row.member_id)
          .sort(),
      ).toEqual(
        [world.splitting.ids.members.get('Alice'), world.splitting.ids.members.get('Amy')].sort(),
      );
      if (op === '修改支出')
        expect(omitFields(rows[0]!, ['amount_minor', 'updated_at'])).toEqual(
          omitFields(
            before.expenses.find((row) => row.id === target)!,
            ['amount_minor', 'updated_at'],
          ),
        );
      const response = await ownerRead(world, `/api/trips/${state.tripId}/expenses/${target}`);
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toMatchObject({
        id: target,
        spentOn: '2027-03-11',
        amount: op === '新增支出' ? '100' : '200',
      });
      expect(data.shares.length).toBe(2);
      for (const share of data.shares)
        expect(share.amount).toEqual({
          numerator: op === '新增支出' ? '50' : '100',
          denominator: '1',
          minorUnit: 0,
        });
    }
  } else if (['新增分類', '修改分類', '刪除未被引用的分類'].includes(op)) {
    unchanged(before, after, ['categories']);
    expect(after.categories.filter((row) => row.id !== target)).toEqual(
      before.categories.filter((row) => row.id !== target),
    );
    const rows = after.categories.filter((row) => row.id === target);
    if (op === '刪除未被引用的分類') expect(rows).toEqual([]);
    else {
      expect(rows.length).toBe(1);
      expect(rows[0]).toMatchObject({
        id: target,
        owner_id: owner,
        name: op === '新增分類' ? '伴手禮' : '餐食',
      });
      if (op === '修改分類')
        expect(omitFields(rows[0]!, ['name', 'name_key', 'updated_at'])).toEqual(
          omitFields(
            before.categories.find((row) => row.id === target)!,
            ['name', 'name_key', 'updated_at'],
          ),
        );
    }
  } else if (
    ['新增同行者', '修改同行者名稱', '停用同行者', '啟用同行者', '刪除未被引用的同行者'].includes(
      op,
    )
  ) {
    unchanged(before, after, ['trips', 'members']);
    accounting(before, after);
    expect(after.members.filter((row) => row.id !== target)).toEqual(
      before.members.filter((row) => row.id !== target),
    );
    const rows = after.members.filter((row) => row.id === target);
    if (op === '刪除未被引用的同行者') expect(rows).toEqual([]);
    else {
      expect(rows.length).toBe(1);
      const expected =
        op === '新增同行者'
          ? { name: 'Carol', role: 'companion', is_active: true }
          : op === '修改同行者名稱'
            ? { name: '小艾' }
            : { is_active: op === '啟用同行者' };
      expect(rows[0]).toMatchObject({
        id: target,
        owner_id: owner,
        trip_id: state.tripId,
        ...expected,
      });
      if (op !== '新增同行者')
        expect(
          omitFields(
            rows[0]!,
            op === '修改同行者名稱'
              ? ['name', 'name_key', 'updated_at']
              : ['is_active', 'updated_at'],
          ),
        ).toEqual(
          omitFields(
            before.members.find((row) => row.id === target)!,
            op === '修改同行者名稱'
              ? ['name', 'name_key', 'updated_at']
              : ['is_active', 'updated_at'],
          ),
        );
    }
  } else if (op === '切換簡化付款') {
    unchanged(before, after, ['trips']);
    expect(after.trips[0]!.simplify_debts).toBe(true);
    accounting(before, after, ['simplify_debts']);
  } else if (['記錄獨立還款', '保存實付結清'].includes(op)) {
    unchanged(
      before,
      after,
      op === '記錄獨立還款'
        ? ['trips', 'repayments']
        : ['trips', 'repayments', 'settlements', 'adjustments'],
    );
    accounting(before, after);
    const paymentId = op === '記錄獨立還款' ? request.id : request.repaymentId;
    expect(after.repayments.filter((row) => row.id !== paymentId)).toEqual(before.repayments);
    const payments = after.repayments.filter((row) => row.id === paymentId);
    expect(payments.length).toBe(1);
    expect(payments[0]).toMatchObject({
      owner_id: owner,
      trip_id: state.tripId,
      payer_member_id: world.splitting.ids.members.get('Amy'),
      payee_member_id: world.splitting.ids.members.get('Alice'),
      amount_minor: op === '記錄獨立還款' ? '40' : '100',
      currency_code: 'JPY',
      minor_unit: 0,
      kind: op === '記錄獨立還款' ? 'independent' : 'settlement',
      settlement_id: op === '記錄獨立還款' ? null : request.id,
    });
    const response = await ownerRead(world, `/api/trips/${state.tripId}/repayments/${paymentId}`);
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ id: paymentId, paidOn: '2027-03-12' });
    if (op === '保存實付結清') {
      expect(after.settlements.filter((row) => row.id !== request.id)).toEqual(before.settlements);
      const settlements = after.settlements.filter((row) => row.id === request.id);
      expect(settlements.length).toBe(1);
      expect(settlements[0]).toMatchObject({
        id: request.id,
        source_revision: String(before.trips[0]!.accounting_revision),
        debtor_member_id: world.splitting.ids.members.get('Amy'),
        creditor_member_id: world.splitting.ids.members.get('Alice'),
        currency_code: 'JPY',
        obligation_numerator: '100',
        obligation_denominator: '1',
        obligation_minor_unit: 0,
      });
      expect(after.adjustments.filter((row) => row.settlement_id !== request.id)).toEqual(
        before.adjustments,
      );
      const adjustments = after.adjustments.filter((row) => row.settlement_id === request.id);
      expect(adjustments.length).toBe(2);
      expect(adjustments.map((row) => row.member_id).sort()).toEqual(
        [world.splitting.ids.members.get('Alice'), world.splitting.ids.members.get('Amy')].sort(),
      );
      for (const row of adjustments) expect(String(row.numerator)).toBe('0');
    }
  } else if (op === '保存旅行名稱與日期') {
    unchanged(before, after, ['trips']);
    expect(after.trips[0]!.name).toBe('京都旅行');
    expect(omitFields(after.trips[0]!, ['name', 'start_date', 'end_date', 'updated_at'])).toEqual(
      omitFields(before.trips[0]!, ['name', 'start_date', 'end_date', 'updated_at']),
    );
    const response = await ownerRead(world, `/api/trips/${state.tripId}`);
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      id: state.tripId,
      name: '京都旅行',
      startDate: '2027-03-10',
      endDate: '2027-03-15',
    });
  }
  if (
    ['新增支出', '修改支出', '刪除支出', '記錄獨立還款', '保存實付結清', '切換簡化付款'].includes(
      op,
    )
  ) {
    const response = await ownerRead(world, `/api/trips/${state.tripId}/settlement`);
    expect(response.status()).toBe(200);
    const view = await response.json();
    const net =
      op === '新增支出' ? '50' : op === '修改支出' ? '100' : op === '記錄獨立還款' ? '60' : '0';
    const currencies = [
      ...new Set(
        [...after.expenses, ...after.repayments, ...after.adjustments].map((row) =>
          String(row.currency_code),
        ),
      ),
    ];
    const table = after.members.flatMap((member) =>
      currencies.map((currency) => ({
        成員: String(member.name),
        幣別: currency,
        淨額:
          currency === 'TWD'
            ? member.name === 'Alice'
              ? '300'
              : member.name === 'Amy'
                ? '-300'
                : '0'
            : member.name === 'Alice'
              ? net
              : member.name === 'Amy' && net !== '0'
                ? `-${net}`
                : '0',
      })),
    );
    assertMemberBalanceProjection(after, view, table, (name) =>
      String(after.members.find((member) => member.name === name)!.id),
    );
    if (['記錄獨立還款', '保存實付結清', '刪除支出'].includes(op)) {
      expect(view.arrangements.length).toBe(op === '記錄獨立還款' ? 1 : 0);
      if (op === '記錄獨立還款')
        expect(view.arrangements[0].amount).toEqual({
          numerator: '60',
          denominator: '1',
          minorUnit: 0,
        });
    }
  }
}
