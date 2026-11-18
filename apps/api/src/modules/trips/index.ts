import type { TripManagementHooks } from './management/dependencies.js';
import { registerTripThumbnailRoutes } from './management/image-routes.js';
import { registerTripManagementRoutes } from './management/routes.js';
import { Type } from '@sinclair/typebox';
import { randomUUID } from 'node:crypto';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyInstance } from 'fastify';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '../../db/index.js';
import { trips, expenses, tripMembers } from '../../db/schema.js';
import {
  DateOnly,
  Timestamp,
  Uuid,
  ErrorResponse,
  HttpError,
  invalid,
  notFound,
  postgresError,
} from '../../http.js';
import { decodeTripCursor, encodeTripCursor, tripPageLimit } from '../../pagination.js';
import { requireUser, type Auth, type AuthConfig } from '../auth/index.js';
import { assertActiveTrip } from '../splitting/trip-scope.js';

const Trip = Type.Object(
  {
    id: Uuid,
    name: Type.String({ minLength: 1 }),
    startDate: DateOnly,
    endDate: DateOnly,
    expenseCount: Type.Integer({ minimum: 0 }),
    ownerMemberId: Uuid,
    simplifyDebts: Type.Boolean(),
    accountingRevision: Type.String({ pattern: '^(?:0|[1-9][0-9]*)$' }),
    lifecycleRevision: Type.String({ pattern: '^(?:0|[1-9][0-9]*)$' }),
    thumbnailRevision: Type.String({ pattern: '^(?:0|[1-9][0-9]*)$' }),
    hasThumbnail: Type.Boolean(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  },
  { additionalProperties: false },
);
const TripParams = Type.Object({ tripId: Uuid }, { additionalProperties: false });
const TripPatch = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1 })),
    startDate: Type.Optional(DateOnly),
    endDate: Type.Optional(DateOnly),
    simplifyDebts: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false, minProperties: 1 },
);
const TripCreate = Type.Object(
  {
    id: Uuid,
    name: Type.String({ minLength: 1 }),
    startDate: Type.Optional(DateOnly),
    endDate: Type.Optional(DateOnly),
  },
  { additionalProperties: false },
);
const Query = Type.Object(
  {
    limit: Type.Optional(Type.String({ pattern: '^[1-9][0-9]*$' })),
    cursor: Type.Optional(Type.String({ minLength: 1, maxLength: 2048 })),
  },
  { additionalProperties: false },
);
const projection = {
  id: trips.id,
  name: trips.name,
  startDate: trips.startDate,
  endDate: trips.endDate,
  createdAt: trips.createdAt,
  updatedAt: trips.updatedAt,
  expenseCount: sql<number>`count(${expenses.id})::int`,
  ownerMemberId: sql<string>`(SELECT id FROM trip_members WHERE trip_id=${trips.id} AND owner_id=${trips.ownerId} AND role='owner')`,
  simplifyDebts: trips.simplifyDebts,
  accountingRevision: trips.accountingRevision,
  lifecycleRevision: trips.lifecycleRevision,
  thumbnailRevision: trips.thumbnailRevision,
  hasThumbnail: sql<boolean>`EXISTS(SELECT 1 FROM trip_thumbnails WHERE owner_id=${trips.ownerId} AND trip_id=${trips.id})`,
  deletedAt: trips.deletedAt,
  cursorTime: sql<string>`${trips.createdAt}::text`,
};
const countJoin = and(eq(expenses.ownerId, trips.ownerId), eq(expenses.tripId, trips.id));

function view(row: {
  createdAt: Date;
  updatedAt: Date;
  cursorTime: string;
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  expenseCount: number;
  ownerMemberId: string;
  simplifyDebts: boolean;
  accountingRevision: bigint;
  lifecycleRevision: bigint;
  thumbnailRevision: bigint;
  hasThumbnail: boolean;
  deletedAt: Date | null;
}) {
  const { cursorTime: _cursorTime, deletedAt: _deletedAt, ...rest } = row;

  return {
    ...rest,
    accountingRevision: row.accountingRevision.toString(),
    lifecycleRevision: row.lifecycleRevision.toString(),
    thumbnailRevision: row.thumbnailRevision.toString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function validatedTripFields(name: string, startDate: string | null, endDate: string | null) {
  const trimmedName = name.trim();

  if (!trimmedName) throw invalid('請填寫旅行名稱。', 'name');
  if (startDate && endDate && endDate < startDate)
    throw invalid('結束日不能早於開始日。', 'endDate');

  return { name: trimmedName, startDate, endDate };
}

export function registerTripRoutes(
  app: FastifyInstance,
  db: Database,
  auth: Auth,
  config: AuthConfig,
  hooks?: TripManagementHooks,
) {
  const api = app.withTypeProvider<TypeBoxTypeProvider>();
  registerTripManagementRoutes(app, db, auth, config);
  registerTripThumbnailRoutes(app, db, auth, hooks);

  api.post(
    '/api/trips',
    {
      schema: {
        body: TripCreate,
        response: {
          201: Trip,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          409: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);
      const fields = validatedTripFields(
        request.body.name,
        request.body.startDate ?? null,
        request.body.endDate ?? null,
      );
      const created = await db
        .transaction(async (tx) => {
          const [inserted] = await tx
            .insert(trips)
            .values({ id: request.body.id, ownerId: user.id, ...fields })
            .onConflictDoNothing()
            .returning({ id: trips.id });

          if (!inserted)
            throw new HttpError(409, 'ID_CONFLICT', '這次建立的識別碼已被使用，請重新確認。');

          await tx.insert(tripMembers).values({
            id: randomUUID(),
            ownerId: user.id,
            tripId: inserted.id,
            role: 'owner',
            name: user.name.trim(),
            isActive: true,
          });

          const [row] = await tx
            .select(projection)
            .from(trips)
            .leftJoin(expenses, countJoin)
            .where(and(eq(trips.ownerId, user.id), eq(trips.id, inserted.id)))
            .groupBy(trips.id);

          return view(row!);
        })
        .catch((error: unknown) => {
          if (postgresError(error)?.code === '23505')
            throw new HttpError(409, 'ID_CONFLICT', '這次建立的識別碼已被使用，請重新確認。');
          throw error;
        });

      return reply.code(201).send(created);
    },
  );

  api.get(
    '/api/trips',
    {
      schema: {
        querystring: Query,
        response: {
          200: Type.Object({
            items: Type.Array(Trip),
            nextCursor: Type.Union([Type.String(), Type.Null()]),
          }),
          400: ErrorResponse,
          401: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);
      const limit = tripPageLimit(request.query.limit);

      const cursor = request.query.cursor
        ? decodeTripCursor(request.query.cursor, user.id, config.secret)
        : undefined;
      const rows = await db
        .select(projection)
        .from(trips)
        .leftJoin(expenses, countJoin)
        .where(
          and(
            eq(trips.ownerId, user.id),
            isNull(trips.deletedAt),
            cursor
              ? sql`(${trips.createdAt},${trips.id}) < (${cursor.time}::timestamptz,${cursor.id}::uuid)`
              : undefined,
          ),
        )
        .groupBy(trips.id)
        .orderBy(desc(trips.createdAt), desc(trips.id))
        .limit(limit + 1);
      const page = rows.slice(0, limit);
      const last = page.at(-1);
      const nextCursor =
        rows.length > limit && last
          ? encodeTripCursor(
              { owner: user.id, scope: 'trips', time: last.cursorTime, id: last.id },
              config.secret,
            )
          : null;

      return { items: page.map(view), nextCursor };
    },
  );

  api.get(
    '/api/trips/:tripId',
    {
      schema: {
        params: TripParams,
        response: { 200: Trip, 401: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);
      const [trip] = await db
        .select(projection)
        .from(trips)
        .leftJoin(expenses, countJoin)
        .where(and(eq(trips.ownerId, user.id), eq(trips.id, request.params.tripId)))
        .groupBy(trips.id);

      if (!trip) throw notFound();
      assertActiveTrip(trip);

      return view(trip);
    },
  );

  api.patch(
    '/api/trips/:tripId',
    {
      schema: {
        params: TripParams,
        body: TripPatch,
        response: {
          200: Trip,
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
      const patch = request.body;

      return db.transaction(async (tx) => {
        const owner = and(eq(trips.ownerId, user.id), eq(trips.id, request.params.tripId));
        const [prior] = await tx.select().from(trips).where(owner).for('update');

        if (!prior) throw notFound();
        assertActiveTrip(prior);
        const fields = validatedTripFields(
          patch.name === undefined ? prior.name : patch.name,
          patch.startDate === undefined ? prior.startDate : patch.startDate,
          patch.endDate === undefined ? prior.endDate : patch.endDate,
        );

        await tx
          .update(trips)
          .set({
            ...fields,
            simplifyDebts: patch.simplifyDebts ?? prior.simplifyDebts,
            accountingRevision:
              prior.accountingRevision + (patch.simplifyDebts !== undefined ? 1n : 0n),
            updatedAt: new Date(),
          })
          .where(owner);
        const [updated] = await tx
          .select(projection)
          .from(trips)
          .leftJoin(expenses, countJoin)
          .where(owner)
          .groupBy(trips.id);

        return view(updated!);
      });
    },
  );
}
