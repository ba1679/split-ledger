import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';

export type AnalysisSeedRow = Record<string, string>;

export interface AnalysisSnapshot {
  trips: Record<string, unknown>[];
  members: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  shares: Record<string, unknown>[];
}

/** Independent implementations are supplied by the individual RED tasks. */
export interface AnalysisFixture {
  seed(world: LedgerWorld, rows: AnalysisSeedRow[]): Promise<void>;
  snapshot(world: LedgerWorld): Promise<AnalysisSnapshot>;
}

export interface AnalysisOracle {
  amount(snapshot: AnalysisSnapshot, currency: string, memberId?: string): ExactAmount;
}
