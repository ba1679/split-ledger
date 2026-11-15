import { Then, expect } from '../../../support/fixtures.js';
import type { NewTripDraft } from '../../../support/trips/new-trip-fixture.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { assertManagementUnchanged } from '../../../support/trips/management-assertions.js';
import { objectUrls, assertDraftUrlsReleased } from '../../../support/thumbnail/object-urls.js';

Then('新增表單及選圖草稿已放棄且旅行不存在', async ({ world }) => {
  const ui = managementUI(world);
  const { page } = ui;
  const draft = world.get<NewTripDraft>('management:newTripDraft');
  const ownerId = world.users.get('Alice')!.id;

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page).toHaveURL(ui.startUrl);
  await expect(page.getByRole('button', { name: '新增旅行', exact: true })).toBeFocused();
  expect(ui.writes.length).toBe(0);
  expect(
    (
      await world.db.query('SELECT id FROM trips WHERE owner_id=$1 AND name=$2', [
        ownerId,
        draft.name,
      ])
    ).rows,
  ).toEqual([]);
  const oldIds = world.get<string[]>('management:newTripIdsBefore');
  const ids = (
    await world.db.query('SELECT id FROM trips WHERE owner_id=$1 ORDER BY id', [ownerId])
  ).rows.map((row: { id: string }) => row.id);
  const reservations = (
    await world.db.query(
      'SELECT trip_id FROM trip_id_reservations WHERE owner_id=$1 ORDER BY trip_id',
      [ownerId],
    )
  ).rows.map((row: { trip_id: string }) => row.trip_id);

  expect(ids).toEqual(oldIds);
  expect(reservations).toEqual(oldIds);
  expect(draft.file).toBeDefined();
  await expect(page.getByText(draft.file!.name, { exact: true })).toHaveCount(0);
  expect((await objectUrls(page)).length).toBeGreaterThan(0);
  await assertDraftUrlsReleased(page);
  await assertManagementUnchanged(world);
});
