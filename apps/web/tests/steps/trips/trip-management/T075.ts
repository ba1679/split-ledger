import { When, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';

When('owner 以 {string} 關閉 {string}', async ({ world }, method: string, editor: string) => {
  expect(['取消', 'X', 'Escape']).toContain(method);
  const names: Record<string, RegExp> = {
    移入確認: /日本旅行.*垃圾桶/,
    永久刪除確認: /永久刪除.*日本旅行/,
    縮圖編輯: /自訂旅行縮圖/,
    新增表單: /新增旅行/,
  };

  expect(names[editor]).toBeDefined();
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');

  await expect(dialog).toHaveAccessibleName(names[editor]!);
  if (method === 'Escape') await page.keyboard.press('Escape');
  else
    await dialog
      .getByRole('button', { name: method === 'X' ? '關閉' : '取消', exact: true })
      .click();
  await expect(dialog).toBeHidden();
  world.set('management:closedDialog', {
    method,
    editor,
    url: page.url(),
    focus: await page.evaluate(
      () =>
        document.activeElement?.getAttribute('aria-label') ??
        document.activeElement?.textContent ??
        null,
    ),
  });
});
