import { Type } from '@sinclair/typebox';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { and, asc, eq } from 'drizzle-orm';
import { exactAmount, rational } from '@split-ledger/shared';
import type { Database } from '../../db/index.js';
import { repayments, settlements, settlementAdjustments } from '../../db/schema.js';
import { Uuid, Timestamp, ErrorResponse, notFound } from '../../http.js';
import { requireUser } from '../auth/index.js';
import { ExactAmountSchema } from '../splitting/http-schema.js';
import type { SplittingModuleDependencies } from '../splitting/dependencies.js';
import { requireOwnedTrip } from '../splitting/trip-scope.js';
import { RepaymentSchema, repaymentView } from '../repayments/read.js';

export const SettlementRecordSchema = Type.Object(
  {
    id: Uuid,
    tripId: Uuid,
    arrangementKey: Type.String(),
    sourceRevision: Type.String({ pattern: '^(?:0|[1-9][0-9]*)$' }),
    simplifyDebts: Type.Boolean(),
    debtorMemberId: Uuid,
    creditorMemberId: Uuid,
    currencyCode: Type.String(),
    obligation: ExactAmountSchema,
    repayment: RepaymentSchema,
    adjustments: Type.Array(
      Type.Object(
        { memberId: Uuid, currencyCode: Type.String(), amount: ExactAmountSchema },
        { additionalProperties: false },
      ),
      { minItems: 2, maxItems: 2 },
    ),
    createdAt: Timestamp,
  },
  { additionalProperties: false },
);

/** Caller supplies either its write transaction or one consistent read-only snapshot. */
export async function readSettlementRecord(
  db: Pick<Database, 'select'>,
  ownerId: string,
  tripId: string,
  settlementId: string,
) {
  const [row] = await db
    .select()
    .from(settlements)
    .where(
      and(
        eq(settlements.ownerId, ownerId),
        eq(settlements.tripId, tripId),
        eq(settlements.id, settlementId),
      ),
    );
  if (!row) throw notFound();
  const [payment] = await db
    .select()
    .from(repayments)
    .where(
      and(
        eq(repayments.ownerId, ownerId),
        eq(repayments.tripId, tripId),
        eq(repayments.settlementId, settlementId),
      ),
    );
  const adjustments = await db
    .select()
    .from(settlementAdjustments)
    .where(
      and(
        eq(settlementAdjustments.ownerId, ownerId),
        eq(settlementAdjustments.tripId, tripId),
        eq(settlementAdjustments.settlementId, settlementId),
      ),
    )
    .orderBy(asc(settlementAdjustments.memberId));
  if (!payment || adjustments.length !== 2) throw new Error('Incomplete settlement record');

  return {
    id: row.id,
    tripId: row.tripId,
    arrangementKey: row.arrangementKey,
    sourceRevision: row.sourceRevision.toString(),
    simplifyDebts: row.simplifyDebts,
    debtorMemberId: row.debtorMemberId,
    creditorMemberId: row.creditorMemberId,
    currencyCode: row.currencyCode,
    obligation: exactAmount(
      rational(BigInt(row.obligationNumerator), BigInt(row.obligationDenominator)),
      row.obligationMinorUnit,
    ),
    repayment: repaymentView(payment),
    adjustments: adjustments.map((adjustment) => ({
      memberId: adjustment.memberId,
      currencyCode: adjustment.currencyCode,
      amount: exactAmount(
        rational(BigInt(adjustment.numerator), BigInt(adjustment.denominator)),
        adjustment.minorUnit,
      ),
    })),
    createdAt: row.createdAt.toISOString(),
  };
}

export function registerSettlementRecordRoute({ app, db, auth }: SplittingModuleDependencies) {
  const api = app.withTypeProvider<TypeBoxTypeProvider>();
  api.get(
    '/api/trips/:tripId/settlements/:settlementId',
    {
      schema: {
        params: Type.Object({ tripId: Uuid, settlementId: Uuid }, { additionalProperties: false }),
        response: { 200: SettlementRecordSchema, 401: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);

      return db.transaction(
        async (tx) => {
          await requireOwnedTrip(tx, user.id, request.params.tripId);

          return readSettlementRecord(
            tx,
            user.id,
            request.params.tripId,
            request.params.settlementId,
          );
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
  );
}
