import { goToTripList } from '../../../support/home-navigation.js';
import { When, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';

When('owner 從 {string} 的我的旅行導覽進入垃圾桶', async ({ world }, device: string) => {
  expect(['手機', '桌面電腦']).toContain(device);
  expect(world.get('management:declaredDevice')).toBe(device);
  const { page } = managementUI(world);

  expect(page.viewportSize()).toEqual(
    device === '手機' ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  );
  await goToTripList(page);
  await page.locator('main').getByRole('link', { name: '垃圾桶', exact: true }).click();
  await expect(page).toHaveURL(/\/trips\/trash$/);
  world.set('management:trashNavigationDevice', device);
});
