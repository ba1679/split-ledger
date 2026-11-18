import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import sharp from 'sharp';
import type { LedgerWorld } from '../world.js';
import { managementSnapshot, managementTripId, sharedSnapshot } from './baseline.js';
import { executeOwnerTripCommand } from './commands.js';

export async function writeTrashedTrip(world: LedgerWorld, operation: string): Promise<void> {
  if (operation === '保存預設圖') {
    await executeOwnerTripCommand(world, '保存預設圖');

    return;
  }
  const tripId = managementTripId(world);
  const before = await managementSnapshot(world);

  expect(before.trips[0]!.deleted_at).not.toBeNull();
  const member = (name: string) => {
    const id = world.splitting.ids.members.get(name);

    expect(id).toBeDefined();

    return id!;
  };
  const dinner = world.splitting.ids.expenses.get('晚餐')!;
  const commands: Record<
    string,
    { method: string; suffix: string; data?: Record<string, unknown> }
  > = {
    新增支出: {
      method: 'POST',
      suffix: '/expenses',
      data: {
        id: randomUUID(),
        item: '點心',
        amount: '500',
        currencyCode: 'JPY',
        spentOn: '2027-03-14',
        payerMemberId: member('Alice'),
        shareMemberIds: [member('Alice'), member('Amy')],
      },
    },
    修改支出: { method: 'PATCH', suffix: `/expenses/${dinner}`, data: { item: '修正晚餐' } },
    刪除支出: { method: 'DELETE', suffix: `/expenses/${dinner}` },
    新增成員: { method: 'POST', suffix: '/members', data: { id: randomUUID(), name: '新同行者' } },
    修改成員: { method: 'PATCH', suffix: `/members/${member('Amy')}`, data: { name: 'Amy 更新' } },
    停用成員: { method: 'PATCH', suffix: `/members/${member('Amy')}`, data: { isActive: false } },
    啟用成員: { method: 'PATCH', suffix: `/members/${member('Bob')}`, data: { isActive: true } },
    刪除成員: { method: 'DELETE', suffix: `/members/${member('Charlie')}` },
    保存名稱日期: {
      method: 'PATCH',
      suffix: '',
      data: { name: '日本春日旅行', startDate: '2027-03-10', endDate: '2027-03-16' },
    },
    切換簡化付款: { method: 'PATCH', suffix: '', data: { simplifyDebts: false } },
    記錄還款: {
      method: 'POST',
      suffix: '/repayments',
      data: {
        id: randomUUID(),
        payerMemberId: member('Amy'),
        payeeMemberId: member('Alice'),
        amount: '100',
        currencyCode: 'TWD',
        paidOn: '2027-03-14',
      },
    },
    記錄結清: {
      method: 'POST',
      suffix: '/settlements',
      data: world.get<Record<string, unknown>>('management:validSettlementRequest'),
    },
  };

  world.set('management:before', before);
  world.set('management:sharedBefore', await sharedSnapshot(world));
  const headers: Record<string, string> = {
    cookie: world.users.get('Alice')!.cookie,
    origin: world.get('webOrigin'),
  };
  if (operation === '保存新縮圖') {
    const image = await sharp({
      create: { width: 32, height: 24, channels: 3, background: '#e0aa40' },
    })
      .png()
      .toBuffer();

    headers['X-Operation-Id'] = randomUUID();
    headers['X-Expected-Lifecycle-Revision'] = String(before.trips[0]!.lifecycle_revision);
    headers['X-Expected-Thumbnail-Revision'] = String(before.trips[0]!.thumbnail_revision);
    world.response = await world.api.post(`/api/trips/${tripId}/thumbnail`, {
      headers,
      multipart: { image: { name: 'new.png', mimeType: 'image/png', buffer: image } },
    });
  } else {
    expect(Object.keys(commands)).toContain(operation);
    const command = commands[operation]!;

    world.set('management:trashedWrite', command);
    world.response = await world.api.fetch(`/api/trips/${tripId}${command.suffix}`, {
      method: command.method,
      headers,
      ...(command.data ? { data: command.data } : {}),
    });
  }
}
