import type { Expense } from '../../../src/api/index.js';
import { effectiveExpenseInput } from './expense-patch-input.js';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementUI } from '../trips/management-fixture.js';
import type { OperationWait } from './operation-wait.js';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function executeOperation(world: LedgerWorld, operation: string): Promise<void> {
  const state = world.get<OperationWait>('loading:operation'),
    ui = managementUI(world);
  expect(operation).toBe(state.operation);
  expect(ui.writes.length).toBe(0);
  let originalExpense: Expense | undefined;
  if (operation === '修改支出') {
    const read = ui.reads
      .filter(
        (request) => new URL(request.url()).pathname === state.path && request.failure() === null,
      )
      .at(-1);
    expect(read).toBeDefined();
    const response = await read!.response();
    expect(response?.status()).toBe(200);
    originalExpense = (await response!.json()) as Expense;
    expect(originalExpense.id).toBe(state.targetId);
  }
  await expect(state.control).toBeEnabled();
  await state.control.scrollIntoViewIfNeeded();
  state.box = (await state.control.boundingBox())!;
  expect(state.box).not.toBeNull();
  expect(state.name).not.toBe('');
  await state.control.click();
  await expect.poll(() => state.after !== undefined || state.errors.length > 0).toBe(true);
  expect(state.errors.map(String)).toEqual([]);
  expect(state.exchanges.length).toBe(1);
  expect(state.finished).toBe(0);
  expect(state.released).toBe(false);
  expect(ui.writes.length).toBe(1);
  const request = ui.writes[0]!;
  expect(request.method()).toBe(state.method);
  expect(new URL(request.url()).pathname).toBe(state.path);
  const headers = await request.allHeaders();
  let body: Record<string, unknown> = {};
  if (headers['content-type']?.includes('application/json'))
    body = request.postDataJSON() as Record<string, unknown>;
  const input = originalExpense ? effectiveExpenseInput(originalExpense, body) : body;
  if (['移至垃圾桶', '復原旅行', '永久刪除旅行'].includes(operation)) {
    expect(body.operationId).toMatch(uuid);
    expect(body.expectedLifecycleRevision).toBe(String(state.before.trips[0]!.lifecycle_revision));
  } else if (['保存新縮圖', '更換縮圖', '保存預覽的預設縮圖'].includes(operation)) {
    expect(headers['x-operation-id']).toMatch(uuid);
    expect(headers['x-expected-lifecycle-revision']).toBe(
      String(state.before.trips[0]!.lifecycle_revision),
    );
    expect(headers['x-expected-thumbnail-revision']).toBe(
      String(state.before.trips[0]!.thumbnail_revision),
    );
  } else {
    const expected: Record<string, Record<string, unknown>> = {
      建立旅行: { name: '京都賞楓', startDate: null, endDate: null },
      保存旅行名稱與日期: { name: '京都旅行', startDate: '2027-03-10', endDate: '2027-03-15' },
      新增支出: {
        item: '點心',
        amount: '100',
        currencyCode: 'JPY',
        spentOn: '2027-03-11',
        payerMemberId: world.splitting.ids.members.get('Alice'),
      },
      修改支出: { item: '點心', amount: '200', currencyCode: 'JPY', spentOn: '2027-03-11' },
      新增分類: { name: '伴手禮' },
      修改分類: { name: '餐食' },
      新增同行者: { name: 'Carol' },
      修改同行者名稱: { name: '小艾' },
      停用同行者: { isActive: false },
      啟用同行者: { isActive: true },
      切換簡化付款: { simplifyDebts: true },
      記錄獨立還款: {
        amount: '40',
        currencyCode: 'JPY',
        paidOn: '2027-03-12',
        payerMemberId: world.splitting.ids.members.get('Amy'),
        payeeMemberId: world.splitting.ids.members.get('Alice'),
      },
      保存實付結清: {
        paidAmount: '100',
        paidOn: '2027-03-12',
        currencyCode: 'JPY',
        accountingRevision: String(state.before.trips[0]!.accounting_revision),
        expectedAmount: { numerator: '100', denominator: '1', minorUnit: 0 },
      },
    };
    if (expected[operation]) expect(input).toMatchObject(expected[operation]!);
    if (state.method === 'POST') expect(body.id).toMatch(uuid);
    if (operation === '保存實付結清') expect(body.repaymentId).toMatch(uuid);
    if (['新增支出', '修改支出'].includes(operation)) {
      expect([...(input.shareMemberIds as string[])].sort()).toEqual(
        [world.splitting.ids.members.get('Alice'), world.splitting.ids.members.get('Amy')].sort(),
      );
      expect(input.categoryId).toBe(
        state.before.categories.find(
          (row) => row.owner_id === world.users.get('Alice')!.id && row.name === '餐飲',
        )!.id,
      );
    }
  }
  world.set('loading:operationRequest', {
    method: request.method(),
    path: state.path,
    body,
    effectiveBody: input,
    operationId: body.operationId ?? headers['x-operation-id'],
    id: body.id,
    repaymentId: body.repaymentId,
  });
  state.focus = await state.control.evaluate((element) =>
    element === document.activeElement ? 'control' : null,
  );
}
