import type { Readable } from 'node:stream';
import type { SourceSnapshot } from '../splitting/types.js';
import type { TripManagementHooks } from '../../../src/modules/trips/management/dependencies.js';

export interface TripManagementSnapshot extends SourceSnapshot {
  readonly thumbnails: readonly Record<string, unknown>[];
  readonly reservations: readonly Record<string, unknown>[];
  readonly receipts: readonly Record<string, unknown>[];
  readonly categories: readonly Record<string, unknown>[];
}

export interface ScenarioClock {
  now(): Date;
  advance(milliseconds: number): void;
}

export interface RequestStreamControl {
  readonly stream: Readable;
  release(): void;
  abort(): void;
  dispose(): Promise<void>;
}

export interface TripTransactionBarrier {
  readonly reached: Promise<void>;
  readonly hooks: TripManagementHooks;
  release(): void;
  dispose(): Promise<void>;
}

export interface TripManagementContext {
  readonly ids: {
    trips: Map<string, string>;
    operations: Map<string, string>;
  };
  readonly versions: Map<string, { lifecycle: bigint; thumbnail: bigint; accounting: bigint }>;
  snapshot?: TripManagementSnapshot;
  clock?: ScenarioClock;
  hooks?: TripManagementHooks;
  readonly cleanups: Set<() => Promise<void>>;
}

export function createTripManagementContext(): TripManagementContext {
  return {
    ids: { trips: new Map(), operations: new Map() },
    versions: new Map(),
    cleanups: new Set(),
  };
}

export async function disposeTripManagementContext(context: TripManagementContext): Promise<void> {
  context.hooks = undefined;
  const cleanups = [...context.cleanups];

  context.cleanups.clear();
  const results = await Promise.allSettled(
    cleanups.map((cleanup) => Promise.resolve().then(cleanup)),
  );
  const failures = results.filter((result) => result.status === 'rejected');

  if (failures.length)
    throw new AggregateError(
      failures.map((result) => result.reason),
      'Scenario cleanup failed',
    );
}
