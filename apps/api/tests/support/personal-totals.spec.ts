import { test, expect } from './fixtures.js';
import { callApi, seedIdentity } from './seed.js';
import { seedSplittingExpenses } from './splitting/expense-fixture.js';
import { splittingTripId } from './splitting/members-fixture.js';

test('personal totals sum exact owner shares across all pages, preserving historical scales and ownership', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    ...Array.from({ length: 101 }, (_, index) => ({
      項目: `Shared ${index}`,
      幣別: 'JPY',
      金額: '100',
      付款人: 'Amy',
      分攤者: 'Alice、Amy、Bob',
    })),
    { 項目: 'Owner advance only', 幣別: 'JPY', 金額: '600', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: 'Historical', 幣別: 'TWD', 金額: '12.30', 付款人: 'Alice', 分攤者: 'Alice、Amy' },
    { 項目: 'Current', 幣別: 'TWD', 金額: '1.23', 付款人: 'Amy', 分攤者: 'Alice、Amy' },
  ]);
  const tripId = splittingTripId(world);
  await world.db.query(
    "UPDATE expenses SET amount_minor=123,minor_unit=1 WHERE trip_id=$1 AND item='Historical'",
    [tripId],
  );
  const response = await callApi(world, 'GET', `/api/trips/${tripId}/totals?scope=personal`);

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({
    totals: [
      { currencyCode: 'JPY', amount: { numerator: '10100', denominator: '3', minorUnit: 0 } },
      { currencyCode: 'TWD', amount: { numerator: '1353', denominator: '2', minorUnit: 2 } },
    ],
  });
  const all = await callApi(world, 'GET', `/api/trips/${tripId}/totals`);

  expect(await all.json()).toEqual({
    totals: [
      { currencyCode: 'JPY', amount: '10700', minorUnit: 0 },
      { currencyCode: 'TWD', amount: '13.53', minorUnit: 2 },
    ],
  });
  await seedIdentity(world, '乙');
  expect(
    (
      await callApi(world, 'GET', `/api/trips/${tripId}/totals?scope=personal`, undefined, '乙')
    ).status(),
  ).toBe(404);
  expect(
    (
      await callApi(world, 'GET', `/api/trips/${tripId}/totals?scope=personal`, undefined, null)
    ).status(),
  ).toBe(401);
});
