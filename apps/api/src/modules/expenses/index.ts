import { Type } from '@sinclair/typebox';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../../db/index.js';
import { expenses, categories } from '../../db/schema.js';
import { Uuid, Timestamp, ErrorResponse, notFound } from '../../http.js';
import { requireUser, type Auth } from '../auth/index.js';

const Params = Type.Object({ tripId: Uuid, expenseId: Uuid }, { additionalProperties: false });
const Expense = Type.Object({
  id: Uuid, tripId: Uuid, item: Type.String(), amount: Type.String(), currencyCode: Type.String({ pattern: '^[A-Z]{3}$' }),
  minorUnit: Type.Integer({ minimum: 0, maximum: 4 }), spentOn: Type.String({ format: 'date' }),
  category: Type.Union([Type.Object({ id: Uuid, name: Type.String() }, { additionalProperties: false }), Type.Null()]),
  createdAt: Timestamp, updatedAt: Timestamp,
}, { additionalProperties: false });
export function formatAmount(value: bigint, minorUnit: number) {
  const digits = value.toString().padStart(minorUnit + 1, '0');
  return minorUnit ? `${digits.slice(0, -minorUnit)}.${digits.slice(-minorUnit)}` : digits;
}
async function readExpense(db: Pick<Database, 'select'>, ownerId: string, tripId: string, expenseId: string) {
  const [row] = await db.select({
    id: expenses.id, tripId: expenses.tripId, item: expenses.item, amountMinor: expenses.amountMinor,
    currencyCode: expenses.currencyCode, minorUnit: expenses.minorUnit, spentOn: expenses.spentOn,
    categoryId: categories.id, categoryName: categories.name, createdAt: expenses.createdAt, updatedAt: expenses.updatedAt,
  }).from(expenses).leftJoin(categories, and(eq(categories.ownerId, expenses.ownerId), eq(categories.id, expenses.categoryId)))
    .where(and(eq(expenses.ownerId, ownerId), eq(expenses.tripId, tripId), eq(expenses.id, expenseId)));
  if (!row) throw notFound();
  const { amountMinor, categoryId, categoryName, ...rest } = row;
  return { ...rest, amount: formatAmount(amountMinor, row.minorUnit), category: categoryId ? { id: categoryId, name: categoryName! } : null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
export function registerExpenseRoutes(app: FastifyInstance, db: Database, auth: Auth) {
  const api = app.withTypeProvider<TypeBoxTypeProvider>();
  api.get('/api/trips/:tripId/expenses/:expenseId', { schema: { params: Params, response: { 200: Expense, 401: ErrorResponse, 404: ErrorResponse } } }, async (request, reply) => {
    const user = await requireUser(auth, request, reply);
    return readExpense(db, user.id, request.params.tripId, request.params.expenseId);
  });
  api.patch('/api/trips/:tripId/expenses/:expenseId', {
    schema: { params: Params, body: Type.Object({ categoryId: Type.Union([Uuid, Type.Null()]) }, { additionalProperties: false }), response: { 200: Expense, 400: ErrorResponse, 401: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse } },
  }, async (request, reply) => {
    const user = await requireUser(auth, request, reply);
    return db.transaction(async tx => {
      const owner = and(eq(expenses.ownerId, user.id), eq(expenses.tripId, request.params.tripId), eq(expenses.id, request.params.expenseId));
      const [prior] = await tx.select({ id: expenses.id }).from(expenses).where(owner).for('update');
      if (!prior) throw notFound();
      const categoryId = request.body.categoryId;
      if (categoryId !== null) {
        const [category] = await tx.select({ id: categories.id }).from(categories).where(and(eq(categories.ownerId, user.id), eq(categories.id, categoryId))).for('key share');
        if (!category) throw notFound();
      }
      await tx.update(expenses).set({ categoryId, updatedAt: new Date() }).where(owner);
      return readExpense(tx, user.id, request.params.tripId, request.params.expenseId);
    });
  });
}
