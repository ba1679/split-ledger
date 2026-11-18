import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { managementSnapshot, managementTripId, sharedSnapshot } from './baseline.js';
import { lifecycleCommands } from './commands.js';

export interface CommandFault {
  operation: string;
  reached(): Promise<boolean>;
  dispose(): Promise<void>;
}

// Only test-owned DDL in the isolated worker database; existing integrity triggers stay enabled.
export async function installCommandFault(
  world: LedgerWorld,
  operation: string,
  tripId: string,
  ownerId: string,
): Promise<CommandFault> {
  expect(Object.keys(lifecycleCommands)).toContain(operation);
  const name = `test_fault_${randomUUID().replaceAll('-', '')}`;
  const sequence = `${name}_seq`;
  const table = operation === '永久刪除' ? 'expenses' : 'trips';
  const event = operation === '永久刪除' ? 'DELETE' : 'UPDATE';
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
    BEGIN
      IF TG_OP='DELETE' THEN
        IF OLD.owner_id::text<>TG_ARGV[0] OR OLD.trip_id::text<>TG_ARGV[1] THEN RETURN OLD; END IF;
      ELSE
        IF NEW.owner_id::text<>TG_ARGV[0] OR NEW.id::text<>TG_ARGV[1] THEN RETURN NEW; END IF;
        IF OLD.deleted_at IS NOT DISTINCT FROM NEW.deleted_at THEN RETURN NEW; END IF;
        IF (TG_ARGV[2]='trash' AND NEW.deleted_at IS NULL) OR
           (TG_ARGV[2]='restore' AND NEW.deleted_at IS NOT NULL) THEN RETURN NEW; END IF;
      END IF;
      PERFORM nextval('${sequence}');
      RAISE EXCEPTION '006 isolated command fault after actual row write' USING ERRCODE='P0001';
    END $$`);
  const kind = operation === '移至垃圾桶' ? 'trash' : operation === '復原' ? 'restore' : 'purge';

  await world.db.query(`CREATE TRIGGER ${name} AFTER ${event} ON ${table}
    FOR EACH ROW EXECUTE FUNCTION ${name}(${literal(ownerId)},${literal(tripId)},${literal(kind)})`);

  return {
    operation,
    dispose,
    async reached() {
      // PostgreSQL sequences survive transaction rollback, so this proves the fault really fired.
      const result = await world.db.query<{ is_called: boolean }>(
        `SELECT is_called FROM ${sequence}`,
      );

      return result.rows[0]!.is_called;
    },
  };
}

export async function armCommandFailure(world: LedgerWorld, operation: string): Promise<void> {
  world.set('management:before', await managementSnapshot(world));
  world.set('management:sharedBefore', await sharedSnapshot(world));
  const fault = await installCommandFault(
    world,
    operation,
    managementTripId(world),
    world.users.get('Alice')!.id,
  );

  expect(await fault.reached()).toBe(false);
  world.set('management:fault', fault);
}
