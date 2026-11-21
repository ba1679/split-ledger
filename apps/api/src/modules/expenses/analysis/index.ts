import { Type } from '@sinclair/typebox';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyInstance } from 'fastify';
import type { Database } from '../../../db/index.js';
import { Uuid, ErrorResponse } from '../../../http.js';
import { requireUser, type Auth } from '../../auth/index.js';
import { readExpenseAnalysis } from './repository.js';
import { AnalysisResponse } from './schema.js';

export function registerAnalysisRoutes(app: FastifyInstance, db: Database, auth: Auth) {
  const api = app.withTypeProvider<TypeBoxTypeProvider>();
  api.get(
    '/api/trips/:tripId/expense-analysis',
    {
      schema: {
        params: Type.Object({ tripId: Uuid }, { additionalProperties: false }),
        querystring: Type.Object({}, { additionalProperties: false }),
        response: {
          200: AnalysisResponse,
          401: ErrorResponse,
          404: ErrorResponse,
          409: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = await requireUser(auth, request, reply);

      return readExpenseAnalysis(db, { tripId: request.params.tripId, ownerId: user.id });
    },
  );
}
