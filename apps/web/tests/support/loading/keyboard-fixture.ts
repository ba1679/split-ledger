import { goToTripList, tripEditor } from '../home-navigation.js';
import { expect, type Page, type Locator } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { arrangeManagementPage, managementUI } from '../trips/management-fixture.js';
import { assertManagementUnchanged } from '../trips/management-assertions.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';

export async function tabTo(page: Page, target: Locator): Promise<void> {
  await expect(target).toBeVisible();
  for (let index = 0; index < 80; index++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target, 'Control must be reachable by native keyboard order').toBeFocused();
}

export async function arrangeKeyboard(
  page: Page,
  world: LedgerWorld,
  device: string,
): Promise<void> {
  expect(['手機', '桌面電腦']).toContain(device);
  await page.setViewportSize(
    device === '手機' ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await arrangeManagementPage(page, world, '帳本');
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
    true,
  );
  const before = await managementSnapshot(world);
  expect(before.thumbnails.length).toBe(1);
  expect(before.expenses.length).toBeGreaterThan(0);
  expect(before.repayments.length).toBeGreaterThan(0);
  await goToTripList(page);
  const trigger = tripEditor(page);
  await tabTo(page, trigger);
  await expect(trigger).toHaveAccessibleName('編輯 日本旅行');
  await expect(trigger).toBeFocused();
  world.set('loading:keyboard', {
    device,
    before,
    originalFocus: trigger,
    originalName: await trigger.getAttribute('aria-label'),
    startUrl: page.url(),
  });
  expect(managementUI(world).writes.length).toBe(0);
  await assertManagementUnchanged(world);
}
