import { When, expect } from '../../../support/fixtures.js';
import type { ThumbnailConflict } from '../../../support/thumbnail/conflict-fixture.js';
import { observedThumbnailCommand } from '../../../support/thumbnail/browser-command.js';
import { managementUI } from '../../../support/trips/management-fixture.js';

When('owner 提交目前圖片草稿', async ({ world }) => {
  const { page } = managementUI(world);
  await page.getByRole('dialog').getByRole('button', { name: '保存圖片', exact: true }).click();
  const observed = await observedThumbnailCommand(world, '神社照片');
  expect(observed.response.status()).toBe(409);
  const conflict = world.get<ThumbnailConflict>('management:thumbnailConflict');
  expect(conflict.otherOperations).not.toContain(observed.command.operationId);
  world.set('management:originalOperationId', observed.command.operationId);
  world.set('management:conflictRejected', observed);
});
