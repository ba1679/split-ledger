import { createHash, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { expect, request } from '@playwright/test';
import { buildApp } from '../../../src/app.js';
import { migrate, migrationsDirectory } from '../../../src/db/migrate.js';
import { testDatabaseUrl } from '../database.js';
import { seedExpense, TEST_AUTH_SECRET } from '../seed.js';
import { LedgerWorld } from '../world.js';
import { requireProductColumns } from './schema.js';
import { snapshotSplittingSources } from './expense-fixture.js';

export interface LegacySplittingContext {
  readonly world: LedgerWorld;
  dispose(): Promise<void>;
}

export function expenseAuthorityWorld(world: LedgerWorld): LedgerWorld {
  return world.state.has('splitting:legacyWorld')
    ? world.get<LedgerWorld>('splitting:legacyWorld')
    : world;
}

/** Archived pre-005 SQL is applied before inserting data; only migrate() upgrades it. */
export async function seedMigratedLegacyExpense(world: LedgerWorld): Promise<void> {
  const url = new URL(testDatabaseUrl);
  if (!url.pathname.startsWith('/ledger_test') || url.port !== '54330')
    throw Error('Legacy fixtures require the isolated ledger_test database on port 54330');
  const name = `ledger_test_legacy_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Pool({ connectionString: url.toString() });
  await admin.query(`CREATE DATABASE "${name}"`);
  url.pathname = `/${name}`;
  const pool = new pg.Pool({ connectionString: url.toString() });
  const clients = new Set<pg.PoolClient>();
  pool.on('connect', (client) => {
    clients.add(client);
    client.once('end', () => clients.delete(client));
  });
  let app: ReturnType<typeof buildApp> | undefined;
  let api: Awaited<ReturnType<typeof request.newContext>> | undefined;
  const dispose = async () => {
    await api?.dispose();
    await app?.close();
    const closed = [...clients].map((client) => once(client, 'end'));
    await pool.end();
    await Promise.all(closed);
    await admin.query(`DROP DATABASE "${name}"`);
    await admin.end();
  };
  try {
    await pool.query(
      'CREATE TABLE _ledger_migrations(name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())',
    );
    for (const migration of ['0001_currencies.sql', '0002_accounts_and_ownership.sql']) {
      const sql = await readFile(new URL(migration, migrationsDirectory), 'utf8');
      await pool.query(sql);
      await pool.query('INSERT INTO _ledger_migrations(name,sha256) VALUES($1,$2)', [
        migration,
        createHash('sha256').update(sql).digest('hex'),
      ]);
    }
    const legacy = new LedgerWorld(pool, world.api, world.origin, world.namespace);
    const oldSchema = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='expenses' AND table_schema='public'",
    );
    expect(oldSchema.rows.map((row: { column_name: string }) => row.column_name)).not.toContain(
      'payer_member_id',
    );
    const expense = await seedExpense(legacy, {
      item: '機票',
      amount: '8000',
      currencyCode: 'TWD',
      spentOn: '2027-01-15',
      categoryName: null,
    });
    await pool.query('UPDATE auth."user" SET name=$2 WHERE id=$1', [expense.owner_id, 'Alice']);
    const fields =
      'id,owner_id,trip_id,category_id,item,amount_minor::text,currency_code,minor_unit,spent_on::text,created_at,updated_at';
    const beforeExpense = (
      await pool.query(`SELECT ${fields} FROM expenses WHERE id=$1`, [expense.id])
    ).rows[0];
    const statsQuery =
      'SELECT count(*)::text AS expense_count,currency_code,sum(amount_minor)::text AS amount_minor FROM expenses WHERE trip_id=$1 GROUP BY currency_code ORDER BY currency_code';
    const beforeStats = (await pool.query(statsQuery, [expense.trip_id])).rows;
    const beforeTrip = (await pool.query('SELECT * FROM trips WHERE id=$1', [expense.trip_id]))
      .rows[0];
    await migrate(pool);
    await requireProductColumns(legacy, 'expenses', ['payer_member_id']);
    await requireProductColumns(legacy, 'trip_members', [
      'id',
      'trip_id',
      'owner_id',
      'role',
      'is_active',
    ]);
    await requireProductColumns(legacy, 'expense_shares', ['trip_id', 'expense_id', 'member_id']);
    expect(
      (await pool.query(`SELECT ${fields} FROM expenses WHERE id=$1`, [expense.id])).rows,
    ).toEqual([beforeExpense]);
    expect((await pool.query(statsQuery, [expense.trip_id])).rows).toEqual(beforeStats);
    expect(
      (await pool.query('SELECT * FROM trips WHERE id=$1', [expense.trip_id])).rows[0],
    ).toMatchObject(beforeTrip);
    const members = (
      await pool.query('SELECT * FROM trip_members WHERE trip_id=$1', [expense.trip_id])
    ).rows;
    expect(members).toHaveLength(1);
    const owner = members[0]!;
    expect(owner).toMatchObject({
      owner_id: expense.owner_id,
      trip_id: expense.trip_id,
      role: 'owner',
      is_active: true,
    });
    expect(
      (await pool.query('SELECT payer_member_id FROM expenses WHERE id=$1', [expense.id])).rows,
    ).toEqual([{ payer_member_id: owner.id }]);
    expect(
      (await pool.query('SELECT member_id FROM expense_shares WHERE expense_id=$1', [expense.id]))
        .rows,
    ).toEqual([{ member_id: owner.id }]);
    app = buildApp({
      pool,
      appOrigin: world.origin,
      authSecret: TEST_AUTH_SECRET,
      google: { clientId: 'ledger-test-google', clientSecret: 'isolated-test-google-secret' },
    });
    await app.listen({ host: '127.0.0.1', port: 0 });
    api = await request.newContext({ baseURL: app.listeningOrigin });
    const active = new LedgerWorld(pool, api, app.listeningOrigin, world.namespace);
    for (const [label, identity] of legacy.users)
      active.users.set(label, { ...identity, name: 'Alice' });
    for (const target of [active, world]) {
      target.splitting.ids.trips.set('日本旅行', expense.trip_id);
      target.splitting.ids.expenses.set('機票', expense.id);
      target.splitting.ids.members.set('Alice', String(owner.id));
      target.set('splitting:tripId', expense.trip_id);
      target.set('splitting:ownerId', expense.owner_id);
      target.set('splitting:expenseId', expense.id);
      target.set('backend:expenseId', expense.id);
      target.set('splitting:legacyExpenseBefore', beforeExpense);
      target.set('splitting:legacyStatsBefore', beforeStats);
      target.set('seed:expense:甲:機票', expense);
    }
    active.splitting.snapshot = await snapshotSplittingSources(active, expense.trip_id);
    world.splitting.snapshot = active.splitting.snapshot;
    world.set('splitting:legacyWorld', active);
    world.set('splitting:legacyContext', {
      world: active,
      dispose,
    } satisfies LegacySplittingContext);
  } catch (error) {
    await dispose();
    throw error;
  }
}
