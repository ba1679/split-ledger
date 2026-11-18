import { resolveReceiptConflict } from './receipt-conflict.js';
import { receiptResult } from './operation-result.js';
import { Revision, State, OperationOutcome } from './http-schema.js';
import { readOwnedTripState } from './state-query.js';
import { createHash } from 'node:crypto';
import { Type } from '@sinclair/typebox';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyInstance } from 'fastify';
import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import type { Database } from '../../../db/index.js';
import { trips, tripOperationReceipts } from '../../../db/schema.js';
import { ErrorResponse, HttpError, Uuid, Timestamp, notFound } from '../../../http.js';
import { decodeTripCursor, encodeTripCursor, tripPageLimit } from '../../../pagination.js';
import { requireUser, type Auth, type AuthConfig } from '../../auth/index.js';

const Params = Type.Object({ tripId: Uuid }, { additionalProperties: false });

const Command = Type.Object(
  { operationId: Uuid, expectedLifecycleRevision: Revision },
  { additionalProperties: false },
);

export function registerTripManagementRoutes(
  app: FastifyInstance,
  db: Database,
  auth: Auth,
  config: AuthConfig,
) {
  const api = app.withTypeProvider<TypeBoxTypeProvider>();
  api.get(
    '/api/trips/trash',
    {
      schema: {
        querystring: Type.Object(
          {
            limit: Type.Optional(Type.String({ pattern: '^[1-9][0-9]*$' })),
            cursor: Type.Optional(Type.String({ minLength: 1, maxLength: 2048 })),
          },
          { additionalProperties: false },
        ),
        response: {
          200: Type.Object(
            {
              items: Type.Array(
                Type.Object(
                  {
                    id: Uuid,
                    name: Type.String(),
                    deletedAt: Timestamp,
                    lifecycleRevision: Revision,
                    thumbnailRevision: Revision,
                    hasThumbnail: Type.Boolean(),
                  },
                  { additionalProperties: false },
                ),
              ),
              nextCursor: Type.Union([Type.String(), Type.Null()]),
            },
            { additionalProperties: false },
          ),
          400: ErrorResponse,
          401: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply),
        limit = tripPageLimit(request.query.limit);
      const cursor = request.query.cursor
        ? decodeTripCursor(request.query.cursor, user.id, config.secret, 'trips-trash')
        : undefined;
      const rows = await db
        .select({
          id: trips.id,
          name: trips.name,
          deletedAt: trips.deletedAt,
          lifecycleRevision: trips.lifecycleRevision,
          thumbnailRevision: trips.thumbnailRevision,
          hasThumbnail: sql<boolean>`EXISTS(SELECT 1 FROM trip_thumbnails WHERE owner_id=${trips.ownerId} AND trip_id=${trips.id})`,
          cursorTime: sql<string>`${trips.deletedAt}::text`,
        })
        .from(trips)
        .where(
          and(
            eq(trips.ownerId, user.id),
            isNotNull(trips.deletedAt),
            cursor
              ? sql`(${trips.deletedAt},${trips.id}) < (${cursor.time}::timestamptz,${cursor.id}::uuid)`
              : undefined,
          ),
        )
        .orderBy(desc(trips.deletedAt), desc(trips.id))
        .limit(limit + 1);
      const page = rows.slice(0, limit),
        last = page.at(-1);

      return {
        items: page.map((row) => ({
          id: row.id,
          name: row.name,
          deletedAt: row.deletedAt!.toISOString(),
          lifecycleRevision: String(row.lifecycleRevision),
          thumbnailRevision: String(row.thumbnailRevision),
          hasThumbnail: row.hasThumbnail,
        })),
        nextCursor:
          rows.length > limit && last
            ? encodeTripCursor(
                { owner: user.id, scope: 'trips-trash', time: last.cursorTime, id: last.id },
                config.secret,
              )
            : null,
      };
    },
  );
  api.get(
    '/api/trips/:tripId/state',
    {
      schema: { params: Params, response: { 200: State, 401: ErrorResponse, 404: ErrorResponse } },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);

      return db.transaction((tx) => readOwnedTripState(tx, user.id, request.params.tripId), {
        isolationLevel: 'repeatable read',
        accessMode: 'read only',
      });
    },
  );
  api.get(
    '/api/trips/:tripId/operations/:operationId',
    {
      schema: {
        params: Type.Object({ tripId: Uuid, operationId: Uuid }, { additionalProperties: false }),
        response: {
          200: OperationOutcome,
          400: ErrorResponse,
          401: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);

      return db.transaction(
        async (tx) => {
          const currentState = await readOwnedTripState(tx, user.id, request.params.tripId);
          const [receipt] = await tx
            .select()
            .from(tripOperationReceipts)
            .where(
              and(
                eq(tripOperationReceipts.ownerId, user.id),
                eq(tripOperationReceipts.tripId, request.params.tripId),
                eq(tripOperationReceipts.operationId, request.params.operationId),
              ),
            );
          if (!receipt) throw new HttpError(404, 'OPERATION_NOT_FOUND', '尚無可查證的操作結果。');

          return {
            result: receiptResult(receipt),
            currentState,
          };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
  );
  for (const [path, kind, targetState] of [
    ['trash', 'move_to_trash', 'trash'],
    ['restore', 'restore', 'active'],
    ['purge', 'purge', 'purged'],
  ] as const) {
    api.post(
      `/api/trips/:tripId/${path}`,
      {
        schema: {
          params: Params,
          body: Command,
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
        const user = await requireUser(auth, request, reply),
          tripId = request.params.tripId,
          input = request.body;
        const fingerprint = createHash('sha256')
          .update(
            JSON.stringify({
              kind,
              tripId,
              expectedLifecycleRevision: input.expectedLifecycleRevision,
            }),
          )
          .digest();

        return db
          .transaction(async (tx) => {
            const owner = and(eq(trips.ownerId, user.id), eq(trips.id, tripId));
            const [trip] = await tx.select().from(trips).where(owner).for('update');
            const [receipt] = await tx
              .select()
              .from(tripOperationReceipts)
              .where(
                and(
                  eq(tripOperationReceipts.ownerId, user.id),
                  eq(tripOperationReceipts.operationId, input.operationId),
                ),
              );
            if (receipt) {
              if (receipt.tripId !== tripId || !receipt.requestFingerprint.equals(fingerprint))
                throw new HttpError(409, 'OPERATION_ID_CONFLICT', '這個操作識別已用於不同內容。');

              return {
                result: receiptResult(receipt),
                currentState: await readOwnedTripState(tx, user.id, tripId),
              };
            }
            if (!trip) {
              const state = await readOwnedTripState(tx, user.id, tripId);
              if (state.state === 'purged')
                throw new HttpError(409, 'TRIP_PURGED', '旅行已永久刪除。');
              throw notFound();
            }
            if (trip.lifecycleRevision !== BigInt(input.expectedLifecycleRevision))
              throw new HttpError(409, 'TRIP_STATE_CHANGED', '旅行狀態已更新，請重新確認。');
            if (targetState === 'trash' && trip.deletedAt !== null)
              throw new HttpError(409, 'TRIP_TRASHED', '旅行已在垃圾桶。');
            if ((targetState === 'active' || targetState === 'purged') && trip.deletedAt === null)
              throw new HttpError(409, 'TRIP_NOT_TRASHED', '旅行不在垃圾桶。');
            const revision = trip.lifecycleRevision + 1n;
            if (targetState === 'purged') {
              await tx.execute(sql`SELECT app_purge_trip(${user.id}::text,${tripId}::uuid)`);
            } else {
              await tx
                .update(trips)
                .set({
                  deletedAt: targetState === 'trash' ? new Date() : null,
                  lifecycleRevision: revision,
                  updatedAt: new Date(),
                })
                .where(owner);
            }
            await tx.insert(tripOperationReceipts).values({
              ownerId: user.id,
              operationId: input.operationId,
              tripId,
              kind,
              requestFingerprint: fingerprint,
              resultState: targetState,
              resultLifecycleRevision: revision,
              resultThumbnailRevision: trip.thumbnailRevision,
              resultThumbnailPresent: null,
            });

            return {
              result: {
                operationId: input.operationId,
                kind,
                state: targetState,
                lifecycleRevision: String(revision),
                thumbnailRevision: String(trip.thumbnailRevision),
                thumbnailPresent: null,
              },
              currentState: await readOwnedTripState(tx, user.id, tripId),
            };
          })
          .catch((error: unknown) =>
            resolveReceiptConflict(db, user.id, tripId, input.operationId, fingerprint, error),
          );
      },
    );
  }
}
