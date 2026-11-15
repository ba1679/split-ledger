import { and, eq } from 'drizzle-orm';
import type { Database } from '../../../db/index.js';
import { tripOperationReceipts } from '../../../db/schema.js';
import { HttpError, postgresError } from '../../../http.js';
import { receiptResult } from './operation-result.js';
import { readOwnedTripState } from './state-query.js';

/** Called after the losing transaction rolls back, when the unique-key winner has committed. */
export async function resolveReceiptConflict(
  db: Database,
  ownerId: string,
  tripId: string,
  operationId: string,
  fingerprint: Buffer,
  error: unknown,
) {
  const failure = postgresError(error);
  if (failure?.code !== '23505' || failure.constraint !== 'trip_operation_receipts_pk') throw error;

  return db.transaction(
    async (tx) => {
      const [receipt] = await tx
        .select()
        .from(tripOperationReceipts)
        .where(
          and(
            eq(tripOperationReceipts.ownerId, ownerId),
            eq(tripOperationReceipts.operationId, operationId),
          ),
        );
      if (!receipt) throw error;
      if (receipt.tripId !== tripId || !receipt.requestFingerprint.equals(fingerprint))
        throw new HttpError(409, 'OPERATION_ID_CONFLICT', '這個操作識別已用於不同內容。');

      return {
        result: receiptResult(receipt),
        currentState: await readOwnedTripState(tx, ownerId, tripId),
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}
