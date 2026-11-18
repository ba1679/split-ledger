import { test, expect } from '../fixtures.js';
import { seedTrip } from '../seed.js';
import { holdTripRow } from './row-lock.js';

test('006 trip-row barrier observes a real blocked writer and releases it', async ({ world }) => {
  const trip = await seedTrip(world, '交易屏障旅行');
  const barrier = await holdTripRow(world, trip.id);
  const pending = world.api.patch(`/api/trips/${trip.id}`, {
    headers: { cookie: world.users.get('甲')!.cookie, origin: world.get('webOrigin') },
    data: { name: '屏障已釋放' },
  });

  try {
    await barrier.waitForBlockedWriter();
    expect((await world.db.query('SELECT name FROM trips WHERE id=$1', [trip.id])).rows).toEqual([
      { name: '交易屏障旅行' },
    ]);
  } finally {
    await barrier.release();
    const response = await pending;

    try {
      expect(response.status()).toBe(200);
      expect((await response.json()).name).toBe('屏障已釋放');
    } finally {
      await response.dispose();
    }
  }
});
