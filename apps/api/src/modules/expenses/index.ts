import { Type } from '@sinclair/typebox';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyInstance } from 'fastify';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import {
  combineMoney,
  formatMoney,
  parseMoney,
  rescaleMoney,
  rational,
  exactAmount,
} from '@split-ledger/shared';
import type { Database } from '../../db/index.js';
import { expenses, expenseShares, categories, tripMembers, currencies } from '../../db/schema.js';
import { Uuid, Timestamp, ErrorResponse, HttpError, invalid, notFound } from '../../http.js';
import {
  requireOwnedTrip as requireTrip,
  advanceAccountingRevision,
} from '../splitting/trip-scope.js';
import { ExactAmountSchema } from '../splitting/http-schema.js';
import { decodeExpenseCursor, encodeExpenseCursor } from '../../pagination.js';
import { requireUser, type Auth, type AuthConfig } from '../auth/index.js';
import { personalTotals } from './personal-totals.js';

const TripParams = Type.Object({ tripId: Uuid }, { additionalProperties: false });
const Params = Type.Object({ tripId: Uuid, expenseId: Uuid }, { additionalProperties: false });
const CurrencyCode = Type.String({ pattern: '^[A-Z]{3}$' });
const Amount = Type.String({ minLength: 1, maxLength: 25 });
const SpentOn = Type.String({ format: 'date' });
const CategoryId = Type.Union([Uuid, Type.Null()]);
const Create = Type.Object(
  {
    id: Uuid,
    item: Type.String(),
    amount: Amount,
    currencyCode: CurrencyCode,
    spentOn: SpentOn,
    categoryId: Type.Optional(CategoryId),
    payerMemberId: Type.Optional(Uuid),
    shareMemberIds: Type.Optional(Type.Array(Uuid, { minItems: 1, uniqueItems: true })),
  },
  { additionalProperties: false },
);
const Patch = Type.Object(
  {
    item: Type.Optional(Type.String()),
    amount: Type.Optional(Amount),
    currencyCode: Type.Optional(CurrencyCode),
    spentOn: Type.Optional(SpentOn),
    categoryId: Type.Optional(CategoryId),
    payerMemberId: Type.Optional(Uuid),
    shareMemberIds: Type.Optional(Type.Array(Uuid, { minItems: 1, uniqueItems: true })),
  },
  { additionalProperties: false, minProperties: 1 },
);
const Query = Type.Object(
  {
    limit: Type.Optional(Type.String({ pattern: '^[1-9][0-9]*$' })),
    cursor: Type.Optional(Type.String({ minLength: 1, maxLength: 2048 })),
  },
  { additionalProperties: false },
);
const Expense = Type.Object(
  {
    id: Uuid,
    tripId: Uuid,
    item: Type.String(),
    amount: Type.String(),
    currencyCode: CurrencyCode,
    minorUnit: Type.Integer({ minimum: 0, maximum: 4 }),
    spentOn: SpentOn,
    category: Type.Union([
      Type.Object({ id: Uuid, name: Type.String() }, { additionalProperties: false }),
      Type.Null(),
    ]),
    payerMemberId: Uuid,
    shares: Type.Array(
      Type.Object({ memberId: Uuid, amount: ExactAmountSchema }, { additionalProperties: false }),
      { minItems: 1 },
    ),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  },
  { additionalProperties: false },
);
const Totals = Type.Object(
  {
    totals: Type.Array(
      Type.Object(
        {
          currencyCode: CurrencyCode,
          amount: Type.String(),
          minorUnit: Type.Integer({ minimum: 0, maximum: 4 }),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);
const PersonalTotals = Type.Object(
  {
    totals: Type.Array(
      Type.Object(
        { currencyCode: CurrencyCode, amount: ExactAmountSchema },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);
const projection = {
  payerMemberId: expenses.payerMemberId,
  shareMemberIds: sql<
    string[]
  >`ARRAY(SELECT member_id FROM expense_shares WHERE owner_id=${expenses.ownerId} AND trip_id=${expenses.tripId} AND expense_id=${expenses.id} ORDER BY member_id)`,
  id: expenses.id,
  tripId: expenses.tripId,
  item: expenses.item,
  amountMinor: expenses.amountMinor,
  currencyCode: expenses.currencyCode,
  minorUnit: expenses.minorUnit,
  spentOn: expenses.spentOn,
  categoryId: categories.id,
  categoryName: categories.name,
  createdAt: expenses.createdAt,
  updatedAt: expenses.updatedAt,
};
const categoryJoin = and(
  eq(categories.ownerId, expenses.ownerId),
  eq(categories.id, expenses.categoryId),
);
type ExpenseRow = {
  payerMemberId: string;
  shareMemberIds: string[];
  id: string;
  tripId: string;
  item: string;
  amountMinor: bigint;
  currencyCode: string;
  minorUnit: number;
  spentOn: string;
  categoryId: string | null;
  categoryName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function view(row: ExpenseRow) {
  const { amountMinor, categoryId, categoryName, shareMemberIds, ...rest } = row;

  return {
    ...rest,
    amount: formatMoney(amountMinor, row.minorUnit),
    shares: shareMemberIds.map((memberId) => ({
      memberId,
      amount: exactAmount(rational(amountMinor, BigInt(shareMemberIds.length)), row.minorUnit),
    })),
    category: categoryId ? { id: categoryId, name: categoryName! } : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export { formatMoney as formatAmount } from '@split-ledger/shared';

async function readExpense(
  db: Pick<Database, 'select'>,
  ownerId: string,
  tripId: string,
  expenseId: string,
) {
  const [row] = await db
    .select(projection)
    .from(expenses)
    .leftJoin(categories, categoryJoin)
    .where(
      and(eq(expenses.ownerId, ownerId), eq(expenses.tripId, tripId), eq(expenses.id, expenseId)),
    );

  if (!row) throw notFound();

  return view(row);
}

async function requireCategory(
  db: Pick<Database, 'select'>,
  ownerId: string,
  categoryId: string | null,
) {
  if (categoryId === null) return;

  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.ownerId, ownerId), eq(categories.id, categoryId)))
    .for('key share');

  if (!category) throw notFound();
}

async function currencyPrecision(db: Pick<Database, 'select'>, code: string) {
  const [currency] = await db
    .select({ minorUnit: currencies.minorUnit })
    .from(currencies)
    .where(and(eq(currencies.code, code), eq(currencies.isSelectable, true)))
    .for('share');

  if (!currency) throw invalid('請選擇可用幣別。', 'currencyCode');

  return currency.minorUnit;
}

function validItem(value: string) {
  const item = value.trim();

  if (!item) throw invalid('請填寫支出項目。', 'item');

  return item;
}

function monetary<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof RangeError)
      throw invalid('請輸入符合幣別位數與範圍的正數金額。', 'amount');

    throw error;
  }
}

export function registerExpenseRoutes(
  app: FastifyInstance,
  db: Database,
  auth: Auth,
  config: AuthConfig,
) {
  const api = app.withTypeProvider<TypeBoxTypeProvider>();

  api.get(
    '/api/trips/:tripId/expenses',
    {
      schema: {
        params: TripParams,
        querystring: Query,
        response: {
          200: Type.Object({
            items: Type.Array(Expense),
            nextCursor: Type.Union([Type.String(), Type.Null()]),
            totalCount: Type.Integer({ minimum: 0 }),
          }),
          400: ErrorResponse,
          401: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);
      const tripId = request.params.tripId;
      const limit = request.query.limit === undefined ? 50 : Number(request.query.limit);

      if (!Number.isSafeInteger(limit) || limit > 100)
        throw invalid('每頁筆數須為 1 到 100 的整數。');

      const cursor = request.query.cursor
        ? decodeExpenseCursor(request.query.cursor, user.id, tripId, config.secret)
        : undefined;

      return db.transaction(
        async (tx) => {
          await requireTrip(tx, user.id, tripId);
          const owner = and(eq(expenses.ownerId, user.id), eq(expenses.tripId, tripId));
          const [count] = await tx
            .select({ value: sql<number>`count(*)::int` })
            .from(expenses)
            .where(owner);
          const rows = await tx
            .select(projection)
            .from(expenses)
            .leftJoin(categories, categoryJoin)
            .where(
              and(
                owner,
                cursor
                  ? sql`(${expenses.spentOn},${expenses.id}) < (${cursor.spentOn}::date,${cursor.id}::uuid)`
                  : undefined,
              ),
            )
            .orderBy(desc(expenses.spentOn), desc(expenses.id))
            .limit(limit + 1);
          const page = rows.slice(0, limit);
          const last = page.at(-1);

          return {
            items: page.map(view),
            totalCount: count!.value,
            nextCursor:
              rows.length > limit && last
                ? encodeExpenseCursor(
                    {
                      owner: user.id,
                      scope: 'expenses',
                      tripId,
                      spentOn: last.spentOn,
                      id: last.id,
                    },
                    config.secret,
                  )
                : null,
          };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
  );

  api.get(
    '/api/trips/:tripId/totals',
    {
      schema: {
        params: TripParams,
        querystring: Type.Object(
          { scope: Type.Optional(Type.Union([Type.Literal('all'), Type.Literal('personal')])) },
          { additionalProperties: false },
        ),
        response: {
          200: Type.Union([Totals, PersonalTotals]),
          401: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);

      return db.transaction(
        async (tx) => {
          await requireTrip(tx, user.id, request.params.tripId);
          if (request.query.scope === 'personal') {
            const [member] = await tx
              .select({ id: tripMembers.id })
              .from(tripMembers)
              .where(
                and(
                  eq(tripMembers.ownerId, user.id),
                  eq(tripMembers.tripId, request.params.tripId),
                  eq(tripMembers.role, 'owner'),
                ),
              );
            if (!member) throw notFound();
            const sources = await tx
              .select({
                currencyCode: expenses.currencyCode,
                minorUnit: expenses.minorUnit,
                amountMinor: expenses.amountMinor,
                shareMemberIds: projection.shareMemberIds,
              })
              .from(expenses)
              .where(
                and(eq(expenses.ownerId, user.id), eq(expenses.tripId, request.params.tripId)),
              );

            return { totals: personalTotals(sources, member.id) };
          }
          const rows = await tx
            .select({
              currencyCode: expenses.currencyCode,
              minorUnit: expenses.minorUnit,
              amountMinor: sql<string>`sum(${expenses.amountMinor})::text`,
            })
            .from(expenses)
            .where(and(eq(expenses.ownerId, user.id), eq(expenses.tripId, request.params.tripId)))
            .groupBy(expenses.currencyCode, expenses.minorUnit);

          return {
            totals: combineMoney(
              rows.map((row) => ({ ...row, amountMinor: BigInt(row.amountMinor) })),
            ),
          };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
  );

  api.post(
    '/api/trips/:tripId/expenses',
    {
      schema: {
        params: TripParams,
        body: Create,
        response: {
          201: Expense,
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
      const input = request.body;
      if ((input.payerMemberId === undefined) !== (input.shareMemberIds === undefined))
        throw invalid('請同時選擇付款人與分攤成員。');
      const saved = await db.transaction(async (tx) => {
        await requireTrip(tx, user.id, request.params.tripId, true);
        const [owner] = await tx
          .select({ id: tripMembers.id })
          .from(tripMembers)
          .where(
            and(
              eq(tripMembers.ownerId, user.id),
              eq(tripMembers.tripId, request.params.tripId),
              eq(tripMembers.role, 'owner'),
            ),
          );
        if (!owner) throw notFound();
        const payerMemberId = input.payerMemberId ?? owner.id;
        const shareMemberIds = input.shareMemberIds ?? [owner.id];
        const memberIds = [...new Set([payerMemberId, ...shareMemberIds])];
        const members = await tx
          .select()
          .from(tripMembers)
          .where(
            and(
              eq(tripMembers.ownerId, user.id),
              eq(tripMembers.tripId, request.params.tripId),
              inArray(tripMembers.id, memberIds),
            ),
          );
        if (members.length !== memberIds.length) throw notFound();
        if (members.some((member) => !member.isActive)) throw invalid('請選擇啟用的成員。');
        const categoryId = input.categoryId ?? null;

        await requireCategory(tx, user.id, categoryId);
        const minorUnit = await currencyPrecision(tx, input.currencyCode);
        const amountMinor = monetary(() => parseMoney(input.amount, minorUnit, input.currencyCode));
        const [created] = await tx
          .insert(expenses)
          .values({
            id: input.id,
            ownerId: user.id,
            tripId: request.params.tripId,
            categoryId,
            payerMemberId,
            item: validItem(input.item),
            amountMinor,
            minorUnit,
            currencyCode: input.currencyCode,
            spentOn: input.spentOn,
          })
          .onConflictDoNothing()
          .returning({ id: expenses.id });

        if (!created)
          throw new HttpError(409, 'ID_CONFLICT', '這次建立的識別碼已被使用，請重新確認。');

        await tx.insert(expenseShares).values(
          shareMemberIds.map((memberId) => ({
            ownerId: user.id,
            tripId: request.params.tripId,
            expenseId: created.id,
            memberId,
          })),
        );
        await advanceAccountingRevision(tx, user.id, request.params.tripId);

        return readExpense(tx, user.id, request.params.tripId, created.id);
      });

      return reply.code(201).send(saved);
    },
  );

  api.get(
    '/api/trips/:tripId/expenses/:expenseId',
    {
      schema: {
        params: Params,
        response: { 200: Expense, 401: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);

      return db.transaction(
        (tx) => readExpense(tx, user.id, request.params.tripId, request.params.expenseId),
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
  );

  api.patch(
    '/api/trips/:tripId/expenses/:expenseId',
    {
      schema: {
        params: Params,
        body: Patch,
        response: {
          200: Expense,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);
      const input = request.body;

      return db.transaction(async (tx) => {
        await requireTrip(tx, user.id, request.params.tripId, true);
        const owner = and(
          eq(expenses.ownerId, user.id),
          eq(expenses.tripId, request.params.tripId),
          eq(expenses.id, request.params.expenseId),
        );
        const [prior] = await tx.select().from(expenses).where(owner).for('update');

        if (!prior) throw notFound();

        // Only explicitly supplied references need to be active; omitted historical ones survive.
        const memberIds = [
          ...new Set([
            ...(input.payerMemberId === undefined ? [] : [input.payerMemberId]),
            ...(input.shareMemberIds ?? []),
          ]),
        ];
        if (memberIds.length > 0) {
          const members = await tx
            .select({ id: tripMembers.id, isActive: tripMembers.isActive })
            .from(tripMembers)
            .where(
              and(
                eq(tripMembers.ownerId, user.id),
                eq(tripMembers.tripId, request.params.tripId),
                inArray(tripMembers.id, memberIds),
              ),
            );
          if (members.length !== memberIds.length) throw notFound();
          if (members.some((member) => !member.isActive)) throw invalid('請選擇啟用的成員。');
        }

        const categoryId = input.categoryId === undefined ? prior.categoryId : input.categoryId;

        await requireCategory(tx, user.id, categoryId);
        const currencyCode = input.currencyCode ?? prior.currencyCode;
        const changedCurrency = currencyCode !== prior.currencyCode;
        const minorUnit = changedCurrency
          ? await currencyPrecision(tx, currencyCode)
          : prior.minorUnit;
        const amountMinor = monetary(() =>
          input.amount !== undefined
            ? parseMoney(input.amount, minorUnit, currencyCode)
            : changedCurrency
              ? rescaleMoney(prior.amountMinor, prior.minorUnit, minorUnit)
              : prior.amountMinor,
        );

        await tx
          .update(expenses)
          .set({
            categoryId,
            item: input.item === undefined ? prior.item : validItem(input.item),
            spentOn: input.spentOn ?? prior.spentOn,
            currencyCode,
            minorUnit,
            amountMinor,
            payerMemberId: input.payerMemberId ?? prior.payerMemberId,
            updatedAt: new Date(),
          })
          .where(owner);

        if (input.shareMemberIds !== undefined) {
          await tx
            .delete(expenseShares)
            .where(
              and(
                eq(expenseShares.ownerId, user.id),
                eq(expenseShares.tripId, request.params.tripId),
                eq(expenseShares.expenseId, request.params.expenseId),
              ),
            );
          await tx.insert(expenseShares).values(
            input.shareMemberIds.map((memberId) => ({
              ownerId: user.id,
              tripId: request.params.tripId,
              expenseId: request.params.expenseId,
              memberId,
            })),
          );
        }

        await advanceAccountingRevision(tx, user.id, request.params.tripId);

        return readExpense(tx, user.id, request.params.tripId, request.params.expenseId);
      });
    },
  );

  api.delete(
    '/api/trips/:tripId/expenses/:expenseId',
    {
      schema: {
        params: Params,
        response: {
          204: Type.Null(),
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);
      await db.transaction(async (tx) => {
        await requireTrip(tx, user.id, request.params.tripId, true);
        const [removed] = await tx
          .delete(expenses)
          .where(
            and(
              eq(expenses.ownerId, user.id),
              eq(expenses.tripId, request.params.tripId),
              eq(expenses.id, request.params.expenseId),
            ),
          )
          .returning({ id: expenses.id });

        if (!removed) throw notFound();

        await advanceAccountingRevision(tx, user.id, request.params.tripId);
      });

      return reply.code(204).send(null);
    },
  );
}
