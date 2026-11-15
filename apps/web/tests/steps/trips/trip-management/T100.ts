import { When, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { selectNewTripPhoto } from '../../../support/trips/new-trip-fixture.js';

When('owner 在新增表單選擇 {string}', async ({ world }, photo: string) => {
  expect(['合法神社', '不合法HEIC']).toContain(photo);
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');
  const fields = {
    name: await dialog.getByRole('textbox', { name: '旅行名稱', exact: true }).inputValue(),
    start: await dialog.getByRole('textbox', { name: /^開始日/ }).inputValue(),
    end: await dialog.getByRole('textbox', { name: /^結束日/ }).inputValue(),
  };
  const ownerId = world.users.get('Alice')!.id;
  const ids = (
    await world.db.query('SELECT id FROM trips WHERE owner_id=$1 ORDER BY id', [ownerId])
  ).rows.map((row: { id: string }) => row.id);
  const file = await selectNewTripPhoto(world, photo);

  world.set('management:newTripSelection', { photo, file, fields, ids });
});
