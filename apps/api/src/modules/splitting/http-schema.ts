import { Type } from '@sinclair/typebox';

export const ExactAmountSchema = Type.Object(
  {
    numerator: Type.String({ pattern: '^-?(?:0|[1-9][0-9]*)$' }),
    denominator: Type.String({ pattern: '^[1-9][0-9]*$' }),
    minorUnit: Type.Integer({ minimum: 0, maximum: 4 }),
  },
  { additionalProperties: false },
);
