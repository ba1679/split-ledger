import { Then, expect } from '../../../support/fixtures.js';
import type { NewTripDraft } from '../../../support/trips/new-trip-fixture.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import {
  assertNewTripFields,
  assertNewTripNotCreated,
} from '../../../support/trips/uncommitted-new-trip.js';
import { assertDraftUrlsReleased } from '../../../support/thumbnail/object-urls.js';

Then('新增草稿不含照片且建立入口可用', async ({ world }) => {
  const draft = world.get<NewTripDraft>('management:newTripDraft');
  const removed = world.get<{ prior: NewTripDraft }>('management:removedNewTripPhoto');
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');

  expect(draft.photo).toBe('無');
  expect(draft.file).toBeUndefined();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0);
  await expect(dialog.getByText(removed.prior.file!.name, { exact: true })).toHaveCount(0);
  await expect(dialog.locator('img[src^="blob:"]:visible')).toHaveCount(0);
  expect(
    await dialog
      .locator('input[type="file"]')
      .evaluateAll((inputs) =>
        inputs.every((input) => ((input as HTMLInputElement).files?.length ?? 0) === 0),
      ),
  ).toBe(true);
  await assertNewTripFields(world);
  await expect(dialog.getByRole('button', { name: '建立旅行', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: '建立旅行', exact: true }).click({ trial: true });
  await assertDraftUrlsReleased(page);
  await assertNewTripNotCreated(world);
});
