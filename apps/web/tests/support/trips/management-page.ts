import type { Locator, Page } from '@playwright/test';

// Concrete selectors and actions are supplied by the individual DSL RED tasks.
export interface TripManagementPage {
  readonly page: Page;
  readonly tripList: Locator;
  readonly trashList: Locator;
  readonly confirmation: Locator;
  openManagement(tripId: string): Promise<void>;
  openTrash(): Promise<void>;
}
