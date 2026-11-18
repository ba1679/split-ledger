import { test, expect, freePort, startProcess } from './fixtures.js';
import { randomUUID } from 'node:crypto';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { migrate, migrationsDirectory } from '../../apps/api/src/db/migrate.js';
import { LedgerWorld } from '../../apps/api/tests/support/world.js';
import { seedTrip, seedExpense } from '../../apps/api/tests/support/seed.js';

export async function launch(databaseUrl: string) {
  const port = await freePort();
  const runtime = startProcess(process.execPath, ['apps/api/dist/server.js'], {
    PATH: process.env.PATH,
    NODE_ENV: 'production',
    DATABASE_URL: databaseUrl,
    APP_ORIGIN: 'https://trial.example.test',
    BETTER_AUTH_SECRET: 'deployment-fixture-secret-at-least-32-characters',
    GOOGLE_CLIENT_ID: 'deployment-test-client',
    GOOGLE_CLIENT_SECRET: 'deployment-test-secret',
    PORT: String(port),
  });

  return { ...runtime, origin: `http://127.0.0.1:${port}` };
}

test('compiled startup upgrades existing accounting and preserves migration checksums', async ({
  database,
  request,
}) => {
  const directory = await mkdtemp(join(tmpdir(), 'ledger-runtime-upgrade-'));
  let runtime: Awaited<ReturnType<typeof launch>> | undefined;

  try {
    await database.pool.query(
      'DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS auth CASCADE; CREATE SCHEMA public',
    );
    const archive = pathToFileURL(`${directory}/`);

    for (const name of [
      '0001_currencies.sql',
      '0002_accounts_and_ownership.sql',
      '0003_trip_splitting.sql',
    ])
      await copyFile(new URL(name, migrationsDirectory), new URL(name, archive));
    await migrate(database.pool, archive);
    const world = new LedgerWorld(database.pool, request, 'http://127.0.0.1', randomUUID());
    const trip = await seedTrip(world, '升級前旅行', 'Alice', {
      startDate: '2027-03-10',
      endDate: '2027-03-15',
    });

    await seedExpense(world, {
      owner: 'Alice',
      tripName: '升級前旅行',
      item: '原有支出',
      amount: '100',
      currencyCode: 'JPY',
      categoryName: '餐飲',
    });
    const tables = ['trip_members', 'expenses', 'expense_shares', 'categories'];
    const before = new Map<string, unknown>();

    for (const table of tables)
      before.set(
        table,
        (await database.pool.query(`SELECT * FROM ${table} ORDER BY to_jsonb(${table})::text`))
          .rows,
      );
    const archived = (
      await database.pool.query('SELECT name,sha256 FROM _ledger_migrations ORDER BY name')
    ).rows;

    runtime = await launch(database.url);
    await expect
      .poll(async () => {
        try {
          return (await fetch(`${runtime!.origin}/healthz`)).status;
        } catch {
          return 0;
        }
      })
      .toBe(204);
    for (const table of tables)
      expect(
        (await database.pool.query(`SELECT * FROM ${table} ORDER BY to_jsonb(${table})::text`))
          .rows,
      ).toEqual(before.get(table));
    expect(
      (
        await database.pool.query('SELECT name,sha256 FROM _ledger_migrations ORDER BY name')
      ).rows.slice(0, 3),
    ).toEqual(archived);
    expect(
      (await database.pool.query('SELECT * FROM trips WHERE id=$1', [trip.id])).rows[0],
    ).toMatchObject({ deleted_at: null, lifecycle_revision: '0', thumbnail_revision: '0' });
    expect(
      (
        await database.pool.query(
          'SELECT trip_id,purged_at FROM trip_id_reservations WHERE trip_id=$1',
          [trip.id],
        )
      ).rows,
    ).toEqual([{ trip_id: trip.id, purged_at: null }]);
    expect((await fetch(`${runtime.origin}/api/me`)).status).toBe(401);
  } finally {
    await runtime?.stop();
    await rm(directory, { recursive: true, force: true });
  }
});

test('compiled production entry starts migrations and stops gracefully', async ({ database }) => {
  // Start against an empty schema, not the fixture's already-migrated schema.
  await database.pool.query(
    'DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS auth CASCADE; CREATE SCHEMA public',
  );
  const runtime = await launch(database.url);

  try {
    await expect
      .poll(async () => {
        try {
          return (await fetch(`${runtime.origin}/api/currencies`)).status;
        } catch {
          return 0;
        }
      })
      .toBe(200);
    const migrations = await database.pool.query(
      'SELECT count(*)::int AS count FROM _ledger_migrations',
    );

    expect(migrations.rows[0].count).toBeGreaterThan(0);
  } finally {
    await runtime.stop();
  }
  expect(runtime.child.exitCode).toBe(0);
});

test('readiness has no body or authentication requirement', async ({ database }) => {
  const runtime = await launch(database.url);

  try {
    await expect
      .poll(async () => {
        try {
          return (await fetch(`${runtime.origin}/healthz`)).status;
        } catch {
          return 0;
        }
      })
      .toBe(204);
    const response = await fetch(`${runtime.origin}/healthz`);

    expect(await response.text()).toBe('');
    expect(response.headers.get('set-cookie')).toBeNull();
  } finally {
    await runtime.stop();
  }
});

test('failed migrations do not expose readiness', async ({ database }) => {
  await database.pool.query(
    "UPDATE _ledger_migrations SET sha256='invalid' WHERE name=(SELECT min(name) FROM _ledger_migrations)",
  );
  const runtime = await launch(database.url);

  try {
    const [code] = await runtime.exited;

    expect(code).toBe(1);
    await expect(fetch(`${runtime.origin}/healthz`)).rejects.toThrow();
    expect(runtime.output()).not.toContain(database.url);
  } finally {
    await runtime.stop();
  }
});

test('unreachable database does not expose readiness', async () => {
  const port = await freePort();
  const runtime = await launch(
    `postgres://invalid:invalid@127.0.0.1:${port}/unreachable?connect_timeout=2`,
  );

  try {
    const [code] = await runtime.exited;

    expect(code).toBe(1);
    await expect(fetch(`${runtime.origin}/healthz`)).rejects.toThrow();
    expect(runtime.output()).not.toContain('invalid:invalid');
  } finally {
    await runtime.stop();
  }
});

test('production serves assets and SPA pages without swallowing API or asset errors', async ({
  database,
}) => {
  const runtime = await launch(database.url);

  try {
    await expect
      .poll(async () => {
        try {
          return (await fetch(`${runtime.origin}/healthz`)).status;
        } catch {
          return 0;
        }
      })
      .toBe(204);
    for (const path of [
      '/',
      '/trips',
      '/trips/test-trip',
      '/trips/test-trip/expenses/new',
      '/trips/test-trip/members',
      '/trips/test-trip/settlement',
      '/trips/test-trip/settlements/new?arrangementKey=opaque%2Fkey',
      '/trips/test-trip/repayments/new',
      '/categories',
    ]) {
      const page = await fetch(`${runtime.origin}${path}`, { headers: { accept: 'text/html' } });

      expect(page.status).toBe(200);
      expect(page.headers.get('content-type')).toContain('text/html');
      expect(await page.text()).toContain('<div id="root">');

      const refreshed = await fetch(`${runtime.origin}${path}`, {
        headers: { accept: 'text/html' },
      });

      expect(refreshed.status).toBe(200);
      expect(await refreshed.text()).toContain('<div id="root">');
    }
    const html = await (await fetch(runtime.origin)).text();
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(
      (match) => match[1]!,
    );

    expect(assets.length).toBeGreaterThanOrEqual(2);
    for (const path of assets) {
      const asset = await fetch(`${runtime.origin}${path}`);

      expect(asset.status).toBe(200);
      expect(asset.headers.get('content-type')).toContain(
        path.endsWith('.css') ? 'text/css' : 'javascript',
      );
    }
    for (const path of [
      '/api/unknown',
      '/api',
      '/assets/missing.js',
      '/assets/missing',
      '/trips/missing.js',
      '/trips/test-trip/settlements/unknown',
      '/trips/test-trip/repayments/unknown',
      '/trips/test-trip/settlement/unknown',
      '/api/trips/test-trip/unknown',
    ]) {
      const missing = await fetch(`${runtime.origin}${path}`, { headers: { accept: 'text/html' } });

      expect(missing.status).toBe(404);
      expect(missing.headers.get('content-type')).not.toContain('text/html');
    }
    const post = await fetch(`${runtime.origin}/trips`, {
      method: 'POST',
      headers: { accept: 'text/html' },
    });

    expect(post.status).not.toBe(200);
    for (const path of ['members', 'settlement', 'settlements/new', 'repayments/new']) {
      const url = `${runtime.origin}/trips/test-trip/${path}`;
      const json = await fetch(url, { headers: { accept: 'application/json' } });

      expect(json.status).toBe(404);
      expect(json.headers.get('content-type')).not.toContain('text/html');
      const head = await fetch(url, { method: 'HEAD', headers: { accept: 'text/html' } });

      expect(head.status).toBe(200);
      expect(await head.text()).toBe('');
    }
    expect((await fetch(`${runtime.origin}/api/me`)).status).toBe(401);
  } finally {
    await runtime.stop();
  }
});
