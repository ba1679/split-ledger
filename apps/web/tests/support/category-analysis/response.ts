import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { analysisContext } from '../../../../api/tests/support/category-analysis/fixture.js';
import { responseProxyControls, type ResponseProxyControl } from '../loading/response-proxy.js';

export interface AnalysisReadControl {
  arrived: boolean;
  finished: boolean;
  status?: number;
  body?: unknown;
  error?: unknown;
  path: string;
  mode: string;
  release(): void;
}

export function controlNextAnalysis(
  world: LedgerWorld,
  mode: string,
  tripId = analysisContext(world).tripId!,
) {
  expect(['成功', '延遲成功', '失敗']).toContain(mode);
  const controls = responseProxyControls(world.get<string>('webOrigin'));
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const expectedCookie = decodeURIComponent(world.users.get('Alice')!.cookie);
  const state: AnalysisReadControl = {
    arrived: false,
    finished: false,
    path: `/api/trips/${tripId}/expense-analysis`,
    mode,
    release,
  };
  const control: ResponseProxyControl = {
    matches: (request) =>
      !state.arrived &&
      request.method === 'GET' &&
      new URL(request.url!, 'http://test.invalid').pathname === state.path &&
      decodeURIComponent(request.headers.cookie ?? '').includes(expectedCookie),
    async handle(exchange) {
      state.arrived = true;
      state.status = exchange.status;
      state.body = JSON.parse(exchange.body.toString());
      try {
        if (mode === '延遲成功') await gate;

        return mode === '失敗' ? 'drop' : 'forward';
      } finally {
        state.finished = true;
      }
    },
    failed(error) {
      state.error = error;
      state.finished = true;
    },
  };
  controls.add(control);
  world.tripManagement.cleanups.add(async () => {
    release();
    try {
      if (state.arrived) await expect.poll(() => state.finished).toBe(true);
    } finally {
      controls.delete(control);
    }
    expect(state.error, 'Response control transport must cleanly finish').toBeUndefined();
  });
  world.set('analysis:control', state);

  return state;
}
