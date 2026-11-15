import { Type } from '@sinclair/typebox';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { exactAmount, type PaymentArrangement } from '@split-ledger/shared';
import { Uuid, ErrorResponse } from '../../http.js';
import { requireUser } from '../auth/index.js';
import { readSplittingCalculation } from '../splitting/calculation.js';
import { requireOwnedTrip } from '../splitting/trip-scope.js';
import type { SplittingModuleDependencies } from '../splitting/dependencies.js';
import { ExactAmountSchema } from '../splitting/http-schema.js';
import { settlementArrangements } from './arrangements.js';

const View = Type.Object(
  {
    accountingRevision: Type.String({ pattern: '^(?:0|[1-9][0-9]*)$' }),
    simplifyDebts: Type.Boolean(),
    balances: Type.Array(
      Type.Object(
        { memberId: Uuid, currencyCode: Type.String(), netAmount: ExactAmountSchema },
        { additionalProperties: false },
      ),
    ),
    arrangements: Type.Array(
      Type.Object(
        {
          key: Type.String(),
          debtorMemberId: Uuid,
          creditorMemberId: Uuid,
          currencyCode: Type.String(),
          amount: ExactAmountSchema,
        },
        { additionalProperties: false },
      ),
    ),
    explanation: Type.String(),
    directArrangementCount: Type.Integer({ minimum: 0 }),
    suggestedArrangementCount: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export function registerSettlementReadRoutes({
  app,
  db,
  auth,
  config,
}: SplittingModuleDependencies) {
  const api = app.withTypeProvider<TypeBoxTypeProvider>();
  api.get(
    '/api/trips/:tripId/settlement',
    {
      schema: {
        params: Type.Object({ tripId: Uuid }, { additionalProperties: false }),
        response: { 200: View, 401: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);
      const tripId = request.params.tripId;

      return db.transaction(
        async (tx) => {
          const trip = await requireOwnedTrip(tx, user.id, tripId);
          const { members, calculated } = await readSplittingCalculation(tx, user.id, tripId);
          const arrangements = settlementArrangements(
            config.secret,
            user.id,
            tripId,
            trip,
            calculated,
          );

          const selected = trip.simplifyDebts
            ? calculated.simplifiedArrangements
            : calculated.directArrangements;
          const unchanged =
            selected.length === calculated.directArrangements.length &&
            selected.every((edge, index) => {
              const direct = calculated.directArrangements[index]!;

              return (
                edge.currencyCode === direct.currencyCode &&
                edge.minorUnit === direct.minorUnit &&
                edge.fromMemberId === direct.fromMemberId &&
                edge.toMemberId === direct.toMemberId &&
                edge.amount.numerator * direct.amount.denominator ===
                  direct.amount.numerator * edge.amount.denominator
              );
            });
          const names = new Map(members.map((member) => [member.id, member.name]));
          const describe = (edges: readonly PaymentArrangement[]) =>
            edges
              .map(
                (edge) => `${names.get(edge.fromMemberId)!} 付款給 ${names.get(edge.toMemberId)!}`,
              )
              .join('、');
          const explanation = !trip.simplifyDebts
            ? `依原本的付款關係安排，共 ${selected.length} 筆付款。`
            : unchanged
              ? `目前的付款安排已無需調整，共 ${selected.length} 筆付款。`
              : `原本 ${describe(calculated.directArrangements)}；現在 ${describe(selected)}，從 ${calculated.directArrangements.length} 筆改為 ${selected.length} 筆付款。`;

          return {
            accountingRevision: trip.accountingRevision.toString(),
            simplifyDebts: trip.simplifyDebts,
            balances: calculated.balances.map((balance) => ({
              memberId: balance.memberId,
              currencyCode: balance.currencyCode,
              netAmount: exactAmount(balance.amount, balance.minorUnit),
            })),
            arrangements,
            explanation: `${explanation}每位成員的應收應付淨額保持不變。原始支出與還款紀錄保持不變。`,
            directArrangementCount: calculated.directArrangements.length,
            suggestedArrangementCount: arrangements.length,
          };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
  );
}
