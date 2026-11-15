import { When, expect } from '../../../support/fixtures.js';
import type { NewTripDraft } from '../../../support/trips/new-trip-fixture.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { newTripFields } from '../../../support/trips/uncommitted-new-trip.js';
import { assertDraftUrlsReleased } from '../../../support/thumbnail/object-urls.js';

When('owner 移除新增表單的選圖', async ({ world }) => {
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');
  const prior = world.get<NewTripDraft>('management:newTripDraft');
  const fields = newTripFields(world);

  await dialog.getByRole('button', { name: '移除選圖', exact: true }).click();
  await expect
    .poll(() =>
      dialog
        .locator('input[type="file"]')
        .evaluateAll((inputs) =>
          inputs.every((input) => ((input as HTMLInputElement).files?.length ?? 0) === 0),
        ),
    )
    .toBe(true);
  await assertDraftUrlsReleased(page);
  world.set('management:removedNewTripPhoto', { prior, fields });
  const { file: _file, ...rest } = prior;

  world.set('management:newTripDraft', { ...rest, photo: '無' } satisfies NewTripDraft);
});
