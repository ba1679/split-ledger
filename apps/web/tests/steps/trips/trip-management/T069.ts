import { Given, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';

Given('管理旅行選單已展開', async ({ world }) => {
  const ui = managementUI(world);
  const trigger = ui.page.getByRole('button', { name: '管理旅行', exact: true });

  await trigger.focus();
  world.set('management:menuTrigger', trigger);
  await trigger.click();
  await expect(ui.page.getByRole('menu')).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(ui.writes).toEqual([]);
  const snapshot = await managementSnapshot(world);

  expect(snapshot.trips[0]!.deleted_at).toBeNull();
  expect(snapshot).toEqual(world.get('management:before'));
});
