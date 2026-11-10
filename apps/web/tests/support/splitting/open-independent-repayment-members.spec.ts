import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses, readBrowserSplittingSnapshot } from './fixture.js';
import {
  seedOtherTripCarol,
  otherTripCarolStateKey,
  type OtherTripCarolFixture,
} from './other-trip-carol-fixture.js';
import {
  openIndependentRepaymentMembers,
  openIndependentRepaymentMembersPhrase,
  independentRepaymentMembersKey,
  type IndependentRepaymentMembers,
} from './open-independent-repayment-members.js';

test('T167: opens actual repayment member menus with no write in either trip', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await seedOtherTripCarol(world);
  await runIsolatedStep(
    {
      phrase: openIndependentRepaymentMembersPhrase,
      input: undefined,
      execute: (context) => openIndependentRepaymentMembers(page, context),
    },
    world,
  );
  const state = world.get<IndependentRepaymentMembers>(independentRepaymentMembersKey);
  expect(state.writes).toEqual([]);
  expect(state.after).toEqual(state.before);
  for (const choices of Object.values(state.choices)) {
    expect(choices.some((choice) => choice.name === 'Alice')).toBe(true);
    expect(choices.some((choice) => choice.name === 'Amy')).toBe(true);
  }
  const foreign = world.get<OtherTripCarolFixture>(otherTripCarolStateKey);
  expect(await readBrowserSplittingSnapshot(foreign.otherWorld)).toEqual(foreign.otherBefore);
});
