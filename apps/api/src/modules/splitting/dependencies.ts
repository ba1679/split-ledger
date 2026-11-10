import type { FastifyInstance } from 'fastify';
import type { Database } from '../../db/index.js';
import type { Auth, AuthConfig } from '../auth/index.js';

export interface SplittingTransactionContext {
  readonly ownerId: string;
  readonly tripId: string;
  readonly commandId: string;
}

/** Internal injection only; never populated from a request or environment variable. */
export interface SplittingHooks {
  beforeTripLock?: (context: SplittingTransactionContext) => Promise<void>;
  afterTripLock?: (context: SplittingTransactionContext) => Promise<void>;
  afterSettlementInsert?: (context: SplittingTransactionContext) => Promise<void>;
  afterRepaymentInsert?: (context: SplittingTransactionContext) => Promise<void>;
  afterFirstAdjustmentInsert?: (context: SplittingTransactionContext) => Promise<void>;
}

export interface SplittingModuleDependencies {
  readonly app: FastifyInstance;
  readonly db: Database;
  readonly auth: Auth;
  readonly config: AuthConfig;
  readonly hooks?: SplittingHooks;
}

export interface OwnedTripScope {
  readonly ownerId: string;
  readonly tripId: string;
}

/** Route implementations are supplied in their feature GREEN phase. */
export type RegisterSplittingModule = (dependencies: SplittingModuleDependencies) => void;
