import { randomUUID } from 'node:crypto';
import { expect, type Locator, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi, seedCategory } from '../../../../api/tests/support/seed.js';
import {
  seedLifecycleBaseline,
  managementTripId,
  managementSnapshot,
  sharedSnapshot,
} from '../../../../api/tests/support/trip-management/baseline.js';
import { ownerRead } from '../../../../api/tests/support/trip-management/preservation.js';
import { login } from '../browser.js';
import {
  observeManagement,
  waitForManagementReads,
  managementUI,
} from '../trips/management-fixture.js';
import { selectThumbnailDraft } from '../thumbnail/draft-fixture.js';
import { chooseCurrency } from '../expense-helpers.js';
import { IndependentRepaymentForm } from '../splitting/repayment-draft.js';
import { SettlementPaymentForm } from '../splitting/settlement-form.js';
import type { SettlementView } from '../../../src/features/settlement/types.js';

export interface OperationData {
  operation: string;
  tripId: string;
  targetId?: string;
  method: string;
  path: string;
  status: number;
  control: Locator;
  name: string;
}

async function simpleAccounting(world: LedgerWorld, operation: string): Promise<void> {
  const oldId = managementTripId(world);
  world.set('loading:untouchedTrip', { id: oldId, before: await managementSnapshot(world) });
  const tripId = randomUUID();
  const created = await callApi(
    world,
    'POST',
    '/api/trips',
    { id: tripId, name: '日本旅行', startDate: '2027-03-10', endDate: '2027-03-15' },
    'Alice',
  );
  expect(created.status()).toBe(201);
  const trip = await created.json();
  const amyId = randomUUID();
  const amy = await callApi(
    world,
    'POST',
    `/api/trips/${tripId}/members`,
    { id: amyId, name: 'Amy' },
    'Alice',
  );
  expect(amy.status()).toBe(201);
  world.tripManagement.ids.trips.set('日本旅行', tripId);
  world.splitting.ids.trips.set('日本旅行', tripId);
  world.splitting.ids.members.set('Alice', trip.ownerMemberId);
  world.splitting.ids.members.set('Amy', amyId);
  const id = randomUUID();
  const amount = ['記錄獨立還款', '保存實付結清'].includes(operation) ? '200' : '100';
  const category = await seedCategory(world, '餐飲', 'Alice');
  const expense = await callApi(
    world,
    'POST',
    `/api/trips/${tripId}/expenses`,
    {
      id,
      item: '點心',
      amount,
      currencyCode: 'JPY',
      spentOn: '2027-03-11',
      categoryId: category.id,
      payerMemberId: trip.ownerMemberId,
      shareMemberIds: [trip.ownerMemberId, amyId],
    },
    'Alice',
  );
  expect(expense.status()).toBe(201);
  world.splitting.ids.expenses.set('點心', id);
  if (operation === '刪除支出') {
    // Real historical payments cancel each other; deleting the sole expense must preserve both.
    for (const [payer, payee] of [
      [trip.ownerMemberId, amyId],
      [amyId, trip.ownerMemberId],
    ])
      await world.db.query(
        "INSERT INTO repayments(id,owner_id,trip_id,payer_member_id,payee_member_id,amount_minor,currency_code,minor_unit,paid_on,kind) VALUES($1,$2,$3,$4,$5,10,'JPY',0,'2027-03-12','independent')",
        [randomUUID(), world.users.get('Alice')!.id, tripId, payer, payee],
      );
    await world.db.query('UPDATE trips SET accounting_revision=accounting_revision+2 WHERE id=$1', [
      tripId,
    ]);
  }
}

export async function arrangeOperationData(
  page: Page,
  world: LedgerWorld,
  operation: string,
): Promise<OperationData> {
  await seedLifecycleBaseline(
    world,
    ['復原旅行', '永久刪除旅行'].includes(operation) ? '垃圾桶' : '一般可用',
  );
  if (['修改支出', '刪除支出', '記錄獨立還款', '保存實付結清'].includes(operation))
    await simpleAccounting(world, operation);
  const tripId = managementTripId(world),
    base = `/api/trips/${tripId}`;
  let targetId: string | undefined;
  if (operation === '保存新縮圖') {
    const client = await world.db.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM trip_thumbnails WHERE trip_id=$1', [tripId]);
      await client.query('UPDATE trips SET thumbnail_revision=thumbnail_revision+1 WHERE id=$1', [
        tripId,
      ]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  if (operation === '切換簡化付款')
    await world.db.query('UPDATE trips SET simplify_debts=false WHERE id=$1', [tripId]);
  if (operation === '啟用同行者')
    await world.db.query(
      "UPDATE trip_members SET is_active=false WHERE trip_id=$1 AND name='Amy'",
      [tripId],
    );
  if (operation === '刪除未被引用的同行者')
    await world.db.query(
      "UPDATE trip_members SET name='Carol' WHERE trip_id=$1 AND name='Charlie'",
      [tripId],
    );
  if (operation === '刪除未被引用的分類')
    targetId = (await seedCategory(world, '伴手禮', 'Alice')).id;
  await login(page, world, 'Alice');
  observeManagement(page, world, 'operation-wait');
  let method = 'POST',
    path = base,
    status = 200,
    control: Locator | undefined;
  const button = (name: string) => page.getByRole('button', { name, exact: true });
  if (operation === '建立旅行') {
    await page.goto('/trips');
    await button('新增旅行').click();
    await page.getByLabel('旅行名稱', { exact: true }).fill('京都賞楓');
    await expect(page.getByRole('textbox', { name: '開始日', exact: true })).toHaveValue('');
    await expect(page.getByRole('textbox', { name: '結束日', exact: true })).toHaveValue('');
    control = button('建立旅行');
    path = '/api/trips';
    status = 201;
  } else if (operation === '保存旅行名稱與日期') {
    await page.goto(`/trips/${tripId}`);
    await button('旅行日期').click();
    await page.getByLabel('旅行名稱', { exact: true }).fill('京都旅行');
    for (const [label, value] of [
      ['開始日', '2027/03/10'],
      ['結束日', '2027/03/15'],
    ]) {
      const field = page.getByRole('textbox', { name: label, exact: true });
      await field.fill(value!);
      await field.press('Tab');
    }
    control = button('儲存變更');
    method = 'PATCH';
  } else if (['移至垃圾桶', '復原旅行', '永久刪除旅行'].includes(operation)) {
    if (operation === '移至垃圾桶') {
      await page.goto(`/trips/${tripId}`);
      await button('管理旅行').click();
      await page.getByRole('menuitem', { name: '移至垃圾桶', exact: true }).click();
      control = page.getByRole('dialog').getByRole('button', { name: '移至垃圾桶', exact: true });
      path = `${base}/trash`;
    } else {
      await page.goto('/trips/trash');
      if (operation === '永久刪除旅行') {
        await button('永久刪除').click();
        control = page.getByRole('dialog').getByRole('button', { name: '永久刪除', exact: true });
        path = `${base}/purge`;
      } else {
        control = button('復原旅行');
        path = `${base}/restore`;
      }
    }
  } else if (['保存新縮圖', '更換縮圖', '保存預覽的預設縮圖'].includes(operation)) {
    await page.goto(`/trips/${tripId}`);
    await button('管理旅行').click();
    await page.getByRole('menuitem', { name: '自訂旅行縮圖', exact: true }).click();
    await selectThumbnailDraft(world, operation === '保存預覽的預設縮圖' ? '預設圖' : '神社照片');
    control = button('保存圖片');
    path = `${base}/thumbnail`;
    method = operation === '保存預覽的預設縮圖' ? 'DELETE' : 'POST';
  } else if (['新增支出', '修改支出', '刪除支出'].includes(operation)) {
    targetId = world.splitting.ids.expenses.get('點心');
    await page.goto(`/trips/${tripId}/expenses/${operation === '新增支出' ? 'new' : targetId}`);
    if (operation === '新增支出') {
      await page.getByLabel('支出項目', { exact: true }).fill('點心');
      await chooseCurrency(page, 'JPY');
      await page.getByLabel('金額', { exact: true }).fill('100');
      const date = page.getByRole('textbox', { name: '支出日期', exact: true });
      await date.fill('2027/03/11');
      await date.press('Tab');
      await page.getByRole('radio', { name: 'Alice', exact: true }).check();
      for (const name of ['Alice', 'Amy'])
        await page.getByRole('checkbox', { name, exact: true }).check();
      for (const input of await page.getByRole('checkbox').all())
        if (
          !['Alice', 'Amy'].includes((await input.getAttribute('aria-label')) ?? '') &&
          (await input.isEnabled())
        ) {
          const id = await input.inputValue();
          if (
            ![
              world.splitting.ids.members.get('Alice'),
              world.splitting.ids.members.get('Amy'),
            ].includes(id)
          )
            await input.uncheck();
        }
      const category = page.getByRole('combobox', { name: /^分類(?:選填)?$/ });
      await category.fill('餐飲');
      await page.getByRole('option', { name: '餐飲', exact: true }).click();
      path = `${base}/expenses`;
      status = 201;
      control = button('儲存支出');
    } else if (operation === '修改支出') {
      await page.getByLabel('金額', { exact: true }).fill('200');
      method = 'PATCH';
      path = `${base}/expenses/${targetId}`;
      control = button('儲存支出');
    } else {
      await button('刪除支出').click();
      control = page.getByRole('dialog').getByRole('button', { name: '確認刪除', exact: true });
      method = 'DELETE';
      path = `${base}/expenses/${targetId}`;
      status = 204;
    }
  } else if (['新增分類', '修改分類', '刪除未被引用的分類'].includes(operation)) {
    await page.goto('/categories');
    if (operation === '新增分類') {
      await button('新增分類').click();
      await page.getByLabel('分類名稱', { exact: true }).fill('伴手禮');
      path = '/api/categories';
      status = 201;
      control = page.getByRole('dialog').getByRole('button', { name: '儲存', exact: true });
    } else if (operation === '修改分類') {
      targetId = String(
        (await managementSnapshot(world)).categories.find(
          (row) => row.owner_id === world.users.get('Alice')!.id && row.name === '餐飲',
        )!.id,
      );
      await button('改名：餐飲').click();
      await page.getByLabel('分類名稱', { exact: true }).fill('餐食');
      method = 'PATCH';
      path = `/api/categories/${targetId}`;
      control = page.getByRole('dialog').getByRole('button', { name: '儲存', exact: true });
    } else {
      await button('刪除：伴手禮').click();
      method = 'DELETE';
      path = `/api/categories/${targetId}`;
      status = 204;
      control = page.getByRole('dialog').getByRole('button', { name: '確認刪除', exact: true });
    }
  } else if (
    ['新增同行者', '修改同行者名稱', '停用同行者', '啟用同行者', '刪除未被引用的同行者'].includes(
      operation,
    )
  ) {
    await page.goto(`/trips/${tripId}/members`);
    if (operation === '新增同行者') {
      await page.getByLabel('同行者名稱', { exact: true }).fill('Carol');
      control = button('新增同行者');
      path = `${base}/members`;
      status = 201;
    } else {
      const name = operation === '刪除未被引用的同行者' ? 'Carol' : 'Amy';
      targetId = String(
        (await managementSnapshot(world)).members.find((row) => row.name === name)!.id,
      );
      path = `${base}/members/${targetId}`;
      method = 'PATCH';
      if (operation === '啟用同行者') control = button('重新啟用 Amy');
      else {
        await button(
          `${operation === '修改同行者名稱' ? '改名' : operation === '停用同行者' ? '停用' : '刪除'} ${name}`,
        ).click();
        const dialog = page.getByRole('dialog');
        if (operation === '修改同行者名稱') {
          await dialog.getByLabel('同行者名稱', { exact: true }).fill('小艾');
          control = dialog.getByRole('button', { name: '儲存名稱', exact: true });
        } else {
          control = dialog.getByRole('button', {
            name: operation === '停用同行者' ? '停用' : '刪除',
            exact: true,
          });
          if (operation === '刪除未被引用的同行者') {
            method = 'DELETE';
            status = 204;
          }
        }
      }
    }
  } else if (operation === '切換簡化付款') {
    await page.goto(`/trips/${tripId}/settlement`);
    control = page.getByRole('switch', { name: '簡化付款', exact: true });
    await expect(control).not.toBeChecked();
    method = 'PATCH';
  } else if (operation === '記錄獨立還款') {
    const form = new IndependentRepaymentForm(page);
    await form.open(tripId);
    await form.fill('Alice', '40');
    control = button('儲存還款');
    path = `${base}/repayments`;
    status = 201;
  } else if (operation === '保存實付結清') {
    const response = await ownerRead(world, `${base}/settlement`);
    expect(response.status()).toBe(200);
    const view = (await response.json()) as SettlementView;
    const arrangement = view.arrangements.find(
      (row) =>
        row.currencyCode === 'JPY' && row.debtorMemberId === world.splitting.ids.members.get('Amy'),
    )!;
    expect(arrangement.amount).toEqual({ numerator: '100', denominator: '1', minorUnit: 0 });
    const form = new SettlementPaymentForm(page);
    await form.open(tripId, arrangement.key);
    await form.paidAmount.fill('100');
    const date = page.getByRole('textbox', { name: '結清日期', exact: true });
    await date.fill('2027/03/12');
    await date.press('Tab');
    control = button('結清這筆安排');
    path = `${base}/settlements`;
    status = 201;
  } else throw new Error(`Unknown operation: ${operation}`);
  await waitForManagementReads(managementUI(world));
  expect(control).toBeDefined();
  await expect(control!).toBeEnabled();
  expect(managementUI(world).writes.length).toBe(0);
  world.set('management:before', await managementSnapshot(world));
  world.set('management:sharedBefore', await sharedSnapshot(world));

  return {
    operation,
    tripId,
    targetId,
    method,
    path,
    status,
    control: control!,
    name: (await control!.getAttribute('aria-label')) ?? (await control!.innerText()).trim(),
  };
}
