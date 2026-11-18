import type { tripOperationReceipts } from '../../../db/schema.js';

export function receiptResult(row: typeof tripOperationReceipts.$inferSelect) {
  return {
    operationId: row.operationId,
    kind: row.kind,
    state: row.resultState,
    lifecycleRevision: String(row.resultLifecycleRevision),
    thumbnailRevision: String(row.resultThumbnailRevision),
    thumbnailPresent: row.resultThumbnailPresent,
  };
}
