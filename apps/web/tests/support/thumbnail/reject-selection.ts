import { expect, type Response } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementTripId } from '../../../../api/tests/support/trip-management/baseline.js';
import { managementUI } from '../trips/management-fixture.js';
import { observeDraftUrls } from './draft-fixture.js';
import type { InvalidSelection } from './invalid-selection.js';
import { injectMultipleFiles } from './multiple-files.js';

export interface RejectedSelectionAct {
  source: 'local' | 'server';
  writes: number;
  operationId?: string;
  response?: Response;
}

export async function rejectSelection(world: LedgerWorld): Promise<void> {
  const { files } = world.get<InvalidSelection>('management:invalidSelection');
  const ui = managementUI(world),
    page = ui.page,
    dialog = page.getByRole('dialog');
  const start = ui.writes.length;
  await observeDraftUrls(world);
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    dialog.getByRole('button', { name: /^(重新選圖|選擇照片)$/ }).click(),
  ]);
  if (files.length === 2) await injectMultipleFiles(chooser.element(), files);
  else await chooser.setFiles(files[0]!.asset.path);
  const save = dialog.getByRole('button', { name: '保存圖片', exact: true });
  const error = dialog.getByRole('alert').filter({ hasText: /\S/ }).first();
  await expect.poll(async () => (await error.isVisible()) || (await save.isEnabled())).toBe(true);
  if (await save.isEnabled()) await save.click();
  await expect.poll(async () => ui.writes.length > start || (await error.isVisible())).toBe(true);
  const act: RejectedSelectionAct = {
    source: ui.writes.length === start ? 'local' : 'server',
    writes: start,
  };
  if (act.source === 'server') {
    expect(ui.writes.length - start).toBe(1);
    const request = ui.writes[start]!;
    expect(request.method()).toBe('POST');
    expect(new URL(request.url()).pathname).toBe(`/api/trips/${managementTripId(world)}/thumbnail`);
    act.operationId = request.headers()['x-operation-id'];
    expect(act.operationId).toMatch(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
    const response = await request.response();
    expect(response).not.toBeNull();
    expect(await response!.finished()).toBeNull();
    act.response = response!;
  }
  world.set('management:rejectedSelectionAct', act);
}
