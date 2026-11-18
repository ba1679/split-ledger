import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures.js';
import { login } from '../browser.js';
import { installCreateRejection } from './create-rejection.js';

test('real API rejects the wire name, preserves original UUID and accepts it after rejection is removed', async ({
  page,
  world,
  webServer,
}) => {
  await login(page, world, 'Alice');
  await page.goto(`${webServer}/trips`);
  const body = { id: randomUUID(), name: '京都賞楓', startDate: null, endDate: null };
  const rejection = await installCreateRejection(page);
  const post = () =>
    page.evaluate(async (data) => {
      const response = await fetch('/api/trips', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });

      return { status: response.status, body: await response.json() };
    }, body);
  try {
    const rejected = await post();
    expect(rejected.status).toBe(400);
    expect(rejected.body.code).toBe('VALIDATION_ERROR');
    expect(rejection.errors().map(String)).toEqual([]);
    expect(rejection.attempts()).toEqual([{ original: body, wire: { ...body, name: '' } }]);
    expect((await world.db.query('SELECT id FROM trips WHERE id=$1', [body.id])).rows).toEqual([]);
    expect(
      (await world.db.query('SELECT id FROM trip_members WHERE trip_id=$1', [body.id])).rows,
    ).toEqual([]);
    await rejection.dispose();
    const accepted = await post();
    expect(accepted.status).toBe(201);
    expect(accepted.body).toMatchObject({ id: body.id, name: body.name });
    expect((await world.db.query('SELECT id FROM trips WHERE id=$1', [body.id])).rowCount).toBe(1);
    expect(
      (
        await world.db.query("SELECT id FROM trip_members WHERE trip_id=$1 AND role='owner'", [
          body.id,
        ])
      ).rowCount,
    ).toBe(1);
  } finally {
    await rejection.dispose();
  }
});
