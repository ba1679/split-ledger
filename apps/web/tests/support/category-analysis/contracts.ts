import type { Locator, Page } from '@playwright/test';

export interface AnalysisPageObject {
  page: Page;
  personal: Locator;
  shared: Locator;
  currency: Locator;
}

/** A control holds an actual upstream response; it never replaces success data. */
export interface AnalysisResponseBarrier {
  readonly arrived: Promise<void>;
  release(): void;
  dispose(): Promise<void>;
}

export interface AnalysisResourceRegistry {
  add(cleanup: () => Promise<void> | void): void;
  dispose(): Promise<void>;
}
