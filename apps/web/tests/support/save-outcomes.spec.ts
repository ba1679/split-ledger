import { test, expect } from './fixtures.js';
import { login, openExpenseForm } from './browser.js';
import { seedExpense } from '../../../api/tests/support/seed.js';
import type { Page } from '@playwright/test';
import type { LedgerWorld } from './fixtures.js';

async function prepareDraft(page: Page, world: LedgerWorld) {
  await login(page, world); await openExpenseForm(page, world);
  await page.getByLabel('支出項目', { exact: true }).fill('尚待確認的午餐');
  const currency = page.getByRole('combobox', { name: '幣別', exact: true });
  await currency.fill('JPY'); await page.getByRole('option').filter({ hasText: /^JPY\b/ }).click();
  await page.getByLabel('金額', { exact: true }).fill('1200');
}

test('404 and unavailable verification retain the original POST UUID until an explicit successful recheck', async ({ page, world }) => {
  await prepareDraft(page, world);
  let lookupStatus = 404;
  const ids: string[] = [], lookups: string[] = [];
  await page.route('**/api/trips/*/expenses/*', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    lookups.push(new URL(route.request().url()).pathname.split('/').at(-1)!);
    if (!lookupStatus) return route.continue();
    return route.fulfill({ status: lookupStatus, contentType: 'application/json', body: JSON.stringify({ code: lookupStatus === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: '查證暫未完成' }) });
  });
  await page.route('**/api/trips/*/expenses', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    ids.push((route.request().postDataJSON() as { id: string }).id);
    expect((await route.fetch()).status()).toBe(201);
    return route.abort('failed');
  });
  const save = page.getByRole('button', { name: '儲存支出', exact: true });
  await save.click();
  await expect(page.getByText('保存結果尚未確認，請重新整理確認。', { exact: true })).toBeVisible();
  await expect(save).toBeDisabled(); await expect(page.getByLabel('金額', { exact: true })).toHaveValue('1200');
  lookupStatus = 503;
  await page.getByRole('button', { name: '重新查證', exact: true }).click();
  await expect(page.getByRole('button', { name: '重新查證', exact: true })).toBeEnabled();
  await expect(save).toBeDisabled(); expect(ids).toHaveLength(1); expect(lookups).toHaveLength(2);
  lookupStatus = 0;
  await page.getByRole('button', { name: '重新查證', exact: true }).click();
  await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
  expect(ids).toHaveLength(1); expect(lookups).toEqual([ids[0], ids[0], ids[0]]);
  expect((await world.db.query('SELECT id,amount_minor::text FROM expenses WHERE owner_id=$1', [world.users.get('甲')!.id])).rows).toEqual([{ id: ids[0], amount_minor: '1200' }]);
});

test('explicit 400, 403 and 409 rejections keep an editable draft without probing an unknown outcome', async ({ page, world }) => {
  await prepareDraft(page, world);
  let rejection = 400, probes = 0;
  const ids: string[] = [];
  await page.route('**/api/trips/*/expenses/*', async route => { if (route.request().method() === 'GET') probes++; return route.continue(); });
  await page.route('**/api/trips/*/expenses', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    ids.push((route.request().postDataJSON() as { id: string }).id);
    return route.fulfill({ status: rejection, contentType: 'application/json', body: JSON.stringify({ code: rejection === 400 ? 'VALIDATION_ERROR' : rejection === 403 ? 'REQUEST_ORIGIN_REJECTED' : 'ID_CONFLICT', message: `明確拒絕 ${rejection}` }) });
  });
  for (const status of [400, 403, 409]) {
    rejection = status;
    await page.getByRole('button', { name: '儲存支出', exact: true }).click();
    await expect(page.getByText(`明確拒絕 ${status}`, { exact: true })).toBeVisible();
    await expect(page.getByLabel('支出項目', { exact: true })).toBeEditable();
    await expect(page.getByRole('button', { name: '儲存支出', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: '重新查證', exact: true })).toHaveCount(0);
  }
  expect(probes).toBe(0); expect(ids).toHaveLength(3); expect(new Set(ids).size).toBe(1);
  expect((await world.db.query('SELECT id FROM expenses WHERE owner_id=$1', [world.users.get('甲')!.id])).rows).toEqual([]);
});

for (const method of ['PATCH', 'DELETE'] as const) {
  test(`${method} with an unavailable result is rechecked without issuing another mutation`, async ({ page, world }) => {
    const expense = await seedExpense(world, { item: '原午餐', amount: '100', currencyCode: 'JPY' });
    await login(page, world); await page.goto(`/trips/${expense.trip_id}/expenses/${expense.id}`);
    await expect(page.getByLabel('支出項目', { exact: true })).toHaveValue('原午餐');
    if (method === 'PATCH') await page.getByLabel('支出項目', { exact: true }).fill('已改名的午餐');
    let available = false, mutations = 0;
    const lookups: string[] = [];
    await page.route(`**/api/trips/${expense.trip_id}/expenses/${expense.id}`, async route => {
      if (route.request().method() === 'GET') {
        lookups.push(new URL(route.request().url()).pathname);
        if (available) return route.continue();
        return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL_ERROR', message: '暫不可查證' }) });
      }
      if (route.request().method() !== method) return route.continue();
      mutations++;
      expect((await route.fetch()).status()).toBe(method === 'PATCH' ? 200 : 204);
      return route.abort('failed');
    });
    if (method === 'DELETE') {
      await page.getByRole('button', { name: '刪除支出', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: '確認刪除', exact: true }).click();
      await expect(page.getByRole('dialog').getByRole('button', { name: '確認刪除', exact: true })).toBeDisabled();
    } else await page.getByRole('button', { name: '儲存支出', exact: true }).click();
    const context = method === 'DELETE' ? page.getByRole('dialog') : page.locator('main');
    await expect(context.getByText(`${method === 'PATCH' ? '保存' : '刪除'}結果尚未確認，請重新整理確認。`, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '儲存支出', exact: true })).toBeDisabled();
    available = true;
    await context.getByRole('button', { name: '重新查證', exact: true }).click();
    await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
    expect(mutations).toBe(1); expect(lookups.length).toBeGreaterThanOrEqual(2);
    const rows = (await world.db.query('SELECT item FROM expenses WHERE id=$1', [expense.id])).rows;
    expect(rows).toEqual(method === 'PATCH' ? [{ item: '已改名的午餐' }] : []);
  });
}
