import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import {
  otherTripCarolPhrase,
  otherTripCarolStateKey,
  seedOtherTripCarol,
  type OtherTripCarolFixture,
} from './other-trip-carol-fixture.js';

test('T132: foreign Carol belongs to a real same-owner trip without navigation or current aliases', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  const url = page.url();
  await runIsolatedStep(
    { phrase: otherTripCarolPhrase, input: undefined, execute: seedOtherTripCarol },
    world,
  );
  const fixture = world.get<OtherTripCarolFixture>(otherTripCarolStateKey);
  expect(fixture.currentTripId).not.toBe(fixture.otherTripId);
  expect(fixture.currentBefore.sources.members).toHaveLength(2);
  expect(fixture.otherBefore.sources.members).toHaveLength(2);
  expect(world.splitting.ids.members.get('台南旅行:Carol')).toBe(fixture.memberId);
  expect(page.url()).toBe(url);
  expect(world.users.size).toBe(1);
});
