import { Then, expect } from '../../support/fixtures.js';
import { callApi } from '../../support/seed.js';
import { splittingTripId, splittingMemberId } from '../../support/splitting/members-fixture.js';
import {
  snapshotSplittingSources,
  independentSplittingOracle,
} from '../../support/splitting/expense-fixture.js';
import type { SourceSnapshot } from '../../support/splitting/types.js';

Then('該安排只記錄部分還款且剩餘應付為 JPY {string}', async ({ world }, amount: string) => {
  expect(world.response!.status()).toBe(201);
  const body = await world.response!.json();
  const [numerator, denominator = '1'] = amount.split('/');
  const expected = { numerator: numerator!, denominator, minorUnit: 0 };

  expect(body.kind).toBe('partial');
  expect(independentSplittingOracle.equal(body.remainingAmount, expected)).toBe(true);
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = await snapshotSplittingSources(world);

  expect(after.expenses).toEqual(before.expenses);
  expect(after.shares).toEqual(before.shares);
  expect(after.settlements).toEqual(before.settlements);
  expect(after.adjustments).toEqual(before.adjustments);
  expect(after.repayments).toHaveLength(before.repayments.length + 1);
  expect(after.repayments.find((row) => row.id === body.repayment.id)).toMatchObject({
    kind: 'independent',
    settlement_id: null,
  });
  const tripId = splittingTripId(world);
  const state = await (await callApi(world, 'GET', `/api/trips/${tripId}/settlement`)).json();
  const edge = state.arrangements.find(
    (row: { debtorMemberId: string; creditorMemberId: string; currencyCode: string }) =>
      row.debtorMemberId === splittingMemberId(world, 'Amy') &&
      row.creditorMemberId === splittingMemberId(world, 'Alice') &&
      row.currencyCode === 'JPY',
  );

  expect(edge).toBeDefined();
  expect(independentSplittingOracle.equal(edge.amount, expected)).toBe(true);
  const payment = await callApi(
    world,
    'GET',
    `/api/trips/${tripId}/repayments/${body.repayment.id}`,
  );

  expect(payment.status()).toBe(200);
  expect(await payment.json()).toEqual(body.repayment);
});
