import type pg from 'pg';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { SplittingWorldState } from './splitting/types.js';

export interface Identity {
  id: string;
  name: string;
  email: string;
  cookie: string;
}

export class LedgerWorld {
  readonly splitting: SplittingWorldState;
  readonly state = new Map<string, unknown>();
  readonly users = new Map<string, Identity>();
  response?: APIResponse;
  constructor(
    readonly db: pg.Pool,
    readonly api: APIRequestContext,
    readonly origin: string,
    readonly namespace: string,
  ) {
    this.splitting = {
      namespace,
      ids: {
        trips: new Map(),
        members: new Map(),
        expenses: new Map(),
        repayments: new Map(),
        settlements: new Map(),
      },
    };
  }
  get<T>(key: string): T {
    if (!this.state.has(key)) throw Error(`Missing scenario state: ${key}`);

    return this.state.get(key) as T;
  }
  set(key: string, value: unknown) {
    this.state.set(key, value);
  }
}
