import { goToTripList, tripEditor } from '../../../support/home-navigation.js';
import { When, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';

When('owner 選擇旅行操作 {string}', async ({ world }, operation: string) => {
  const { page } = managementUI(world);
  if (operation === '管理旅行') await goToTripList(page);
  const actions = {
    管理旅行: tripEditor(page),
    自訂旅行縮圖: page.getByRole('menuitem', { name: '更換縮圖', exact: true }),
    移至垃圾桶: page.getByRole('menuitem', { name: '移至垃圾桶', exact: true }),
    永久刪除: page.getByRole('button', { name: '永久刪除', exact: true }),
    確認移入: page.getByRole('dialog').getByRole('button', { name: '移至垃圾桶', exact: true }),
    復原: page.getByRole('button', { name: '復原旅行', exact: true }),
    確認永久刪除: page.getByRole('dialog').getByRole('button', { name: '永久刪除', exact: true }),
    保存圖片: page.getByRole('dialog').getByRole('button', { name: '保存圖片', exact: true }),
  };

  expect(Object.keys(actions)).toContain(operation);
  await actions[operation as keyof typeof actions].click();
  world.set('management:uiAct', {
    operation,
    url: page.url(),
    focus: await page.evaluate(
      () =>
        document.activeElement?.getAttribute('aria-label') ??
        document.activeElement?.textContent ??
        null,
    ),
  });
});
