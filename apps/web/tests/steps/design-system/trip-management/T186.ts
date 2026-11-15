import { When, expect } from '../../../support/fixtures.js';
import { optionRegion, assertOptionDraft } from '../../../support/loading/option-wait.js';
import { awaitInitialReadHeld, type InitialRead } from '../../../support/loading/initial-read.js';
import { managementUI } from '../../../support/trips/management-fixture.js';

When('owner 檢視新增支出選項', async ({ page, world }) => {
  const state = world.get<InitialRead>('loading:initial');
  const region = optionRegion(page, state.content);
  await expect(region).toBeVisible();
  // Inspect through a genuine focusable option/control or its accessible help,
  // without imposing tabindex on a semantic region/group container.
  const controls = region
    .locator(
      'input:not(:disabled):not([tabindex="-1"]),select:not(:disabled):not([tabindex="-1"]),button:not(:disabled):not([tabindex="-1"]),a[href]:not([tabindex="-1"]),[tabindex="0"]',
    )
    .filter({ visible: true });
  const focusTarget = (await region.getAttribute('tabindex')) === '0' ? region : controls.first();
  await expect(focusTarget).toBeVisible();
  await expect(focusTarget).toHaveAccessibleName(/\S/);
  await focusTarget.focus();
  await expect(focusTarget).toBeFocused();
  expect(state.finished).toBe(0);
  expect(state.released).toBe(false);
  await awaitInitialReadHeld(world);
  expect(managementUI(world).writes.length).toBe(0);
  await assertOptionDraft(world);
});
