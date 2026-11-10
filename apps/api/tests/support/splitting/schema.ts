import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { requireProductTable } from '../seed.js';

export async function requireProductColumns(
  world: LedgerWorld,
  table: string,
  columns: readonly string[],
): Promise<void> {
  await requireProductTable(world, table);
  const result = await world.db.query<{ column_name: string }>(
    'SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',
    ['public', table],
  );
  const actual = result.rows.map((row) => row.column_name);

  for (const column of columns)
    expect(actual, `Product migration must provide ${table}.${column}`).toContain(column);
}
