import { Then, expect } from '../../support/fixtures.js';
import { readLedger } from '../../support/expense-helpers.js';

Then('畫面顯示 TWD 總額不再包含機票', async ({ page, world }) => {
  const ledger = await readLedger(world);

  expect(ledger.totals.some((x) => x.currencyCode === 'TWD')).toBe(false);
  expect(ledger.stored.filter((x) => x.currency_code === 'TWD')).toEqual([]);
  const flight = ledger.list.items.find((x) => x.item === '機票');

  expect(flight).toMatchObject({ currencyCode: 'JPY', amount: '8000' });
  await expect(
    page
      .getByRole('region', { name: '分幣別總額' })
      .getByRole('group', { name: 'TWD', exact: true }),
  ).toHaveCount(0);
});
