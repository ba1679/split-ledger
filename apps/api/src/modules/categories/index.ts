import { Type } from '@sinclair/typebox';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyInstance } from 'fastify';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db/index.js';
import { categories, expenses } from '../../db/schema.js';
import { Uuid, Timestamp, ErrorResponse, notFound } from '../../http.js';
import { requireUser, type Auth } from '../auth/index.js';

const Category = Type.Object({ id: Uuid, name: Type.String(), usageCount: Type.Integer({ minimum: 0 }), createdAt: Timestamp, updatedAt: Timestamp }, { additionalProperties: false });
export function registerCategoryRoutes(app: FastifyInstance, db: Database, auth: Auth) {
  app.withTypeProvider<TypeBoxTypeProvider>().get('/api/categories/:categoryId', {
    schema: { params: Type.Object({ categoryId: Uuid }, { additionalProperties: false }), response: { 200: Category, 401: ErrorResponse, 404: ErrorResponse } },
  }, async (request, reply) => {
    const user = await requireUser(auth, request, reply);
    const [row] = await db.select({ id: categories.id, name: categories.name, createdAt: categories.createdAt, updatedAt: categories.updatedAt, usageCount: sql<number>`count(${expenses.id})::int` })
      .from(categories).leftJoin(expenses, and(eq(expenses.ownerId, categories.ownerId), eq(expenses.categoryId, categories.id)))
      .where(and(eq(categories.ownerId, user.id), eq(categories.id, request.params.categoryId))).groupBy(categories.id);
    if (!row) throw notFound();
    return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
  });
}
