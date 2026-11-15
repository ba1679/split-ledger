import pg from 'pg';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { migrate, migrationsDirectory } from '../../src/db/migrate.js';

export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgres://ledger_test:ledger_test_local@127.0.0.1:54330/ledger_test';

export const runMigrations = migrate;

export async function createWorkerDatabase(worker: number, initialize = runMigrations) {
  const url = new URL(testDatabaseUrl);

  if (!url.pathname.startsWith('/ledger_test') || url.port !== '54330')
    throw Error('Tests require the isolated ledger_test database on port 54330');

  const admin = new pg.Pool({ connectionString: url.toString() });
  const name = `ledger_test_${process.pid}_${worker}`;

  await admin.query(`CREATE DATABASE "${name}"`);
  url.pathname = `/${name}`;
  const pool = new pg.Pool({ connectionString: url.toString() });
  const clients = new Set<pg.PoolClient>();

  pool.on('connect', (client) => {
    clients.add(client);
    client.once('end', () => clients.delete(client));
  });
  const closePool = async () => {
    const closed = [...clients].map((client) => once(client, 'end'));

    await pool.end();
    await Promise.all(closed);
  };

  try {
    await initialize(pool);
  } catch (error) {
    await closePool();
    await admin.query(`DROP DATABASE "${name}"`);
    await admin.end();
    throw error;
  }

  return {
    pool,
    url: url.toString(),
    async dispose() {
      await closePool();
      await admin.query(`DROP DATABASE "${name}"`);
      await admin.end();
    },
  };
}

export const migrationsPath = fileURLToPath(migrationsDirectory);
