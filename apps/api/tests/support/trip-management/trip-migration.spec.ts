import { test, expect, request } from '@playwright/test';
import { copyFile, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { migrate, migrationsDirectory } from '../../../src/db/migrate.js';
import { createWorkerDatabase } from '../database.js';
import { LedgerWorld } from '../world.js';
import { seedTrip, seedExpense } from '../seed.js';

test('official upgrade backfills existing trip reservations without altering accounting and is repeatable', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ledger-official-archive-'));
  let database: Awaited<ReturnType<typeof createWorkerDatabase>> | undefined;
  const api = await request.newContext();
  try {
    const archive = pathToFileURL(`${directory}/`);
    for (const name of [
      '0001_currencies.sql',
      '0002_accounts_and_ownership.sql',
      '0003_trip_splitting.sql',
    ])
      await copyFile(new URL(name, migrationsDirectory), new URL(name, archive));
    database = await createWorkerDatabase(test.info().workerIndex + 10000, (pool) =>
      migrate(pool, archive),
    );
    const world = new LedgerWorld(database.pool, api, 'http://127.0.0.1', randomUUID());
    const trip = await seedTrip(world, '升級前既有旅行', 'Alice', {
      startDate: '2027-03-10',
      endDate: '2027-03-15',
    });
    await seedExpense(world, {
      owner: 'Alice',
      tripName: '升級前既有旅行',
      item: '原有支出',
      amount: '100',
      currencyCode: 'JPY',
      categoryName: '餐飲',
    });
    const beforeTrip = (await database.pool.query('SELECT * FROM trips WHERE id=$1', [trip.id]))
      .rows[0]!;
    const tables = ['trip_members', 'expenses', 'expense_shares', 'categories'];
    const before = new Map<string, unknown>();
    for (const table of tables)
      before.set(
        table,
        (await database.pool.query(`SELECT * FROM ${table} ORDER BY to_jsonb(${table})::text`))
          .rows,
      );
    await migrate(database.pool);
    const after = (await database.pool.query('SELECT * FROM trips WHERE id=$1', [trip.id]))
      .rows[0]!;
    expect(
      Object.fromEntries(
        Object.entries(after).filter(
          ([key]) => !['deleted_at', 'lifecycle_revision', 'thumbnail_revision'].includes(key),
        ),
      ),
    ).toEqual(beforeTrip);
    expect(after).toMatchObject({
      deleted_at: null,
      lifecycle_revision: '0',
      thumbnail_revision: '0',
    });
    const reservation = (
      await database.pool.query('SELECT * FROM trip_id_reservations WHERE trip_id=$1', [trip.id])
    ).rows;
    expect(reservation).toEqual([
      {
        trip_id: trip.id,
        owner_id: beforeTrip.owner_id,
        reserved_at: beforeTrip.created_at,
        purged_at: null,
      },
    ]);
    for (const table of tables)
      expect(
        (await database.pool.query(`SELECT * FROM ${table} ORDER BY to_jsonb(${table})::text`))
          .rows,
      ).toEqual(before.get(table));
    const migrations = (await database.pool.query('SELECT * FROM _ledger_migrations ORDER BY name'))
      .rows;
    expect(migrations.map((row) => row.name)).toEqual(
      (await readdir(migrationsDirectory)).filter((name) => name.endsWith('.sql')).sort(),
    );
    await migrate(database.pool);
    expect(
      (await database.pool.query('SELECT * FROM _ledger_migrations ORDER BY name')).rows,
    ).toEqual(migrations);
    expect(
      (await database.pool.query('SELECT * FROM trip_id_reservations WHERE trip_id=$1', [trip.id]))
        .rows,
    ).toEqual(reservation);
    await expect(
      database.pool.query('DELETE FROM trip_id_reservations WHERE trip_id=$1', [trip.id]),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      database.pool.query('UPDATE trip_id_reservations SET purged_at=now() WHERE trip_id=$1', [
        trip.id,
      ]),
    ).rejects.toMatchObject({ code: '23514' });
    expect(
      (await database.pool.query('SELECT * FROM trip_id_reservations WHERE trip_id=$1', [trip.id]))
        .rows,
    ).toEqual(reservation);
  } finally {
    try {
      await database?.dispose();
    } finally {
      await api.dispose();
      await rm(directory, { recursive: true, force: true });
    }
  }
});
