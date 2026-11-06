import { Type } from '@sinclair/typebox';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyInstance } from 'fastify';
import { asc, eq } from 'drizzle-orm';
import type { Database } from '../../db/index.js';
import { currencies } from '../../db/schema.js';

const CurrencyList = Type.Object(
  {
    snapshotDate: Type.String({ format: 'date' }),
    items: Type.Array(
      Type.Object(
        {
          code: Type.String({ pattern: '^[A-Z]{3}$' }),
          name: Type.String(),
          minorUnit: Type.Integer({ minimum: 0, maximum: 4 }),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export async function listCurrencies(db: Database) {
  const rows = await db
    .select({
      code: currencies.code,
      name: currencies.name,
      minorUnit: currencies.minorUnit,
      snapshotDate: currencies.snapshotDate,
    })
    .from(currencies)
    .where(eq(currencies.isSelectable, true))
    .orderBy(asc(currencies.code));
  const snapshotDate = rows[0]?.snapshotDate;

  if (!snapshotDate || rows.some((row) => row.snapshotDate !== snapshotDate)) {
    throw new Error('Selectable currencies must share one archived snapshot date');
  }

  return {
    snapshotDate,
    items: rows.map(({ code, name, minorUnit }) => ({ code, name, minorUnit })),
  };
}

export function registerCurrencyRoutes(app: FastifyInstance, db: Database) {
  app.withTypeProvider<TypeBoxTypeProvider>().get(
    '/api/currencies',
    {
      schema: { response: { 200: CurrencyList } },
    },
    () => listCurrencies(db),
  );
}
