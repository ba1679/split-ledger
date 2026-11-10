import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { otherTripAmyPhrase, seedBrowserOtherTripAmy } from './other-trip-amy-fixture.js';

test('T120: same-owner other-trip Amy does not populate the current owner-only directory', async ({
  page,
  world,
}) => {
  await runIsolatedStep(
    {
      phrase: otherTripAmyPhrase,
      input: undefined,
      execute: async (context) => seedBrowserOtherTripAmy(page, context),
    },
    world,
  );
  expect(world.splitting.ids.members.has('Amy')).toBe(false);
  expect(world.splitting.ids.members.has('台南旅行:Amy')).toBe(true);
  expect(new URL(page.url()).pathname).toBe(
    `/trips/${world.get<string>('splitting:tripId')}/members`,
  );
});
