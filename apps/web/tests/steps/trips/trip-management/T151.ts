import { When } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';

When('owner 嘗試提交仍有選圖錯誤的新增旅行', async ({ world }) => {
  const ui = managementUI(world),
    dialog = ui.page.getByRole('dialog');
  const fields = {
    name: await dialog.getByRole('textbox', { name: '旅行名稱', exact: true }).inputValue(),
    start: await dialog.getByRole('textbox', { name: /^開始日/ }).inputValue(),
    end: await dialog.getByRole('textbox', { name: /^結束日/ }).inputValue(),
  };
  world.set('management:invalidNewTripSubmit', { fields, writes: ui.writes.length });
  // Real keyboard submission attempt exercises the disabled-submit/form validation guard.
  await dialog.getByRole('textbox', { name: '旅行名稱', exact: true }).press('Enter');
});
