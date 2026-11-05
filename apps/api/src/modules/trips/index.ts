import { Type, type Static } from '@sinclair/typebox';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyInstance } from 'fastify';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db/index.js';
import { trips, expenses } from '../../db/schema.js';
import { DateOnly, Timestamp, Uuid, ErrorResponse, invalid, notFound } from '../../http.js';
import { decodeTripCursor, encodeTripCursor } from '../../pagination.js';
import { requireUser, type Auth, type AuthConfig } from '../auth/index.js';

const Trip = Type.Object({
  id: Uuid, name: Type.String({ minLength: 1 }), startDate: DateOnly, endDate: DateOnly,
  expenseCount: Type.Integer({ minimum: 0 }), createdAt: Timestamp, updatedAt: Timestamp,
}, { additionalProperties: false });
const TripParams = Type.Object({ tripId: Uuid }, { additionalProperties: false });
const TripPatch = Type.Object({ name: Type.Optional(Type.String({ minLength: 1 })), startDate: Type.Optional(DateOnly), endDate: Type.Optional(DateOnly) }, { additionalProperties: false, minProperties: 1 });
const Query = Type.Object({
  limit: Type.Optional(Type.String({ pattern: '^[1-9][0-9]*$' })),
  cursor: Type.Optional(Type.String({ minLength: 1, maxLength: 2048 })),
}, { additionalProperties: false });
const projection = {
  id: trips.id, name: trips.name, startDate: trips.startDate, endDate: trips.endDate,
  createdAt: trips.createdAt, updatedAt: trips.updatedAt, expenseCount: sql<number>`count(${expenses.id})::int`,
  cursorTime: sql<string>`${trips.createdAt}::text`,
};
const countJoin = and(eq(expenses.ownerId, trips.ownerId), eq(expenses.tripId, trips.id));
function view(row: { createdAt: Date; updatedAt: Date; cursorTime: string; id: string; name: string; startDate: string | null; endDate: string | null; expenseCount: number }) {
  const { cursorTime: _cursorTime, ...rest } = row;
  return { ...rest, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
export function registerTripRoutes(app: FastifyInstance, db: Database, auth: Auth, config: AuthConfig) {
  const api = app.withTypeProvider<TypeBoxTypeProvider>();
  api.get('/api/trips', { schema: { querystring: Query, response: { 200: Type.Object({ items: Type.Array(Trip), nextCursor: Type.Union([Type.String(), Type.Null()]) }), 400: ErrorResponse, 401: ErrorResponse } } }, async (request, reply) => {
    const user = await requireUser(auth, request, reply);
    const limit = request.query.limit === undefined ? 50 : Number(request.query.limit);
    if (!Number.isSafeInteger(limit) || limit > 100) throw invalid('每頁筆數須為 1 到 100 的整數。');
    const cursor = request.query.cursor ? decodeTripCursor(request.query.cursor, user.id, config.secret) : undefined;
    const rows = await db.select(projection).from(trips).leftJoin(expenses, countJoin)
      .where(and(eq(trips.ownerId, user.id), cursor ? sql`(${trips.createdAt},${trips.id}) < (${cursor.time}::timestamptz,${cursor.id}::uuid)` : undefined))
      .groupBy(trips.id).orderBy(desc(trips.createdAt), desc(trips.id)).limit(limit + 1);
    const page = rows.slice(0, limit); const last = page.at(-1);
    const nextCursor = rows.length > limit && last ? encodeTripCursor({ owner: user.id, scope: 'trips', time: last.cursorTime, id: last.id }, config.secret) : null;
    return { items: page.map(view), nextCursor };
  });
  api.get('/api/trips/:tripId', { schema: { params: TripParams, response: { 200: Trip, 401: ErrorResponse, 404: ErrorResponse } } }, async (request, reply) => {
    const user = await requireUser(auth, request, reply);
    const [trip] = await db.select(projection).from(trips).leftJoin(expenses, countJoin).where(and(eq(trips.ownerId, user.id), eq(trips.id, request.params.tripId))).groupBy(trips.id);
    if (!trip) throw notFound(); return view(trip);
  });
  api.patch('/api/trips/:tripId', { schema: { params: TripParams, body: TripPatch, response: { 200: Trip, 400: ErrorResponse, 401: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse } } }, async (request, reply) => {
    const user = await requireUser(auth, request, reply);
    const patch: Static<typeof TripPatch> = request.body;
    return db.transaction(async tx => {
      const owner = and(eq(trips.ownerId, user.id), eq(trips.id, request.params.tripId));
      const [prior] = await tx.select().from(trips).where(owner).for('update');
      if (!prior) throw notFound();
      const name = patch.name === undefined ? prior.name : patch.name.trim();
      const startDate = patch.startDate === undefined ? prior.startDate : patch.startDate;
      const endDate = patch.endDate === undefined ? prior.endDate : patch.endDate;
      if (!name) throw invalid('請填寫旅行名稱。', 'name');
      if (startDate && endDate && endDate < startDate) throw invalid('結束日不能早於開始日。', 'endDate');
      await tx.update(trips).set({ name, startDate, endDate, updatedAt: new Date() }).where(owner);
      const [updated] = await tx.select(projection).from(trips).leftJoin(expenses, countJoin).where(owner).groupBy(trips.id);
      return view(updated!);
    });
  });
}
