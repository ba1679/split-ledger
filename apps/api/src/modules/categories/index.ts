import { Type } from '@sinclair/typebox';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyInstance } from 'fastify';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db/index.js';
import { categories, expenses } from '../../db/schema.js';
import {
  Uuid,
  Timestamp,
  ErrorResponse,
  HttpError,
  invalid,
  notFound,
  postgresError,
} from '../../http.js';
import { requireUser, type Auth } from '../auth/index.js';

const Category = Type.Object(
  {
    id: Uuid,
    name: Type.String(),
    usageCount: Type.Integer({ minimum: 0 }),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  },
  { additionalProperties: false },
);
const Params = Type.Object({ categoryId: Uuid }, { additionalProperties: false });
const CategoryCreate = Type.Object(
  { id: Uuid, name: Type.String() },
  { additionalProperties: false },
);
const CategoryRename = Type.Object({ name: Type.String() }, { additionalProperties: false });

const projection = {
  id: categories.id,
  name: categories.name,
  createdAt: categories.createdAt,
  updatedAt: categories.updatedAt,
  usageCount: sql<number>`count(${expenses.id})::int`,
};
const usageJoin = and(
  eq(expenses.ownerId, categories.ownerId),
  eq(expenses.categoryId, categories.id),
);

function view(row: {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}) {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

function validName(value: string) {
  const name = value.trim();

  if (!name) throw invalid('請輸入分類名稱。', 'name');
  if (Array.from(name).length > 30) throw invalid('分類名稱最多 30 個字。', 'name');

  return name;
}

async function readCategory(db: Pick<Database, 'select'>, owner: string, id: string) {
  const [row] = await db
    .select(projection)
    .from(categories)
    .leftJoin(expenses, usageJoin)
    .where(and(eq(categories.ownerId, owner), eq(categories.id, id)))
    .groupBy(categories.id);

  if (!row) throw notFound();

  return view(row);
}

function categoryFailure(error: unknown): never {
  const failure = postgresError(error);

  if (failure?.code === '23505') {
    if (failure.constraint === 'categories_owner_name_key_uq')
      throw new HttpError(409, 'CATEGORY_NAME_CONFLICT', '已有相同名稱的分類。', 'name');

    throw new HttpError(409, 'ID_CONFLICT', '這次建立的識別碼已被使用，請重新確認。');
  }

  if (
    failure?.constraint === 'expenses_owner_category_fk' &&
    ['23503', '23001'].includes(failure.code)
  )
    throw new HttpError(409, 'CATEGORY_IN_USE', '此分類仍在使用，暫時不能刪除。');

  throw error;
}

export function registerCategoryRoutes(app: FastifyInstance, db: Database, auth: Auth) {
  const api = app.withTypeProvider<TypeBoxTypeProvider>();

  api.get(
    '/api/categories',
    {
      schema: {
        response: { 200: Type.Object({ items: Type.Array(Category) }), 401: ErrorResponse },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);

      const rows = await db
        .select(projection)
        .from(categories)
        .leftJoin(expenses, usageJoin)
        .where(eq(categories.ownerId, user.id))
        .groupBy(categories.id)
        .orderBy(asc(categories.name), asc(categories.id));

      return { items: rows.map(view) };
    },
  );

  api.get(
    '/api/categories/:categoryId',
    {
      schema: {
        params: Params,
        response: { 200: Category, 401: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);

      return readCategory(db, user.id, request.params.categoryId);
    },
  );

  api.post(
    '/api/categories',
    {
      schema: {
        body: CategoryCreate,
        response: {
          201: Category,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          409: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);
      const name = validName(request.body.name);

      try {
        const created = await db.transaction(async (tx) => {
          await tx.insert(categories).values({ id: request.body.id, ownerId: user.id, name });

          return readCategory(tx, user.id, request.body.id);
        });

        return reply.code(201).send(created);
      } catch (error) {
        return categoryFailure(error);
      }
    },
  );

  api.patch(
    '/api/categories/:categoryId',
    {
      schema: {
        params: Params,
        body: CategoryRename,
        response: {
          200: Category,
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
      const name = validName(request.body.name);

      try {
        return await db.transaction(async (tx) => {
          const [updated] = await tx
            .update(categories)
            .set({ name, updatedAt: new Date() })
            .where(
              and(eq(categories.ownerId, user.id), eq(categories.id, request.params.categoryId)),
            )
            .returning({ id: categories.id });

          if (!updated) throw notFound();

          return readCategory(tx, user.id, updated.id);
        });
      } catch (error) {
        return categoryFailure(error);
      }
    },
  );

  api.delete(
    '/api/categories/:categoryId',
    {
      schema: {
        params: Params,
        response: {
          204: Type.Null(),
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

      try {
        // PostgreSQL's RESTRICT FK serializes concurrent new expense references.
        const [removed] = await db
          .delete(categories)
          .where(and(eq(categories.ownerId, user.id), eq(categories.id, request.params.categoryId)))
          .returning({ id: categories.id });

        if (!removed) throw notFound();

        return reply.code(204).send(null);
      } catch (error) {
        return categoryFailure(error);
      }
    },
  );
}
