import { monitorUpload } from './upload-budget.js';
import { resolveReceiptConflict } from './receipt-conflict.js';
import { receiptResult } from './operation-result.js';
import { createHash } from 'node:crypto';
import { Type } from '@sinclair/typebox';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../../../db/index.js';
import { trips, tripThumbnails, tripOperationReceipts } from '../../../db/schema.js';
import { ErrorResponse, HttpError, Uuid, invalid, notFound } from '../../../http.js';
import { requireUser, type Auth } from '../../auth/index.js';
import type { TripManagementHooks } from './dependencies.js';
import { OperationOutcome, Revision, revisionPattern } from './http-schema.js';
import { readOwnedTripState } from './state-query.js';
import {
  MAX_MULTIPART_BYTES,
  imageTooLarge,
  nativeThumbnailProcessor,
  requireUploadConnected,
} from './image-processor.js';

const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function thumbnailCommandHeaders(request: FastifyRequest) {
  const operationId = request.headers['x-operation-id'];
  const lifecycleRevision = request.headers['x-expected-lifecycle-revision'];
  const thumbnailRevision = request.headers['x-expected-thumbnail-revision'];
  if (
    typeof operationId !== 'string' ||
    !uuidPattern.test(operationId) ||
    typeof lifecycleRevision !== 'string' ||
    !revisionPattern.test(lifecycleRevision) ||
    typeof thumbnailRevision !== 'string' ||
    !revisionPattern.test(thumbnailRevision)
  )
    throw invalid('圖片操作識別與版本不正確，請重新確認。');

  return { operationId, lifecycleRevision, thumbnailRevision };
}

interface UploadContext {
  ownerId: string;
  tripId: string;
  operationId: string;
  lifecycleRevision: string;
  thumbnailRevision: string;
  controller: AbortController;
  started: boolean;
  finished: boolean;
  budget: ReturnType<typeof monitorUpload>;
  detach(): void;
}
type Reader = Pick<Database, 'select'>;

async function replay(reader: Reader, context: UploadContext, fingerprint: Buffer) {
  const [receipt] = await reader
    .select()
    .from(tripOperationReceipts)
    .where(
      and(
        eq(tripOperationReceipts.ownerId, context.ownerId),
        eq(tripOperationReceipts.operationId, context.operationId),
      ),
    );
  if (!receipt) return;
  if (receipt.tripId !== context.tripId || !receipt.requestFingerprint.equals(fingerprint))
    throw new HttpError(409, 'OPERATION_ID_CONFLICT', '這個操作識別已用於不同內容。');

  return {
    result: receiptResult(receipt),
    currentState: await readOwnedTripState(reader, context.ownerId, context.tripId),
  };
}

function multipartFailure(error: unknown): never {
  if (error instanceof HttpError) throw error;
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (['FST_REQ_FILE_TOO_LARGE', 'FST_FILES_LIMIT', 'FST_PARTS_LIMIT'].includes(code))
    throw imageTooLarge();
  if (code === 'FST_FIELDS_LIMIT') throw invalid('只能傳送一張圖片，不能附加文字欄位。');
  throw new HttpError(400, 'UPLOAD_INCOMPLETE', '圖片傳輸未完成或格式不完整，請重新選圖。');
}

function assertActive(state: Awaited<ReturnType<typeof readOwnedTripState>>): void {
  if (state.state === 'trash') throw new HttpError(409, 'TRIP_TRASHED', '旅行已在垃圾桶。');
  if (state.state === 'purged') throw new HttpError(409, 'TRIP_PURGED', '旅行已永久刪除。');
}

export function registerTripThumbnailRoutes(
  app: FastifyInstance,
  db: Database,
  auth: Auth,
  hooks?: TripManagementHooks,
): void {
  const api = app.withTypeProvider<TypeBoxTypeProvider>();
  let busy = false;
  const contexts = new WeakMap<FastifyRequest, UploadContext>();
  const finish = async (request: FastifyRequest, context: UploadContext) => {
    if (context.finished) return;
    context.finished = true;
    context.detach();
    try {
      await hooks?.afterThumbnailJob?.({
        ownerId: context.ownerId,
        tripId: context.tripId,
        operationId: context.operationId,
      });
    } finally {
      busy = false;
      contexts.delete(request);
    }
  };
  api.post(
    '/api/trips/:tripId/thumbnail',
    {
      schema: {
        params: Type.Object({ tripId: Uuid }, { additionalProperties: false }),
        response: {
          200: OperationOutcome,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          408: ErrorResponse,
          409: ErrorResponse,
          413: ErrorResponse,
          415: ErrorResponse,
          422: ErrorResponse,
          503: ErrorResponse,
        },
      },
      async onRequest(request, reply) {
        const user = await requireUser(auth, request, reply),
          tripId = request.params.tripId;
        if (
          request.headers['content-type']?.split(';')[0]?.trim().toLowerCase() !==
          'multipart/form-data'
        )
          throw invalid('請以單張圖片表單傳送。');
        if (!uuidPattern.test(tripId)) throw invalid('圖片操作識別與版本不正確，請重新確認。');
        const { operationId, lifecycleRevision, thumbnailRevision } =
          thumbnailCommandHeaders(request);
        await readOwnedTripState(db, user.id, tripId);
        const length = request.headers['content-length'];
        if (length && /^\d+$/.test(length) && BigInt(length) > BigInt(MAX_MULTIPART_BYTES))
          throw imageTooLarge();
        if (busy) throw new HttpError(503, 'UPLOAD_BUSY', '目前圖片處理忙碌，請稍後重新確認。');
        busy = true;
        const controller = new AbortController();
        const budget = monitorUpload(request, reply, controller);
        const context: UploadContext = {
          ownerId: user.id,
          tripId,
          operationId,
          lifecycleRevision,
          thumbnailRevision,
          controller,
          budget,
          started: false,
          finished: false,
          detach() {
            budget.detach();
            request.raw.off('aborted', aborted);
            reply.raw.off('close', closed);
          },
        };
        const aborted = () => {
          context.controller.abort();
          if (!context.started)
            void finish(request, context).catch(() =>
              request.log.error('Image job completion observer failed'),
            );
        };
        const closed = () => {
          if (!reply.raw.writableFinished) aborted();
        };
        contexts.set(request, context);
        request.raw.once('aborted', aborted);
        reply.raw.once('close', closed);
        if (request.raw.aborted) aborted();
      },
      async onResponse(request) {
        const context = contexts.get(request);
        if (context && !request.raw.complete) request.raw.destroy();
        if (context && !context.started) await finish(request, context);
      },
    },
    async (request) => {
      const context = contexts.get(request);
      if (!context) throw invalid('圖片傳輸已中止，請重新選圖。');
      context.started = true;
      try {
        let bytes: Buffer | undefined;
        try {
          if (!request.isMultipart()) throw invalid('請以單張圖片表單傳送。');
          context.budget.beginReading();
          // A second header is inspected only to distinguish forbidden text (400) from
          // a second file (413). files=1/fields=0 still admit at most one part.
          for await (const part of request.parts({ limits: { parts: 2 } })) {
            if (part.type !== 'file' || part.fieldname !== 'image')
              throw invalid('請只傳送一個名為 image 的圖片欄位。');
            if (bytes) throw imageTooLarge();
            bytes = await part.toBuffer();
            if (part.file.truncated) throw imageTooLarge();
          }
        } catch (error) {
          requireUploadConnected(context.controller.signal);
          multipartFailure(error);
        }
        context.budget.received(bytes?.length ?? 0);
        if (!bytes?.length) throw invalid('圖片檔案沒有內容，請重新選圖。');
        requireUploadConnected(context.controller.signal);
        const fingerprint = createHash('sha256')
          .update(
            JSON.stringify({
              kind: 'save_thumbnail',
              tripId: context.tripId,
              expectedLifecycleRevision: context.lifecycleRevision,
              expectedThumbnailRevision: context.thumbnailRevision,
              imageSha256: createHash('sha256').update(bytes).digest('hex'),
            }),
          )
          .digest();
        const prior = await db.transaction((tx) => replay(tx, context, fingerprint), {
          isolationLevel: 'repeatable read',
          accessMode: 'read only',
        });
        if (prior) return prior;
        assertActive(await readOwnedTripState(db, context.ownerId, context.tripId));
        const normalized = await context.budget.process(() =>
          nativeThumbnailProcessor.process(bytes!, context.controller.signal),
        );

        return await db
          .transaction(async (tx) => {
            const owner = and(eq(trips.ownerId, context.ownerId), eq(trips.id, context.tripId));
            const [trip] = await tx.select().from(trips).where(owner).for('update');
            const repeated = await replay(tx, context, fingerprint);
            if (repeated) return repeated;
            if (!trip) {
              assertActive(await readOwnedTripState(tx, context.ownerId, context.tripId));
              throw notFound();
            }
            if (trip.deletedAt !== null)
              throw new HttpError(409, 'TRIP_TRASHED', '旅行已在垃圾桶。');
            if (trip.lifecycleRevision !== BigInt(context.lifecycleRevision))
              throw new HttpError(409, 'TRIP_STATE_CHANGED', '旅行狀態已更新，請重新確認。');
            if (trip.thumbnailRevision !== BigInt(context.thumbnailRevision))
              throw new HttpError(409, 'THUMBNAIL_UPDATED', '縮圖已更新，請重新確認。');
            requireUploadConnected(context.controller.signal);
            const updatedAt = new Date();
            await tx
              .insert(tripThumbnails)
              .values({
                ownerId: context.ownerId,
                tripId: context.tripId,
                imageWebp: normalized.bytes,
                width: normalized.width,
                height: normalized.height,
                updatedAt,
              })
              .onConflictDoUpdate({
                target: [tripThumbnails.ownerId, tripThumbnails.tripId],
                set: {
                  imageWebp: normalized.bytes,
                  width: normalized.width,
                  height: normalized.height,
                  updatedAt,
                },
              });
            requireUploadConnected(context.controller.signal);
            const revision = trip.thumbnailRevision + 1n;
            await tx.update(trips).set({ thumbnailRevision: revision, updatedAt }).where(owner);
            const [receipt] = await tx
              .insert(tripOperationReceipts)
              .values({
                ownerId: context.ownerId,
                operationId: context.operationId,
                tripId: context.tripId,
                kind: 'save_thumbnail',
                requestFingerprint: fingerprint,
                resultState: 'active',
                resultLifecycleRevision: trip.lifecycleRevision,
                resultThumbnailRevision: revision,
                resultThumbnailPresent: true,
              })
              .returning();
            requireUploadConnected(context.controller.signal);
            const state = await readOwnedTripState(tx, context.ownerId, context.tripId);
            requireUploadConnected(context.controller.signal);

            return { result: receiptResult(receipt!), currentState: state };
          })
          .catch((error: unknown) =>
            resolveReceiptConflict(
              db,
              context.ownerId,
              context.tripId,
              context.operationId,
              fingerprint,
              error,
            ),
          );
      } finally {
        await finish(request, context);
      }
    },
  );
  api.delete(
    '/api/trips/:tripId/thumbnail',
    {
      schema: {
        params: Type.Object({ tripId: Uuid }, { additionalProperties: false }),
        response: {
          200: OperationOutcome,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          409: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);
      const { operationId, lifecycleRevision, thumbnailRevision } =
        thumbnailCommandHeaders(request);
      const tripId = request.params.tripId;
      const fingerprint = createHash('sha256')
        .update(
          JSON.stringify({
            kind: 'reset_thumbnail',
            tripId,
            expectedLifecycleRevision: lifecycleRevision,
            expectedThumbnailRevision: thumbnailRevision,
          }),
        )
        .digest();

      return db
        .transaction(async (tx) => {
          const owner = and(eq(trips.ownerId, user.id), eq(trips.id, tripId));
          const [trip] = await tx.select().from(trips).where(owner).for('update');
          const [prior] = await tx
            .select()
            .from(tripOperationReceipts)
            .where(
              and(
                eq(tripOperationReceipts.ownerId, user.id),
                eq(tripOperationReceipts.operationId, operationId),
              ),
            );
          if (prior) {
            if (prior.tripId !== tripId || !prior.requestFingerprint.equals(fingerprint))
              throw new HttpError(409, 'OPERATION_ID_CONFLICT', '這個操作識別已用於不同內容。');

            return {
              result: receiptResult(prior),
              currentState: await readOwnedTripState(tx, user.id, tripId),
            };
          }
          assertActive(await readOwnedTripState(tx, user.id, tripId));
          if (!trip) throw notFound();
          if (trip.lifecycleRevision !== BigInt(lifecycleRevision))
            throw new HttpError(409, 'TRIP_STATE_CHANGED', '旅行狀態已更新，請重新確認。');
          if (trip.thumbnailRevision !== BigInt(thumbnailRevision))
            throw new HttpError(409, 'THUMBNAIL_UPDATED', '縮圖已更新，請重新確認。');
          await tx
            .delete(tripThumbnails)
            .where(and(eq(tripThumbnails.ownerId, user.id), eq(tripThumbnails.tripId, tripId)));
          const revision = trip.thumbnailRevision + 1n;
          await tx
            .update(trips)
            .set({ thumbnailRevision: revision, updatedAt: new Date() })
            .where(owner);
          const [receipt] = await tx
            .insert(tripOperationReceipts)
            .values({
              ownerId: user.id,
              operationId,
              tripId,
              kind: 'reset_thumbnail',
              requestFingerprint: fingerprint,
              resultState: 'active',
              resultLifecycleRevision: trip.lifecycleRevision,
              resultThumbnailRevision: revision,
              resultThumbnailPresent: false,
            })
            .returning();

          return {
            result: receiptResult(receipt!),
            currentState: await readOwnedTripState(tx, user.id, tripId),
          };
        })
        .catch((error: unknown) =>
          resolveReceiptConflict(db, user.id, tripId, operationId, fingerprint, error),
        );
    },
  );
  for (const trash of [false, true]) {
    api.get(
      trash
        ? '/api/trips/trash/:tripId/thumbnail/:thumbnailRevision'
        : '/api/trips/:tripId/thumbnail/:thumbnailRevision',
      {
        schema: {
          params: Type.Object(
            { tripId: Uuid, thumbnailRevision: Revision },
            { additionalProperties: false },
          ),
          response: {
            200: Type.Any(),
            400: ErrorResponse,
            401: ErrorResponse,
            404: ErrorResponse,
            409: ErrorResponse,
          },
        },
        async onRequest(_request, reply) {
          reply
            .header('Cache-Control', 'private, no-store')
            .header('X-Content-Type-Options', 'nosniff');
        },
      },
      async (request, reply) => {
        const user = await requireUser(auth, request, reply);
        const bytes = await db.transaction(
          async (tx) => {
            const [trip] = await tx
              .select()
              .from(trips)
              .where(and(eq(trips.ownerId, user.id), eq(trips.id, request.params.tripId)));
            if (!trip) throw notFound();
            if (trash && trip.deletedAt === null) throw notFound();
            if (!trash && trip.deletedAt !== null)
              throw new HttpError(409, 'TRIP_TRASHED', '旅行已在垃圾桶。');
            if (trip.thumbnailRevision !== BigInt(request.params.thumbnailRevision))
              throw notFound();
            const [image] = await tx
              .select({ bytes: tripThumbnails.imageWebp })
              .from(tripThumbnails)
              .where(and(eq(tripThumbnails.ownerId, user.id), eq(tripThumbnails.tripId, trip.id)));
            if (!image) throw notFound();

            return image.bytes;
          },
          { isolationLevel: 'repeatable read', accessMode: 'read only' },
        );

        return reply.type('image/webp').send(bytes);
      },
    );
  }
}
