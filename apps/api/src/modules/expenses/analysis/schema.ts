import { Type } from '@sinclair/typebox';
import type { ExactAmount } from '@split-ledger/shared';
import { Uuid } from '../../../http.js';
import { ExactAmountSchema } from '../../splitting/http-schema.js';

export type AnalysisAmount = ExactAmount;
const Category = Type.Union([
  Type.Object({ id: Uuid, name: Type.String() }, { additionalProperties: false }),
  Type.Null(),
]);
const Chart = Type.Object(
  {
    total: ExactAmountSchema,
    categories: Type.Array(
      Type.Object(
        { category: Category, amount: ExactAmountSchema },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const AnalysisResponse = Type.Object(
  {
    tripId: Uuid,
    ownerMemberId: Uuid,
    hasSharedExpenses: Type.Boolean(),
    currencies: Type.Array(
      Type.Object(
        {
          currencyCode: Type.String({ pattern: '^[A-Z]{3}$' }),
          minorUnit: Type.Integer({ minimum: 0, maximum: 4 }),
          personal: Chart,
          group: Chart,
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);
