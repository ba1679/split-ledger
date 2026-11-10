import { test, expect } from '../fixtures.js';
import { seedTrip } from '../seed.js';
import { runIsolatedStep } from './harness.js';
import { readRepaymentsPhrase, readTripRepayments } from './read-repayments-command.js';

test('T051 reads the owner travel repayment history through one real GET', async ({ world }) => {
  const trip = await seedTrip(world, '日本旅行');

  world.splitting.ids.trips.set('日本旅行', trip.id);
  await runIsolatedStep(
    { phrase: readRepaymentsPhrase, input: undefined, execute: readTripRepayments },
    world,
  );
  expect(world.get('splitting:reply')).toEqual(await world.response!.json());
});
