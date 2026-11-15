import type { Locator, Page } from '@playwright/test';

export interface ThumbnailEditorPage {
  readonly page: Page;
  readonly preview: Locator;
  readonly fileInput: Locator;
  readonly save: Locator;
  readonly cancel: Locator;
}
