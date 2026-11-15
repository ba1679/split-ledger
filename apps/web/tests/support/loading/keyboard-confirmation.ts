import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementUI } from '../trips/management-fixture.js';
import { assertManagementUnchanged } from '../trips/management-assertions.js';

export async function assertKeyboardConfirmation(world: LedgerWorld): Promise<void> {
  const page = managementUI(world).page;
  expect(world.get('loading:keyboardTrashOpened')).toBe(true);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAccessibleName(/移至垃圾桶/);
  await expect(dialog).toHaveAccessibleDescription(/日本旅行/);
  await expect(dialog).toHaveAccessibleDescription(/復原|還原/);
  await expect(dialog).toContainText(/移至垃圾桶/);
  const cancel = dialog.getByRole('button', { name: '取消', exact: true });
  await expect(cancel).toBeFocused();
  await expect(dialog.getByRole('button', { name: '移至垃圾桶', exact: true })).toBeEnabled();
  const controls = dialog
    .locator(
      'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
    )
    .filter({ visible: true });
  const count = await controls.count();
  expect(count).toBeGreaterThanOrEqual(2);
  for (const key of ['Tab', 'Shift+Tab']) {
    const reached = new Set<number>();
    for (let index = 0; index < count * 2; index++) {
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(
        true,
      );
      const focused = await controls.evaluateAll((elements) =>
        elements.findIndex((element) => element === document.activeElement),
      );
      expect(focused).toBeGreaterThanOrEqual(0);
      reached.add(focused);
      await expect(controls.nth(focused)).toBeVisible();
      await page.keyboard.press(key);
    }
    expect(
      reached.size,
      'Every visible confirmation control is reachable and focus stays trapped',
    ).toBe(count);
  }
  expect(
    await dialog
      .locator('svg,[aria-hidden="true"],img')
      .evaluateAll(
        (elements) =>
          elements
            .filter((element) => element instanceof HTMLElement || element instanceof SVGElement)
            .filter((element) => (element as HTMLElement).tabIndex >= 0).length,
      ),
  ).toBe(0);
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
    true,
  );
  await assertManagementUnchanged(world);
}
