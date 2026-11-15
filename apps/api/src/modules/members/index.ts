export type { TripMember, CreateMemberRequest, UpdateMemberRequest } from './schema.js';

export type { MemberRepository } from './repository.js';

export type { MemberService } from './service.js';

export type { RegisterSplittingModule as RegisterMemberRoutes } from '../splitting/dependencies.js';

import { Type } from '@sinclair/typebox';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyInstance } from 'fastify';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db/index.js';
import { tripMembers } from '../../db/schema.js';
import {
  Uuid,
  Timestamp,
  ErrorResponse,
  HttpError,
  invalid,
  notFound,
  postgresError,
} from '../../http.js';
import { requireOwnedTrip, advanceAccountingRevision } from '../splitting/trip-scope.js';
import { requireUser, type Auth } from '../auth/index.js';

const Member = Type.Object(
  {
    id: Uuid,
    tripId: Uuid,
    role: Type.Union([Type.Literal('owner'), Type.Literal('companion')]),
    name: Type.String({ minLength: 1 }),
    isActive: Type.Boolean(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  },
  { additionalProperties: false },
);

const TripParams = Type.Object({ tripId: Uuid }, { additionalProperties: false });
const MemberParams = Type.Object({ tripId: Uuid, memberId: Uuid }, { additionalProperties: false });
const Create = Type.Object(
  { id: Uuid, name: Type.String({ minLength: 1 }) },
  { additionalProperties: false },
);
const Patch = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1 })),
    isActive: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false, minProperties: 1 },
);

type MemberRow = typeof tripMembers.$inferSelect;

function view({ ownerId: _ownerId, nameKey: _nameKey, ...member }: MemberRow) {
  return {
    ...member,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

function validName(value: string) {
  const name = value.trim();
  if (!name) throw invalid('請輸入同行者名稱。', 'name');

  return name;
}

function memberScope(ownerId: string, tripId: string, memberId: string) {
  return and(
    eq(tripMembers.ownerId, ownerId),
    eq(tripMembers.tripId, tripId),
    eq(tripMembers.id, memberId),
  );
}

async function readMember(
  db: Pick<Database, 'select'>,
  ownerId: string,
  tripId: string,
  memberId: string,
  lock = false,
) {
  const query = db
    .select()
    .from(tripMembers)
    .where(memberScope(ownerId, tripId, memberId));
  const [member] = await (lock ? query.for('update') : query);
  if (!member) throw notFound();

  return member;
}

const memberReferenceConstraints = new Set([
  'expenses_payer_member_fk',
  'expense_shares_member_fk',
  'repayments_payer_fk',
  'repayments_payee_fk',
  'settlements_debtor_fk',
  'settlements_creditor_fk',
  'settlement_adjustments_member_fk',
]);

function memberFailure(error: unknown): never {
  const failure = postgresError(error);
  if (failure?.code === '23505') {
    if (failure.constraint === 'trip_members_trip_name_key_uq')
      throw new HttpError(409, 'MEMBER_NAME_CONFLICT', '已有相同名稱的成員。', 'name');
    throw new HttpError(409, 'ID_CONFLICT', '這次建立的識別碼已被使用，請重新確認。');
  }
  if (
    failure?.constraint &&
    memberReferenceConstraints.has(failure.constraint) &&
    ['23503', '23001'].includes(failure.code)
  )
    throw new HttpError(409, 'MEMBER_IN_USE', '此同行者已有紀錄，請改為停用。');
  throw error;
}

/** All mutations serialize with other accounting writers on the owned trip row. */
export function registerMemberRoutes(app: FastifyInstance, db: Database, auth: Auth): void {
  const api = app.withTypeProvider<TypeBoxTypeProvider>();
  api.get(
    '/api/trips/:tripId/members',
    {
      schema: {
        params: Type.Object({ tripId: Uuid }, { additionalProperties: false }),
        response: {
          200: Type.Object({ items: Type.Array(Member) }),
          401: ErrorResponse,
          404: ErrorResponse,
          409: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);

      return db.transaction(
        async (tx) => {
          const trip = await requireOwnedTrip(tx, user.id, request.params.tripId);
          const rows = await tx
            .select()
            .from(tripMembers)
            .where(and(eq(tripMembers.tripId, trip.id), eq(tripMembers.ownerId, user.id)))
            .orderBy(
              sql`CASE WHEN ${tripMembers.role}='owner' THEN 0 ELSE 1 END`,
              asc(tripMembers.nameKey),
              asc(tripMembers.id),
            );

          return { items: rows.map(view) };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
  );

  api.get(
    '/api/trips/:tripId/members/:memberId',
    {
      schema: {
        params: MemberParams,
        response: { 200: Member, 401: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);

      return db.transaction(
        async (tx) => {
          await requireOwnedTrip(tx, user.id, request.params.tripId);

          return view(
            await readMember(tx, user.id, request.params.tripId, request.params.memberId),
          );
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
  );

  api.post(
    '/api/trips/:tripId/members',
    {
      schema: {
        params: TripParams,
        body: Create,
        response: {
          201: Member,
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
        const saved = await db.transaction(async (tx) => {
          await requireOwnedTrip(tx, user.id, request.params.tripId, true);
          const [created] = await tx
            .insert(tripMembers)
            .values({
              id: request.body.id,
              ownerId: user.id,
              tripId: request.params.tripId,
              role: 'companion',
              name: validName(request.body.name),
              isActive: true,
            })
            .returning();
          await advanceAccountingRevision(tx, user.id, request.params.tripId);

          return view(created!);
        });

        return reply.code(201).send(saved);
      } catch (error) {
        return memberFailure(error);
      }
    },
  );

  api.patch(
    '/api/trips/:tripId/members/:memberId',
    {
      schema: {
        params: MemberParams,
        body: Patch,
        response: {
          200: Member,
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
        return await db.transaction(async (tx) => {
          const { tripId, memberId } = request.params;
          await requireOwnedTrip(tx, user.id, tripId, true);
          const prior = await readMember(tx, user.id, tripId, memberId, true);
          if (prior.role === 'owner') throw invalid('固定成員不能修改。');
          const [updated] = await tx
            .update(tripMembers)
            .set({
              name: request.body.name === undefined ? prior.name : validName(request.body.name),
              isActive: request.body.isActive ?? prior.isActive,
              updatedAt: new Date(),
            })
            .where(memberScope(user.id, tripId, memberId))
            .returning();
          await advanceAccountingRevision(tx, user.id, tripId);

          return view(updated!);
        });
      } catch (error) {
        return memberFailure(error);
      }
    },
  );

  api.delete(
    '/api/trips/:tripId/members/:memberId',
    {
      schema: {
        params: MemberParams,
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
        await db.transaction(async (tx) => {
          const { tripId, memberId } = request.params;
          await requireOwnedTrip(tx, user.id, tripId, true);
          const prior = await readMember(tx, user.id, tripId, memberId, true);
          if (prior.role === 'owner') throw invalid('固定成員不能刪除。');
          // RESTRICT covers every expense/payment/history reference, including concurrent inserts.
          await tx.delete(tripMembers).where(memberScope(user.id, tripId, memberId));
          await advanceAccountingRevision(tx, user.id, tripId);
        });

        return reply.code(204).send(null);
      } catch (error) {
        return memberFailure(error);
      }
    },
  );
}
