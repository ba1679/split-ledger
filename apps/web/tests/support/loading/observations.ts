import type { Page, Request } from '@playwright/test';

export interface RequestObservation {
  readonly request: Request;
  readonly operationId?: string;
  readonly method: string;
  readonly url: string;
}

export interface RequestCounter {
  readonly requests: readonly RequestObservation[];
  dispose(): Promise<void>;
}

export interface ResponseBarrier {
  readonly reached: Promise<void>;
  release(): void;
  dispose(): Promise<void>;
}

export interface ObjectUrlObservation {
  readonly created: readonly string[];
  readonly revoked: readonly string[];
  dispose(): Promise<void>;
}

export const tripManagementViewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

export interface LoadingPage {
  readonly page: Page;
  readonly requests: RequestCounter;
  readonly objectUrls: ObjectUrlObservation;
}

// A held real response must be released even if a visible-state assertion fails.
// RED tasks supply the actual interceptor; this wrapper adds no fake response or timing sleep.
export async function withResponseBarrier<T>(
  barrier: ResponseBarrier,
  run: (barrier: ResponseBarrier) => Promise<T>,
): Promise<T> {
  try {
    return await run(barrier);
  } finally {
    try {
      barrier.release();
    } finally {
      await barrier.dispose();
    }
  }
}
