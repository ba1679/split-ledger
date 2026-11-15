import { When, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';

When('owner 從 {string} 的我的旅行導覽進入垃圾桶', async ({ world }, device: string) => {
  expect(['手機', '桌面電腦']).toContain(device);
  expect(world.get('management:declaredDevice')).toBe(device);
  const { page } = managementUI(world);

  expect(page.viewportSize()).toEqual(
    device === '手機' ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  );
  if (device === '手機') {
    await page
      .getByRole('navigation', { name: '行動導覽', exact: true })
      .getByRole('button', { name: '我的旅行', exact: true })
      .click();
    await page.getByRole('link', { name: '垃圾桶', exact: true }).click();
  } else {
    await page
      .getByRole('navigation', { name: '主要導覽', exact: true })
      .getByRole('link', { name: '垃圾桶', exact: true })
      .click();
  }
  await expect(page).toHaveURL(/\/trips\/trash$/);
  world.set('management:trashNavigationDevice', device);
});
