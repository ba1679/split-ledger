import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { test, expect } from '../fixtures.js';
import { seedIdentity, seedTrip } from '../seed.js';

for (const secondKind of ['trash', 'reset', 'upload'] as const) {
  test(`owner-wide operation ID collision across trips: trash versus ${secondKind}`, async ({
    world,
  }) => {
    const alice = await seedIdentity(world, 'Alice');
    const first = await seedTrip(world, '競爭甲', 'Alice');
    const second = await seedTrip(world, '競爭乙', 'Alice');
    const operationId = randomUUID();
    const name = `test_receipt_${operationId.replaceAll('-', '')}`;
    const gate = await world.db.connect();
    const key = 253;
    const before = (
      await world.db.query('SELECT * FROM trips WHERE id=ANY($1::uuid[]) ORDER BY id', [
        [first.id, second.id],
      ])
    ).rows;
    const headers = { cookie: alice.cookie, origin: world.get<string>('webOrigin') };
    const commandHeaders = {
      ...headers,
      'X-Operation-Id': operationId,
      'X-Expected-Lifecycle-Revision': String(
        before.find((row) => row.id === second.id)!.lifecycle_revision,
      ),
      'X-Expected-Thumbnail-Revision': String(
        before.find((row) => row.id === second.id)!.thumbnail_revision,
      ),
    };
    const input = await sharp({
      create: { width: 32, height: 24, channels: 3, background: '#236ab0' },
    })
      .png()
      .toBuffer();
    let pending: Promise<import('@playwright/test').APIResponse[]> | undefined;
    try {
      await gate.query('SELECT pg_advisory_lock($1)', [key]);
      await world.db.query(`CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.owner_id='${alice.id}' AND NEW.operation_id='${operationId}'::uuid THEN
          PERFORM pg_advisory_xact_lock(${key});
        END IF; RETURN NEW; END $$`);
      await world.db.query(
        `CREATE TRIGGER ${name} BEFORE INSERT ON trip_operation_receipts FOR EACH ROW EXECUTE FUNCTION ${name}()`,
      );
      pending = Promise.all([
        world.api.post(`/api/trips/${first.id}/trash`, {
          headers,
          data: {
            operationId,
            expectedLifecycleRevision: String(
              before.find((row) => row.id === first.id)!.lifecycle_revision,
            ),
          },
        }),
        secondKind === 'trash'
          ? world.api.post(`/api/trips/${second.id}/trash`, {
              headers,
              data: {
                operationId,
                expectedLifecycleRevision: commandHeaders['X-Expected-Lifecycle-Revision'],
              },
            })
          : secondKind === 'reset'
            ? world.api.delete(`/api/trips/${second.id}/thumbnail`, { headers: commandHeaders })
            : world.api.post(`/api/trips/${second.id}/thumbnail`, {
                headers: commandHeaders,
                multipart: { image: { name: 'image.png', mimeType: 'image/png', buffer: input } },
              }),
      ]);
      // Both actual INSERTs have passed their receipt lookup before either can commit.
      await expect
        .poll(
          async () =>
            (
              await world.db.query<{ count: number }>(
                `SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'insert into "trip_operation_receipts"%'`,
              )
            ).rows[0]!.count,
        )
        .toBe(2);
      await gate.query('SELECT pg_advisory_unlock($1)', [key]);
      const responses = await pending;
      expect(responses.map((response) => response.status()).sort()).toEqual([200, 409]);
      const loser = responses.findIndex((response) => response.status() === 409);
      expect(await responses[loser]!.json()).toMatchObject({ code: 'OPERATION_ID_CONFLICT' });
      const loserId = [first.id, second.id][loser]!;
      expect((await world.db.query('SELECT * FROM trips WHERE id=$1', [loserId])).rows).toEqual(
        before.filter((row) => row.id === loserId),
      );
      expect(
        (await world.db.query('SELECT * FROM trip_thumbnails WHERE trip_id=$1', [loserId])).rows,
      ).toEqual([]);
      const receipts = (
        await world.db.query(
          'SELECT trip_id FROM trip_operation_receipts WHERE owner_id=$1 AND operation_id=$2',
          [alice.id, operationId],
        )
      ).rows;
      expect(receipts).toEqual([{ trip_id: [first.id, second.id][1 - loser] }]);
    } finally {
      await gate.query('SELECT pg_advisory_unlock($1)', [key]);
      if (pending) await Promise.allSettled([pending]);
      await world.db.query(`DROP TRIGGER IF EXISTS ${name} ON trip_operation_receipts`);
      await world.db.query(`DROP FUNCTION IF EXISTS ${name}()`);
      gate.release();
    }
  });
}
