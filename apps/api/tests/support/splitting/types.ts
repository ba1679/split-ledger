import type pg from 'pg';
import type { ExactAmount } from '@split-ledger/shared';
import type { SplittingHooks } from '../../../src/modules/splitting/dependencies.js';
import type { LedgerWorld } from '../world.js';

export interface SplittingIds {
  readonly trips: Map<string, string>;
  readonly members: Map<string, string>;
  readonly expenses: Map<string, string>;
  readonly repayments: Map<string, string>;
  readonly settlements: Map<string, string>;
}

export interface SourceSnapshot {
  readonly trips: readonly Record<string, unknown>[];
  readonly members: readonly Record<string, unknown>[];
  readonly expenses: readonly Record<string, unknown>[];
  readonly shares: readonly Record<string, unknown>[];
  readonly repayments: readonly Record<string, unknown>[];
  readonly settlements: readonly Record<string, unknown>[];
  readonly adjustments: readonly Record<string, unknown>[];
}

/** Independent test arithmetic: implementations must not import product calculators. */
export interface SplittingOracle {
  balance(snapshot: SourceSnapshot, memberId: string, currencyCode: string): ExactAmount;
  share(snapshot: SourceSnapshot, expenseId: string, memberId: string): ExactAmount;
  equal(left: ExactAmount, right: ExactAmount): boolean;
}

export interface LegacyMigrationFixture {
  readonly pool: pg.Pool;
  readonly before: SourceSnapshot;
  migrate(): Promise<void>;
  dispose(): Promise<void>;
}

export interface TransactionBarrier {
  readonly reached: Promise<void>;
  release(): void;
  readonly hooks: SplittingHooks;
}

export interface SplittingFixtureOperations {
  snapshot(world: LedgerWorld, tripId: string): Promise<SourceSnapshot>;
  legacy(workerIndex: number): Promise<LegacyMigrationFixture>;
  barrier(): TransactionBarrier;
}

export interface SplittingWorldState {
  readonly namespace: string;
  readonly ids: SplittingIds;
  snapshot?: SourceSnapshot;
  hooks?: SplittingHooks;
}
