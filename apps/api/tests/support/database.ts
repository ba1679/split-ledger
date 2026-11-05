import pg from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
export const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? 'postgres://ledger_test:ledger_test_local@127.0.0.1:54330/ledger_test';
export async function runMigrations(pool: pg.Pool) {
 const dir = new URL('../../drizzle/', import.meta.url);
 const files = (await readdir(dir)).filter(f => f.endsWith('.sql')).sort();
 for (const file of files) await pool.query(await readFile(new URL(file, dir), 'utf8'));
}
export async function createWorkerDatabase(worker: number) {
 const url = new URL(testDatabaseUrl);
 if (!url.pathname.startsWith('/ledger_test') || url.port !== '54330') throw Error('Tests require the isolated ledger_test database on port 54330');
 const admin = new pg.Pool({ connectionString: url.toString() });
 const name = `ledger_test_${process.pid}_${worker}`;
 await admin.query(`CREATE DATABASE "${name}"`);
 url.pathname = `/${name}`;
 const pool = new pg.Pool({ connectionString: url.toString() });
 try { await runMigrations(pool); } catch (error) { await pool.end(); await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`); await admin.end(); throw error; }
 return { pool, url: url.toString(), async dispose() { await pool.end(); await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`); await admin.end(); } };
}
export const migrationsPath = fileURLToPath(new URL('../../drizzle/', import.meta.url));
