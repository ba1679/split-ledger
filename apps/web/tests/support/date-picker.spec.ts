import { test, expect } from './fixtures.js';
import { login } from './browser.js';
import { mkdir } from 'node:fs/promises';

test.beforeEach(async ({ page, world }) => {
  await login(page, world); await page.goto('/trips');
  await page.getByRole('button', { name: '新增旅行', exact: true }).click();
});

test('calendar handles leap-day and month boundary keyboard selection, nested Escape and focus trap', async ({ page }) => {
  const form = page.getByRole('dialog', { name: '新增旅行', exact: true });
  const input = form.getByLabel('開始日', { exact: true });
  const opener = form.getByRole('button', { name: '選擇開始日', exact: true });
  const picker = page.getByRole('dialog', { name: '選擇開始日', exact: true });
  await input.fill('2028/02/28'); await input.press('ArrowDown');
  await expect(picker.getByRole('button', { name: /^2028 年 2 月 28 日/ })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(picker.getByRole('button', { name: /^2028 年 2 月 29 日/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(picker).toBeHidden(); await expect(form).toBeVisible();
  await expect(input).toHaveValue('2028/02/29'); await expect(input).toBeFocused();
  await input.press('ArrowDown'); await page.keyboard.press('ArrowRight');
  await expect(picker.getByRole('button', { name: /^2028 年 3 月 1 日/ })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(input).toHaveValue('2028/03/01');
  await opener.click(); await page.keyboard.press('Escape');
  await expect(picker).toBeHidden(); await expect(form).toBeVisible(); await expect(opener).toBeFocused();
  await opener.click();
  const first = picker.getByRole('button', { name: '選擇年份與月份', exact: true });
  const last = picker.getByRole('button', { name: '回到今天', exact: true });
  await first.focus(); await page.keyboard.press('Shift+Tab'); await expect(last).toBeFocused();
  await page.keyboard.press('Tab'); await expect(first).toBeFocused();
  // A click on the calendar backdrop closes only its topmost native dialog.
  await page.mouse.click(2, 2);
  await expect(picker).toBeHidden(); await expect(form).toBeVisible(); await expect(opener).toBeFocused();
});

test('calendar repositions across five and six week months and year/month navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 680 });
  const form = page.getByRole('dialog', { name: '新增旅行', exact: true });
  await form.getByLabel('開始日', { exact: true }).fill('2027/04/15');
  await form.getByRole('button', { name: '選擇開始日', exact: true }).click();
  const picker = page.getByRole('dialog', { name: '選擇開始日', exact: true });
  await picker.getByRole('button', { name: '下一個月', exact: true }).click();
  await expect(picker.getByRole('grid')).toHaveAccessibleName('2027 年 5 月');
  await expect(picker.locator('tbody tr')).toHaveCount(6);
  let box = (await picker.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(12); expect(box.y).toBeGreaterThanOrEqual(12);
  expect(box.y + box.height).toBeLessThanOrEqual(668);
  await picker.getByRole('button', { name: '選擇年份與月份', exact: true }).click();
  await picker.getByRole('button', { name: '下一年', exact: true }).click();
  await picker.getByRole('button', { name: '2 月', exact: true }).click();
  await expect(picker.getByRole('grid')).toHaveAccessibleName('2028 年 2 月');
  box = (await picker.boundingBox())!; expect(box.y + box.height).toBeLessThanOrEqual(668);
  await picker.getByRole('button', { name: /^2028 年 2 月 29 日/ }).click();
  await expect(form).toBeVisible(); await expect(form.getByLabel('開始日', { exact: true })).toHaveValue('2028/02/29');
  await form.getByRole('button', { name: '清除開始日', exact: true }).click();
  await expect(form.getByLabel('開始日', { exact: true })).toHaveValue('');
});

test('320 by 568 mobile sheet keeps six-week month touch targets, scrolling and selection usable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const form = page.getByRole('dialog', { name: '新增旅行', exact: true });
  const startBox = (await form.getByLabel('開始日', { exact: true }).boundingBox())!;
  const endBox = (await form.getByLabel('結束日', { exact: true }).boundingBox())!;
  expect(endBox.y).toBeGreaterThanOrEqual(startBox.y + startBox.height);
  expect(endBox.x).toBe(startBox.x);
  await form.getByLabel('開始日', { exact: true }).fill('2027/05/15');
  await form.getByRole('button', { name: '選擇開始日', exact: true }).click();
  const picker = page.getByRole('dialog', { name: '選擇開始日', exact: true });
  await expect(picker.getByRole('button', { name: /^2027 年 5 月 15 日/ })).toBeFocused();
  await expect(picker.locator('tbody tr')).toHaveCount(6);
  const geometry = await picker.evaluate(dialog => {
    const box = dialog.getBoundingClientRect();
    const cells = [...dialog.querySelectorAll('.calendar-day')].map(button => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height }));
    return { left: box.left, right: box.right, bottom: box.bottom, width: dialog.clientWidth, scrollWidth: dialog.scrollWidth, cells, pageWidth: document.documentElement.scrollWidth };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0); expect(geometry.right).toBeLessThanOrEqual(320);
  expect(geometry.bottom).toBeLessThanOrEqual(568); expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width);
  expect(geometry.pageWidth).toBeLessThanOrEqual(320);
  expect(geometry.cells.every(cell => cell.width >= 44 && cell.height >= 44)).toBe(true);
  await expect(page.getByRole('navigation', { name: '行動導覽' })).toBeHidden();
  const screenshotDirectory = new URL('../../../../.cache/ui-validation/', import.meta.url);
  await mkdir(screenshotDirectory, { recursive: true });
  const screenshotPath = new URL(`calendar-320x568-${testInfo.project.name}.png`, screenshotDirectory);
  const screenshot = await page.screenshot({ path: screenshotPath.pathname });
  await testInfo.attach('calendar-320x568', { body: screenshot, contentType: 'image/png' });
  await picker.getByRole('button', { name: /^2027 年 5 月 31 日/ }).click();
  await expect(picker).toBeHidden(); await expect(form).toBeVisible();
  await expect(form.getByLabel('開始日', { exact: true })).toHaveValue('2027/05/31');
  await form.getByRole('button', { name: '選擇開始日', exact: true }).click();
  await picker.getByRole('button', { name: '回到今天', exact: true }).click();
  const today = await page.evaluate(() => { const date = new Date(); return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`; });
  await expect(form.getByLabel('開始日', { exact: true })).toHaveValue(today);
});
