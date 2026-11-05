import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import type pg from 'pg';

export const migrationsDirectory = new URL('../../drizzle/', import.meta.url);

/** Apply the same archived SQL migrations in production and isolated test databases. */
export async function migrate(pool: pg.Pool): Promise<void> {
  const files = (await readdir(migrationsDirectory)).filter(file => file.endsWith('.sql')).sort();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialize startup migration attempts across application processes.
    await client.query('SELECT pg_advisory_xact_lock($1)', [7458231901]);
    await client.query(`CREATE TABLE IF NOT EXISTS _ledger_migrations (
      name text PRIMARY KEY,
      sha256 text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    for (const name of files) {
      const sql = await readFile(new URL(name, migrationsDirectory), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const prior = await client.query<{ sha256: string }>('SELECT sha256 FROM _ledger_migrations WHERE name=$1', [name]);
      if (prior.rows[0]) {
        if (prior.rows[0].sha256 !== checksum) throw new Error(`Applied migration was modified: ${name}`);
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO _ledger_migrations(name,sha256) VALUES($1,$2)', [name, checksum]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
