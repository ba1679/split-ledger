import { tripEditor } from '../home-navigation.js';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementUI } from '../trips/management-fixture.js';
import { assertManagementUnchanged } from '../trips/management-assertions.js';
import { tabTo } from './keyboard-fixture.js';

export async function openTrashByKeyboard(world: LedgerWorld): Promise<void> {
  const page = managementUI(world).page;
  const trigger = tripEditor(page);
  await tabTo(page, trigger);
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  const item = menu.getByRole('menuitem', { name: '移至垃圾桶', exact: true });
  await expect(item).toBeVisible();
  for (let index = 0; index < 8; index++) {
    if (await item.evaluate((element) => element === document.activeElement)) break;
    await page.keyboard.press('ArrowDown');
  }
  await expect(item).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(menu).toHaveCount(0);
  world.set('loading:keyboardTrashOpened', true);
  await assertManagementUnchanged(world);
}
