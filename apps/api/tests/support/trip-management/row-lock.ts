import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';

export async function holdTripRow(world: LedgerWorld, tripId: string) {
  const client = await world.db.connect();
  let released = false;
  const release = async () => {
    if (released) return;
    released = true;
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
      world.tripManagement.cleanups.delete(release);
    }
  };

  world.tripManagement.cleanups.add(release);
  try {
    await client.query('BEGIN');
    const locked = await client.query('SELECT id FROM trips WHERE id=$1 FOR UPDATE', [tripId]);

    expect(locked.rows).toHaveLength(1);
    const pid = (await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!
      .pid;

    return {
      release,
      async waitForBlockedWriter() {
        await expect
          .poll(
            async () => {
              const result = await world.db.query<{ count: number }>(
                "SELECT count(*)::int AS count FROM pg_stat_activity WHERE wait_event_type='Lock' AND $1=ANY(pg_blocking_pids(pid))",
                [pid],
              );

              return result.rows[0]!.count;
            },
            { timeout: 3000, message: 'The actual command must reach the held trip-row lock' },
          )
          .toBeGreaterThan(0);
      },
    };
  } catch (error) {
    await release();
    throw error;
  }
}
