import { expect, type Browser, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { OperationWait } from './operation-wait.js';
import { renderedImage } from '../thumbnail/rendered-image.js';

export async function assertOperationView(
  browser: Browser,
  page: Page,
  world: LedgerWorld,
  state: OperationWait,
): Promise<void> {
  const op = state.operation;
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByText(/結果(?:尚未確認|無法確認)|重新查證|再次查證/)).toHaveCount(0);
  const context = await browser.newContext({
    baseURL: world.get<string>('webOrigin'),
    viewport:
      page.viewportSize()!.width === 390
        ? { width: 1440, height: 900 }
        : { width: 390, height: 844 },
  });
  try {
    await context.addCookies(await page.context().cookies());
    const fresh = await context.newPage();
    const freshWrites: string[] = [];
    const pendingReads = new Set<import('@playwright/test').Request>();
    fresh.on('request', (request) => {
      if (!new URL(request.url()).pathname.startsWith('/api/')) return;
      if (request.method() === 'GET') pendingReads.add(request);
      else freshWrites.push(request.method());
    });
    const finished = (request: import('@playwright/test').Request) => {
      pendingReads.delete(request);
    };
    fresh.on('requestfinished', finished);
    fresh.on('requestfailed', finished);
    const navigate = async (route: string) => {
      const path = route.endsWith('/expenses/new')
        ? route.replace('/expenses/new', '/members')
        : route;
      const result = fresh.waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          new URL(response.url()).pathname === `/api${path}`,
      );
      await fresh.goto(route);
      const response = await result;
      expect(response.status()).toBe(200);
      expect(await response.finished()).toBeNull();
      await expect.poll(() => pendingReads.size).toBe(0);
      await expect(fresh.locator('[aria-busy="true"]')).toHaveCount(0);
    };

    const tripId = state.committedTripId!;
    if (['建立旅行', '保存旅行名稱與日期'].includes(op)) {
      const name = op === '建立旅行' ? '京都賞楓' : '京都旅行';
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await navigate(`/trips/${tripId}`);
      await expect(fresh.getByRole('heading', { name, exact: true })).toBeVisible();
      if (op === '保存旅行名稱與日期') {
        await expect(fresh.getByText('2027-03-10 — 2027-03-15', { exact: true })).toBeVisible();
      }
    } else if (['移至垃圾桶', '復原旅行', '永久刪除旅行'].includes(op)) {
      const message =
        op === '移至垃圾桶'
          ? /已移(?:至|入)垃圾桶|移至垃圾桶成功/
          : op === '復原旅行'
            ? /已復原|復原成功|已回到一般旅行/
            : /已永久刪除|永久刪除(?:完成|成功)/;
      await expect(page.getByRole('status').filter({ hasText: message }).first()).toBeVisible();
      await navigate(op === '移至垃圾桶' ? '/trips/trash' : '/trips');
      const heading = fresh.getByRole('heading', { name: '日本旅行', exact: true });
      if (op === '永久刪除旅行') await expect(heading).toHaveCount(0);
      else await expect(heading).toBeVisible();
    } else if (['保存新縮圖', '更換縮圖', '保存預覽的預設縮圖'].includes(op)) {
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await navigate('/trips');
      const card = fresh.locator(`a[href="/trips/${tripId}"]`);
      await expect(card).toBeVisible();
      if (op === '保存預覽的預設縮圖') {
        await expect(card.locator('img[src*="/thumbnail/"]')).toHaveCount(0);
        await expect(card.locator('.landscape:visible,[role="img"]:visible').first()).toBeVisible();
      } else {
        const image = card.locator('img[src*="/thumbnail/"]');
        const visual = await renderedImage(image);
        expect(visual).toMatchObject({ width: 64, height: 48 });
        for (const [index, expected] of [67, 140, 161].entries())
          expect(Math.abs(visual.rgba[index]! - expected)).toBeLessThanOrEqual(20);
      }
    } else if (['新增支出', '修改支出', '刪除支出'].includes(op)) {
      await expect(page).toHaveURL(new RegExp(`/trips/${tripId}/?$`));
      await navigate(`/trips/${tripId}`);
      const id = state.targetId ?? world.get<{ id: string }>('loading:operationRequest').id;
      const row = fresh.locator(`a[href="/trips/${tripId}/expenses/${id}"]`);
      if (op === '刪除支出') {
        await expect(row).toHaveCount(0);
        await expect(fresh.getByText('點心', { exact: true })).toHaveCount(0);
      } else {
        await expect(row).toContainText('點心');
        await expect(row).toContainText(op === '新增支出' ? 'JPY 100' : 'JPY 200');
        await expect(row).toContainText('2027-03-11');
      }
    } else if (['新增分類', '修改分類', '刪除未被引用的分類'].includes(op)) {
      const name = op === '修改分類' ? '餐食' : '伴手禮';
      if (op === '刪除未被引用的分類')
        await expect(page.getByText(name, { exact: true })).toHaveCount(0);
      if (op !== '刪除未被引用的分類')
        await expect(page.getByText(name, { exact: true })).toBeVisible();
      await navigate('/categories');
      if (op === '刪除未被引用的分類')
        await expect(fresh.getByText(name, { exact: true })).toHaveCount(0);
      else await expect(fresh.getByText(name, { exact: true })).toBeVisible();
    } else if (
      ['新增同行者', '修改同行者名稱', '停用同行者', '啟用同行者', '刪除未被引用的同行者'].includes(
        op,
      )
    ) {
      await navigate(`/trips/${tripId}/members`);
      const name =
        op === '修改同行者名稱'
          ? '小艾'
          : op.includes('未被引用') || op === '新增同行者'
            ? 'Carol'
            : 'Amy';
      const currentRow = page
        .getByRole('listitem')
        .filter({ has: page.getByText(name, { exact: true }) });
      if (op === '刪除未被引用的同行者') await expect(currentRow).toHaveCount(0);
      else {
        await expect(currentRow).toBeVisible();
        if (['停用同行者', '啟用同行者'].includes(op))
          await expect(currentRow).toContainText(op === '停用同行者' ? '已停用' : '啟用中');
      }
      const row = fresh
        .getByRole('listitem')
        .filter({ has: fresh.getByText(name, { exact: true }) });
      if (op === '刪除未被引用的同行者') await expect(row).toHaveCount(0);
      else {
        await expect(row).toBeVisible();
        if (['停用同行者', '啟用同行者'].includes(op))
          await expect(row).toContainText(op === '停用同行者' ? '已停用' : '啟用中');
      }
      if (['停用同行者', '啟用同行者'].includes(op)) {
        await navigate(`/trips/${tripId}/expenses/new`);
        const selectable = fresh.getByRole('checkbox', { name: 'Amy', exact: true });
        if (op === '停用同行者') await expect(selectable).toHaveCount(0);
        else await expect(selectable).toBeEnabled();
      }
    } else if (op === '切換簡化付款') {
      await expect(page.getByRole('switch', { name: '簡化付款', exact: true })).toBeChecked();
      await navigate(`/trips/${tripId}/settlement`);
      await expect(fresh.getByRole('switch', { name: '簡化付款', exact: true })).toBeChecked();
    } else {
      if (op === '保存實付結清')
        await expect(page.getByRole('status').filter({ hasText: /結清成功/ })).toBeVisible();
      else await expect(page).toHaveURL(new RegExp(`/trips/${tripId}/settlement`));
      await navigate(`/trips/${tripId}/settlement`);
      const record = fresh
        .getByRole('list', { name: '還款紀錄', exact: true })
        .getByRole('listitem')
        .filter({ hasText: '2027-03-12' });
      await expect(record).toHaveCount(1);
      await expect(record).toContainText(op === '記錄獨立還款' ? 'JPY 40' : 'JPY 100');
      await expect(record).toContainText('Amy');
      await expect(record).toContainText('Alice');
    }
    expect(freshWrites).toEqual([]);
  } finally {
    await context.close();
  }
}
