import { test, expect } from '../fixtures.js';
import { seedTrip } from '../seed.js';
import { runIsolatedStep } from './harness.js';
import { readSettlementPhrase, readTripSettlement } from './read-settlement-command.js';

test('T056 registers the exact parameter-free settlement query', () => {
  expect(readSettlementPhrase).toBe('owner 查詢旅行分帳結算');
  expect(readSettlementPhrase).not.toContain('{');
});

test('T056 isolated owner GET retains the projection revision and arrangement keys', async ({
  world,
}) => {
  const trip = await seedTrip(world, '日本旅行');
  world.splitting.ids.trips.set('日本旅行', trip.id);
  await runIsolatedStep(
    { phrase: readSettlementPhrase, input: undefined, execute: readTripSettlement },
    world,
  );
  const reply = await world.response!.json();
  expect(world.get('splitting:settlementView')).toEqual(reply);
  expect(world.get('splitting:reply')).toEqual(reply);
  expect(world.get('splitting:revision')).toBe(reply.accountingRevision);
  expect(world.get('splitting:arrangementKeys')).toEqual(
    reply.arrangements.map((row: { key: string }) => row.key),
  );
});
