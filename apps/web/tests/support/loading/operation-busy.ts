import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import { managementUI } from '../trips/management-fixture.js';
import type { OperationWait } from './operation-wait.js';
import { assertSpinnerOnly } from './spinner-result.js';

export async function assertOperationBusy(world: LedgerWorld): Promise<void> {
  const state = world.get<OperationWait>('loading:operation'),
    ui = managementUI(world);
  expect(state.exchanges.length).toBe(1);
  expect(state.finished).toBe(0);
  expect(state.released).toBe(false);
  await expect(state.control).toHaveAccessibleName(state.name);
  await expect(state.control).toHaveAttribute('aria-busy', 'true');
  await expect(state.control).toBeFocused();
  const box = await state.control.boundingBox();
  expect(box).not.toBeNull();
  for (const key of ['x', 'y', 'width', 'height'] as const)
    expect(
      Math.abs(box![key] - state.box![key]),
      `Busy control ${key} must stay stable`,
    ).toBeLessThanOrEqual(1);
  const spinner = state.control.locator('[role="status"]');
  await assertSpinnerOnly(spinner, /\S/);
  const graphic = await spinner.evaluate((element) => {
    const node = [element, ...element.querySelectorAll('*')].find((candidate) => {
      const bounds = candidate.getBoundingClientRect(),
        style = getComputedStyle(candidate);

      return (
        bounds.width >= 8 &&
        bounds.height >= 8 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        (candidate instanceof SVGElement ||
          [
            style.borderTopWidth,
            style.borderRightWidth,
            style.borderBottomWidth,
            style.borderLeftWidth,
          ].some((width) => parseFloat(width) > 0))
      );
    });
    if (!node) throw new Error('Busy spinner graphic missing');
    const bounds = node.getBoundingClientRect();

    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
  });
  expect(Math.abs(graphic.x + graphic.width / 2 - box!.x - box!.width / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(graphic.y + graphic.height / 2 - box!.y - box!.height / 2)).toBeLessThanOrEqual(
    1,
  );
  expect(await state.control.innerText()).not.toMatch(
    /載入|處理中|儲存中|保存中|刪除中|送出中|\d+%/,
  );
  await expect(ui.page.getByRole('progressbar')).toHaveCount(0);
  await expect(
    ui.page
      .getByRole('status')
      .filter({ hasText: /保存成功|儲存成功|新增成功|刪除成功|已建立旅行|已成功/ }),
  ).toHaveCount(0);
  const recorded = world.get<{
    body: Record<string, unknown>;
    effectiveBody?: Record<string, unknown>;
  }>('loading:operationRequest');
  const body = recorded.effectiveBody ?? recorded.body;
  if (['新增支出', '修改支出'].includes(state.operation)) {
    await expect(ui.page.getByLabel('支出項目', { exact: true })).toHaveValue(String(body.item));
    await expect(ui.page.getByLabel('支出金額', { exact: true })).toHaveValue(String(body.amount));
    await expect(ui.page.getByRole('textbox', { name: '支出日期', exact: true })).toHaveValue(
      String(body.spentOn).replaceAll('-', '/'),
    );
  } else if (state.operation === '建立旅行' || state.operation === '保存旅行名稱與日期')
    await expect(ui.page.getByLabel('旅行名稱', { exact: true })).toHaveValue(String(body.name));
  else if (['新增分類', '修改分類'].includes(state.operation))
    await expect(ui.page.getByLabel('分類名稱', { exact: true })).toHaveValue(String(body.name));
  else if (state.operation === '記錄獨立還款')
    await expect(ui.page.getByLabel('金額', { exact: true })).toHaveValue('40');
  else if (state.operation === '保存實付結清')
    await expect(ui.page.getByLabel('實付金額', { exact: true })).toHaveValue('100');
  expect(ui.writes.length).toBe(1);
  expect(await managementSnapshot(world, state.committedTripId)).toEqual(state.after);
  expect(state.errors.map(String)).toEqual([]);
}
