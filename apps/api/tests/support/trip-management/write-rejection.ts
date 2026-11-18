import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';

export interface OwnedWriteRejection {
  attempts(): Promise<number>;
  dispose(): Promise<void>;
}

/** Scoped PostgreSQL rejection; trips fail before immutable-owner/FK guards, others after writing. */
export async function installOwnedWriteRejection(
  world: LedgerWorld,
  table: 'trip_thumbnails' | 'expenses' | 'trips',
  ownerId: string,
  tripId: string,
): Promise<OwnedWriteRejection> {
  expect(['trip_thumbnails', 'expenses', 'trips']).toContain(table);
  const tripColumn = table === 'trips' ? 'id' : 'trip_id';
  const name = `test_reject_${randomUUID().replaceAll('-', '')}`;
  const sequence = `${name}_seq`;
  const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
  let disposed = false;
  const dispose = async () => {
    if (disposed) return;
    await world.db.query(`DROP TRIGGER IF EXISTS ${name} ON ${table}`);
    await world.db.query(`DROP FUNCTION IF EXISTS ${name}()`);
    await world.db.query(`DROP SEQUENCE IF EXISTS ${sequence}`);
    disposed = true;
    world.tripManagement.cleanups.delete(dispose);
  };
  world.tripManagement.cleanups.add(dispose);
  await world.db.query(`CREATE SEQUENCE ${sequence}`);
  await world.db.query(`CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE actual_owner text; actual_trip uuid;
    BEGIN
      IF TG_OP='DELETE' THEN actual_owner:=OLD.owner_id; actual_trip:=OLD.${tripColumn};
      ELSE actual_owner:=NEW.owner_id; actual_trip:=NEW.${tripColumn}; END IF;
      IF actual_owner=TG_ARGV[0] AND actual_trip=TG_ARGV[1]::uuid THEN
        PERFORM nextval('${sequence}');
        RAISE EXCEPTION '006 isolated thumbnail write rejection' USING ERRCODE='23514';
      END IF;
      RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
    END $$`);
  await world.db
    .query(`CREATE TRIGGER ${name} ${table === 'trips' ? 'BEFORE' : 'AFTER'} INSERT OR UPDATE OR DELETE ON ${table}
    FOR EACH ROW EXECUTE FUNCTION ${name}(${literal(ownerId)},${literal(tripId)})`);

  return {
    dispose,
    async attempts() {
      const result = await world.db.query<{ last_value: string; is_called: boolean }>(
        `SELECT last_value,is_called FROM ${sequence}`,
      );

      return result.rows[0]!.is_called ? Number(result.rows[0]!.last_value) : 0;
    },
  };
}
