import { Type } from '@sinclair/typebox';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { and, eq, inArray } from 'drizzle-orm';
import { parseMoney, rational } from '@split-ledger/shared';
import {
  currencies,
  repayments,
  settlements,
  settlementAdjustments,
  tripMembers,
} from '../../db/schema.js';
import { ErrorResponse, HttpError, Uuid, invalid, notFound } from '../../http.js';
import { requireUser } from '../auth/index.js';
import { readSplittingCalculation } from '../splitting/calculation.js';
import type { SplittingModuleDependencies } from '../splitting/dependencies.js';
import { ExactAmountSchema } from '../splitting/http-schema.js';
import { advanceAccountingRevision, requireOwnedTrip } from '../splitting/trip-scope.js';
import { settlementArrangements } from './arrangements.js';
import { SettlementRecordSchema, readSettlementRecord } from './record.js';

const Create = Type.Object(
  {
    id: Uuid,
    repaymentId: Uuid,
    arrangementKey: Type.String({ minLength: 1 }),
    accountingRevision: Type.String({ pattern: '^(?:0|[1-9][0-9]*)$' }),
    debtorMemberId: Uuid,
    creditorMemberId: Uuid,
    currencyCode: Type.String({ pattern: '^[A-Z]{3}$' }),
    expectedAmount: ExactAmountSchema,
    paidAmount: Type.String({ minLength: 1, maxLength: 25 }),
    paidOn: Type.String({ format: 'date' }),
  },
  { additionalProperties: false },
);
const idConflict = () =>
  new HttpError(409, 'ID_CONFLICT', '這次建立的識別碼已被使用，請重新確認。');
const arrangementConflict = () =>
  new HttpError(409, 'ARRANGEMENT_NOT_FOUND', '付款安排已更新，請重新整理。');

export function registerSettlementCreateRoute({
  app,
  db,
  auth,
  config,
  hooks,
}: SplittingModuleDependencies) {
  const api = app.withTypeProvider<TypeBoxTypeProvider>();
  api.post(
    '/api/trips/:tripId/settlements',
    {
      schema: {
        params: Type.Object({ tripId: Uuid }, { additionalProperties: false }),
        body: Create,
        response: {
          201: SettlementRecordSchema,
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
      const tripId = request.params.tripId;
      const input = request.body;
      const result = await db.transaction(
        async (tx) => {
          const context = { ownerId: user.id, tripId, commandId: input.id };
          await hooks?.beforeTripLock?.(context);
          const trip = await requireOwnedTrip(tx, user.id, tripId, true);
          await hooks?.afterTripLock?.(context);
          const ids = [...new Set([input.debtorMemberId, input.creditorMemberId])];
          const members = await tx
            .select()
            .from(tripMembers)
            .where(
              and(
                eq(tripMembers.ownerId, user.id),
                eq(tripMembers.tripId, tripId),
                inArray(tripMembers.id, ids),
              ),
            );
          if (members.length !== ids.length) throw notFound();
          if (ids.length !== 2 || members.some((member) => !member.isActive))
            throw invalid('請選擇兩位不同且啟用的成員。');
          const [existingSettlement] = await tx
            .select({ id: settlements.id })
            .from(settlements)
            .where(eq(settlements.id, input.id));
          const [existingRepayment] = await tx
            .select({ id: repayments.id })
            .from(repayments)
            .where(eq(repayments.id, input.repaymentId));
          if (existingSettlement || existingRepayment) throw idConflict();
          if (input.accountingRevision !== trip.accountingRevision.toString())
            throw new HttpError(
              409,
              'ACCOUNTING_REVISION_CONFLICT',
              '帳目已更新，請重新整理付款安排。',
            );
          const { calculated } = await readSplittingCalculation(tx, user.id, tripId);
          const arrangement = settlementArrangements(
            config.secret,
            user.id,
            tripId,
            trip,
            calculated,
          ).find((edge) => edge.key === input.arrangementKey);
          if (
            !arrangement ||
            arrangement.debtorMemberId !== input.debtorMemberId ||
            arrangement.creditorMemberId !== input.creditorMemberId ||
            arrangement.currencyCode !== input.currencyCode ||
            arrangement.amount.numerator !== input.expectedAmount.numerator ||
            arrangement.amount.denominator !== input.expectedAmount.denominator ||
            arrangement.amount.minorUnit !== input.expectedAmount.minorUnit
          )
            throw arrangementConflict();
          const [currency] = await tx
            .select()
            .from(currencies)
            .where(and(eq(currencies.code, input.currencyCode), eq(currencies.isSelectable, true)))
            .for('share');
          if (!currency) throw invalid('請選擇可用幣別。', 'currencyCode');
          let amountMinor: bigint;
          try {
            amountMinor = parseMoney(input.paidAmount, currency.minorUnit, input.currencyCode);
          } catch (error) {
            if (error instanceof RangeError)
              throw invalid('請輸入符合幣別位數與範圍的正數金額。', 'paidAmount');
            throw error;
          }
          const obligation = arrangement.amount;
          const minorUnit = Math.max(obligation.minorUnit, currency.minorUnit);
          const difference = rational(
            BigInt(obligation.numerator) * 10n ** BigInt(minorUnit - obligation.minorUnit) -
              amountMinor *
                10n ** BigInt(minorUnit - currency.minorUnit) *
                BigInt(obligation.denominator),
            BigInt(obligation.denominator),
          );
          const [saved] = await tx
            .insert(settlements)
            .values({
              id: input.id,
              ownerId: user.id,
              tripId,
              debtorMemberId: input.debtorMemberId,
              creditorMemberId: input.creditorMemberId,
              currencyCode: input.currencyCode,
              obligationNumerator: obligation.numerator,
              obligationDenominator: obligation.denominator,
              obligationMinorUnit: obligation.minorUnit,
              arrangementKey: input.arrangementKey,
              sourceRevision: trip.accountingRevision,
              simplifyDebts: trip.simplifyDebts,
            })
            .onConflictDoNothing()
            .returning({ id: settlements.id });
          if (!saved) throw idConflict();
          await hooks?.afterSettlementInsert?.(context);
          const [payment] = await tx
            .insert(repayments)
            .values({
              id: input.repaymentId,
              ownerId: user.id,
              tripId,
              payerMemberId: input.debtorMemberId,
              payeeMemberId: input.creditorMemberId,
              amountMinor,
              currencyCode: input.currencyCode,
              minorUnit: currency.minorUnit,
              paidOn: input.paidOn,
              kind: 'settlement',
              settlementId: input.id,
            })
            .onConflictDoNothing()
            .returning({ id: repayments.id });
          if (!payment) throw idConflict();
          await hooks?.afterRepaymentInsert?.(context);
          const adjustment = {
            settlementId: input.id,
            ownerId: user.id,
            tripId,
            currencyCode: input.currencyCode,
            minorUnit,
            denominator: difference.denominator.toString(),
          };
          await tx.insert(settlementAdjustments).values({
            ...adjustment,
            memberId: input.debtorMemberId,
            numerator: difference.numerator.toString(),
          });
          await hooks?.afterFirstAdjustmentInsert?.(context);
          await tx.insert(settlementAdjustments).values({
            ...adjustment,
            memberId: input.creditorMemberId,
            numerator: (-difference.numerator).toString(),
          });
          await advanceAccountingRevision(tx, user.id, tripId);

          return readSettlementRecord(tx, user.id, tripId, input.id);
        },
        { isolationLevel: 'read committed' },
      );

      return reply.code(201).send(result);
    },
  );
}
