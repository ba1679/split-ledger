import { Type } from '@sinclair/typebox';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { and, desc, eq } from 'drizzle-orm';
import { formatMoney } from '@split-ledger/shared';
import { repayments } from '../../db/schema.js';
import { Uuid, Timestamp, ErrorResponse, notFound } from '../../http.js';
import { requireUser } from '../auth/index.js';
import { requireOwnedTrip } from '../splitting/trip-scope.js';
import type { SplittingModuleDependencies } from '../splitting/dependencies.js';

export const RepaymentSchema = Type.Object(
  {
    id: Uuid,
    tripId: Uuid,
    payerMemberId: Uuid,
    payeeMemberId: Uuid,
    amount: Type.String(),
    currencyCode: Type.String(),
    minorUnit: Type.Integer({ minimum: 0, maximum: 4 }),
    paidOn: Type.String({ format: 'date' }),
    kind: Type.Union([Type.Literal('independent'), Type.Literal('settlement')]),
    settlementId: Type.Union([Uuid, Type.Null()]),
    createdAt: Timestamp,
  },
  { additionalProperties: false },
);

export function repaymentView(row: typeof repayments.$inferSelect) {
  return {
    id: row.id,
    tripId: row.tripId,
    payerMemberId: row.payerMemberId,
    payeeMemberId: row.payeeMemberId,
    amount: formatMoney(row.amountMinor, row.minorUnit),
    currencyCode: row.currencyCode,
    minorUnit: row.minorUnit,
    paidOn: row.paidOn,
    kind: row.kind,
    settlementId: row.settlementId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function registerRepaymentReadRoutes({ app, db, auth }: SplittingModuleDependencies) {
  const api = app.withTypeProvider<TypeBoxTypeProvider>();
  api.get(
    '/api/trips/:tripId/repayments',
    {
      schema: {
        params: Type.Object({ tripId: Uuid }, { additionalProperties: false }),
        response: {
          200: Type.Object({ items: Type.Array(RepaymentSchema) }, { additionalProperties: false }),
          401: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);
      const tripId = request.params.tripId;

      return db.transaction(
        async (tx) => {
          await requireOwnedTrip(tx, user.id, tripId);
          const rows = await tx
            .select()
            .from(repayments)
            .where(and(eq(repayments.ownerId, user.id), eq(repayments.tripId, tripId)))
            .orderBy(desc(repayments.paidOn), desc(repayments.id));

          return { items: rows.map(repaymentView) };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
  );
  api.get(
    '/api/trips/:tripId/repayments/:repaymentId',
    {
      schema: {
        params: Type.Object({ tripId: Uuid, repaymentId: Uuid }, { additionalProperties: false }),
        response: { 200: RepaymentSchema, 401: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);
      const [row] = await db
        .select()
        .from(repayments)
        .where(
          and(
            eq(repayments.ownerId, user.id),
            eq(repayments.tripId, request.params.tripId),
            eq(repayments.id, request.params.repaymentId),
          ),
        );
      if (!row) throw notFound();

      return repaymentView(row);
    },
  );
}
