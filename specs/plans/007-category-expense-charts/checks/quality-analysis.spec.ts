import { test } from '../../../../apps/web/tests/support/fixtures.js';
import { expect } from '@playwright/test';
import { arrangeAnalysisRows } from '../../../../apps/web/tests/support/category-analysis/arrange.js';
import { openConfirmedBrowserAnalysis, openBrowserCategoryInfo } from '../../../../apps/web/tests/support/category-analysis/page.js';
import { writeFile } from 'node:fs/promises';
const prefix = process.env.QUALITY_CAPTURE_PREFIX ?? 'T131';

test('analysis console and accessibility diagnostics', async ({ page, world, analysisViewport }, info) => {
  const diagnostics: string[] = [];
  page.on('pageerror', (error) => diagnostics.push(error.message));
  page.on('console', (message) => { if (['warning', 'warn', 'error'].includes(message.type())) diagnostics.push(`${message.type()}: ${message.text()}`); });
  await arrangeAnalysisRows(page, world, [
    { 項目: '餐點', 分類: '餐飲', 幣別: 'TWD', 金額: '120', 付款人: 'Alice', 分攤者: 'Alice、Amy' },
    { 項目: '車資', 分類: '交通', 幣別: 'TWD', 金額: '80', 付款人: 'Amy', 分攤者: 'Alice、Amy' },
  ], analysisViewport);
  await openConfirmedBrowserAnalysis(page, world);
  await expect(page.getByRole('heading', { level: 1, name: '花費分析', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: '統計幣別', exact: true })).toHaveValue('TWD');
  const personal = page.getByRole('region', { name: '個人花費', exact: true });
  const trigger = personal.getByRole('button', { name: '餐飲 TWD 60 60%', exact: true });
  await trigger.focus();
  await trigger.press('Enter');
  const dialog = page.getByRole('dialog', { name: '分類資訊', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: '關閉分類資訊', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  expect(await page.locator('.analysis-page button button,.analysis-page a a').count()).toBe(0);
  const duplicateIds = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll('[id]')).map((el) => el.id);
    return ids.filter((id, i) => ids.indexOf(id) !== i);
  });
  expect(duplicateIds).toEqual([]);
  const tree = await page.locator('main').ariaSnapshot();
  expect(tree).toContain('餐飲 TWD 60 60%');
  expect(tree).toContain('團體花費');
  expect(diagnostics).toEqual([]);
  await writeFile(`specs/plans/007-category-expense-charts/checks/${prefix}-${info.project.name}-diagnostics.json`, JSON.stringify({ diagnostics, duplicateIds, accessibilityTree: tree, viewport: page.viewportSize() }, null, 2)+'\n');
});

test('long unbroken category keeps information and close control within viewport', async ({ page, world, analysisViewport }, info) => {
  const name = 'W'.repeat(30);
  await arrangeAnalysisRows(page, world, [{ 項目: '大額支出', 分類: name, 幣別: 'USD', 金額: '123456789012.34', 付款人: 'Alice', 分攤者: 'Alice' }], analysisViewport);
  await openConfirmedBrowserAnalysis(page, world);
  await openBrowserCategoryInfo(page, world, '個人', name);
  const panel = page.getByRole('dialog', { name: '分類資訊', exact: true });
  const close = panel.getByRole('button', { name: '關閉分類資訊', exact: true });
  const label = panel.locator('.analysis-info-name');
  const geometry = { panel: (await panel.boundingBox())!, close: (await close.boundingBox())!, label: (await label.boundingBox())!, viewport: page.viewportSize()! };
  await page.screenshot({ path: `specs/plans/007-category-expense-charts/checks/screens/${prefix}-${info.project.name}-long-information.png`, scale: 'css' });
  await writeFile(`specs/plans/007-category-expense-charts/checks/${prefix}-${info.project.name}-long-information.json`, JSON.stringify(geometry, null, 2)+'\n');
  expect(geometry.close.width).toBeGreaterThanOrEqual(44);
  expect(geometry.close.height).toBeGreaterThanOrEqual(44);
  expect(geometry.close.x + geometry.close.width).toBeLessThanOrEqual(geometry.panel.x + geometry.panel.width);
  expect(geometry.label.x + geometry.label.width).toBeLessThanOrEqual(geometry.close.x);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await close.click();
  await expect(panel).toHaveCount(0);
});
