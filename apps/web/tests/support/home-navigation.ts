import { expect, type Page } from '@playwright/test';

export async function goToTripList(page: Page) {
  if (new URL(page.url()).pathname === '/trips') return;
  await page
    .getByRole('navigation', { name: /行動導覽|主要導覽|Mobile navigation|Main navigation/ })
    .getByRole('link', { name: /^(我的旅行|My trips)$/ })
    .click();
  await expect(page).toHaveURL(/\/trips$/);
}

export async function openAppSettings(page: Page) {
  await goToTripList(page);
  await page.getByRole('button', { name: /^(全站設定|App settings)$/ }).click();
  const dialog = page.getByRole('dialog', { name: /^(全站設定|App settings)$/ });
  await expect(dialog).toBeVisible();

  return dialog;
}

export function tripEditor(page: Page, name = '日本旅行') {
  return page.getByRole('button', { name: `編輯 ${name}`, exact: true });
}

export function tripEditorById(page: Page, id: string) {
  return page
    .locator('.trip-list-card')
    .filter({ has: page.locator(`a[href="/trips/${id}"]`) })
    .getByRole('button', { name: /^編輯 / });
}
