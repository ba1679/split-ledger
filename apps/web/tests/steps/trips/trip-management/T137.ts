import { Then, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { managementTripId } from '../../../../../api/tests/support/trip-management/baseline.js';
import { assertManagementUnchanged } from '../../../support/trips/management-assertions.js';

Then('選圖介面揭露靜態單張格式與全部上限', async ({ world, browser }) => {
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');
  const text = await dialog.innerText();
  for (const pattern of [
    /單張.*靜態|靜態.*單張/,
    /JPG|JPEG/i,
    /PNG/i,
    /WebP/i,
    /10\s*MiB/i,
    /(?:25[ ,]?000[ ,]?000|2[ ,]?500\s*萬)/,
    /16[ ,]?384\s*(?:px|像素)/i,
    /HEIC[^。]*轉[^。]*(?:JPG|JPEG|PNG|WebP)/i,
  ])
    expect(text).toMatch(pattern);
  const input = dialog.locator('input[type="file"]');
  await expect(input).toHaveCount(1);
  expect(await input.getAttribute('multiple')).toBeNull();
  const accept = (await input.getAttribute('accept'))!
    .toLowerCase()
    .split(',')
    .map((token) => token.trim());
  const allowed = ['image/jpeg', 'image/png', 'image/webp', '.jpg', '.jpeg', '.png', '.webp'];
  expect(accept.length).toBeGreaterThan(0);
  expect(accept.every((token) => allowed.includes(token))).toBe(true);
  expect(
    accept.includes('image/jpeg') || (accept.includes('.jpg') && accept.includes('.jpeg')),
  ).toBe(true);
  expect(accept.includes('image/png') || accept.includes('.png')).toBe(true);
  expect(accept.includes('image/webp') || accept.includes('.webp')).toBe(true);
  expect(await page.locator('body').innerText()).not.toMatch(
    /VALIDATION_ERROR|UNSUPPORTED_IMAGE|TRIP_STATE_CHANGED/,
  );
  // Read-only second device checks the list behind this editing flow without closing the modal.
  const tripId = managementTripId(world);
  const other = await browser.newContext({
    baseURL: world.get<string>('webOrigin'),
    viewport: page.viewportSize(),
  });
  try {
    await other.addCookies(await page.context().cookies());
    const list = await other.request.get('/api/trips?limit=100');
    expect(list.status()).toBe(200);
    const item = (await list.json()).items.find((row: { id: string }) => row.id === tripId);
    expect(item).toBeDefined();
    const view = await other.newPage();
    await view.goto('/trips');
    const card = view
      .getByRole('link')
      .filter({ has: view.getByRole('heading', { name: item.name, exact: true }) });
    await expect(card).toHaveAttribute('href', `/trips/${tripId}`);
    await expect(
      card.getByText(`${item.startDate} — ${item.endDate}`, { exact: true }),
    ).toBeVisible();
    await expect(card.getByText(`${item.expenseCount} 筆支出`, { exact: true })).toBeVisible();
    await expect(card.getByText('開啟旅行帳本', { exact: true })).toBeVisible();
    await card.click({ trial: true });
  } finally {
    await other.close();
  }
  await assertManagementUnchanged(world);
});
