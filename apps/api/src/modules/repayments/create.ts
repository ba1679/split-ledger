import { createHmac, timingSafeEqual } from 'node:crypto';
import { Type } from '@sinclair/typebox';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { and, eq, inArray } from 'drizzle-orm';
import { exactAmount, parseMoney, rational } from '@split-ledger/shared';
import { currencies, repayments, tripMembers } from '../../db/schema.js';
import { ErrorResponse, HttpError, Uuid, invalid, notFound } from '../../http.js';
import { requireUser } from '../auth/index.js';
import { readSplittingCalculation } from '../splitting/calculation.js';
import type { SplittingModuleDependencies } from '../splitting/dependencies.js';
import { ExactAmountSchema } from '../splitting/http-schema.js';
import { advanceAccountingRevision, requireOwnedTrip } from '../splitting/trip-scope.js';
import { RepaymentSchema, repaymentView } from './read.js';
import type { CreateRepaymentRequest, OverpaymentConfirmation } from './schema.js';

const Confirmation = Type.Object(
  {
    accountingRevision: Type.String({ pattern: '^(?:0|[1-9][0-9]*)$' }),
    excessAmount: ExactAmountSchema,
    reverseDebtorMemberId: Uuid,
    reverseCreditorMemberId: Uuid,
    confirmationToken: Type.String({ minLength: 1, maxLength: 2048 }),
  },
  { additionalProperties: false },
);
const Create = Type.Object(
  {
    id: Uuid,
    payerMemberId: Uuid,
    payeeMemberId: Uuid,
    amount: Type.String({ minLength: 1, maxLength: 25 }),
    currencyCode: Type.String({ pattern: '^[A-Z]{3}$' }),
    paidOn: Type.String({ format: 'date' }),
    overpaymentConfirmation: Type.Optional(Confirmation),
  },
  { additionalProperties: false },
);
const Warning = Type.Object(
  {
    code: Type.Literal('OVERPAYMENT_CONFIRMATION_REQUIRED'),
    message: Type.String(),
    confirmation: Confirmation,
  },
  { additionalProperties: false },
);
const conflict = () =>
  new HttpError(409, 'ACCOUNTING_REVISION_CONFLICT', '還款確認已更新，請重新確認目前的付款安排。');

type Snapshot = Omit<OverpaymentConfirmation, 'confirmationToken'>;

/** Stable request binding deliberately retains the exact submitted amount and date strings. */
function confirmationSignature(
  secret: string,
  ownerId: string,
  tripId: string,
  input: CreateRepaymentRequest,
  snapshot: Snapshot,
  expiresAt: string,
) {
  return createHmac('sha256', secret)
    .update(
      JSON.stringify([
        'independent-repayment-confirmation-v1',
        ownerId,
        tripId,
        input.id,
        input.payerMemberId,
        input.payeeMemberId,
        input.amount,
        input.currencyCode,
        input.paidOn,
        snapshot.accountingRevision,
        snapshot.excessAmount.numerator,
        snapshot.excessAmount.denominator,
        snapshot.excessAmount.minorUnit,
        snapshot.reverseDebtorMemberId,
        snapshot.reverseCreditorMemberId,
        expiresAt,
      ]),
    )
    .digest('base64url');
}

function validateConfirmation(
  secret: string,
  ownerId: string,
  tripId: string,
  input: CreateRepaymentRequest,
  expected: Snapshot,
) {
  const confirmation = input.overpaymentConfirmation!;
  if (
    confirmation.accountingRevision !== expected.accountingRevision ||
    confirmation.reverseDebtorMemberId !== expected.reverseDebtorMemberId ||
    confirmation.reverseCreditorMemberId !== expected.reverseCreditorMemberId ||
    confirmation.excessAmount.numerator !== expected.excessAmount.numerator ||
    confirmation.excessAmount.denominator !== expected.excessAmount.denominator ||
    confirmation.excessAmount.minorUnit !== expected.excessAmount.minorUnit
  )
    throw conflict();
  const match = /^(\d{13})\.([A-Za-z0-9_-]{43})$/.exec(confirmation.confirmationToken);
  if (!match || Number(match[1]) <= Date.now()) throw conflict();
  const signature = confirmationSignature(secret, ownerId, tripId, input, expected, match[1]!);
  if (!timingSafeEqual(Buffer.from(match[2]!), Buffer.from(signature))) throw conflict();
}

export function registerRepaymentCreateRoute({
  app,
  db,
  auth,
  config,
  hooks,
}: SplittingModuleDependencies) {
  const api = app.withTypeProvider<TypeBoxTypeProvider>();
  api.post(
    '/api/trips/:tripId/repayments',
    {
      schema: {
        params: Type.Object({ tripId: Uuid }, { additionalProperties: false }),
        body: Create,
        response: {
          201: RepaymentSchema,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          409: Type.Union([Warning, ErrorResponse]),
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
          const [existing] = await tx
            .select({ id: repayments.id })
            .from(repayments)
            .where(eq(repayments.id, input.id));
          if (existing)
            throw new HttpError(409, 'ID_CONFLICT', '這次建立的識別碼已被使用，請重新確認。');
          const ids = [...new Set([input.payerMemberId, input.payeeMemberId])];
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
          const [currency] = await tx
            .select()
            .from(currencies)
            .where(and(eq(currencies.code, input.currencyCode), eq(currencies.isSelectable, true)))
            .for('share');
          if (!currency) throw invalid('請選擇可用幣別。', 'currencyCode');
          let amountMinor: bigint;
          try {
            amountMinor = parseMoney(input.amount, currency.minorUnit, input.currencyCode);
          } catch (error) {
            if (error instanceof RangeError)
              throw invalid('請輸入符合幣別位數與範圍的正數金額。', 'amount');
            throw error;
          }
          const { calculated } = await readSplittingCalculation(tx, user.id, tripId);
          const selected = trip.simplifyDebts
            ? calculated.simplifiedArrangements
            : calculated.directArrangements;
          const outstanding = selected.find(
            (edge) =>
              edge.currencyCode === input.currencyCode &&
              edge.fromMemberId === input.payerMemberId &&
              edge.toMemberId === input.payeeMemberId,
          );
          const minorUnit = Math.max(currency.minorUnit, outstanding?.minorUnit ?? 0);
          const paid = amountMinor * 10n ** BigInt(minorUnit - currency.minorUnit);
          const due = outstanding
            ? rational(
                outstanding.amount.numerator * 10n ** BigInt(minorUnit - outstanding.minorUnit),
                outstanding.amount.denominator,
              )
            : rational(0n);
          const excess = rational(paid * due.denominator - due.numerator, due.denominator);
          if (
            input.overpaymentConfirmation &&
            input.overpaymentConfirmation.accountingRevision !== trip.accountingRevision.toString()
          )
            throw conflict();
          if (excess.numerator > 0n) {
            const snapshot: Snapshot = {
              accountingRevision: trip.accountingRevision.toString(),
              excessAmount: exactAmount(excess, minorUnit),
              reverseDebtorMemberId: input.payeeMemberId,
              reverseCreditorMemberId: input.payerMemberId,
            };
            if (input.overpaymentConfirmation)
              validateConfirmation(config.secret, user.id, tripId, input, snapshot);
            else {
              const expiresAt = String(Date.now() + 5 * 60_000);
              const signature = confirmationSignature(
                config.secret,
                user.id,
                tripId,
                input,
                snapshot,
                expiresAt,
              );
              const describe = (numerator: bigint, denominator: bigint) => {
                const divisor = denominator * 10n ** BigInt(minorUnit);
                const hundredths = (numerator * 200n + divisor) / (divisor * 2n);
                const fraction = (hundredths % 100n).toString().padStart(2, '0').replace(/0+$/, '');

                return `${hundredths / 100n}${fraction ? `.${fraction}` : ''}`;
              };

              return {
                warning: {
                  code: 'OVERPAYMENT_CONFIRMATION_REQUIRED' as const,
                  message: `實付 ${input.currencyCode} ${input.amount} 超過目前應付 ${describe(due.numerator, due.denominator)}，多付 ${describe(excess.numerator, excess.denominator)}；確認後收款人將反向應付付款人。`,
                  confirmation: { ...snapshot, confirmationToken: `${expiresAt}.${signature}` },
                },
              };
            }
          } else if (input.overpaymentConfirmation) throw conflict();
          const [saved] = await tx
            .insert(repayments)
            .values({
              id: input.id,
              ownerId: user.id,
              tripId,
              payerMemberId: input.payerMemberId,
              payeeMemberId: input.payeeMemberId,
              currencyCode: input.currencyCode,
              minorUnit: currency.minorUnit,
              amountMinor,
              paidOn: input.paidOn,
              kind: 'independent',
              settlementId: null,
            })
            .onConflictDoNothing()
            .returning();
          if (!saved)
            throw new HttpError(409, 'ID_CONFLICT', '這次建立的識別碼已被使用，請重新確認。');
          await hooks?.afterRepaymentInsert?.(context);
          await advanceAccountingRevision(tx, user.id, tripId);

          return { saved: repaymentView(saved) };
        },
        { isolationLevel: 'read committed' },
      );
      if (result.warning) return reply.code(409).send(result.warning);

      return reply.code(201).send(result.saved);
    },
  );
}
