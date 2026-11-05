import { parseMoney } from '@split-ledger/shared';
import { apiRequest, ApiError, type Expense } from '../../api/index.js';

export interface SaveIntent {
  kind: 'save'; id: string; tripId: string; item: string; spentOn: string; currencyCode: string;
  minorUnit: number; amountMinor: string; categoryId: string | null;
}
export interface DeleteIntent { kind: 'delete'; id: string; tripId: string }
export type WriteIntent = SaveIntent | DeleteIntent;
export function unconfirmedMessage(kind: WriteIntent['kind']) {
  return `${kind === 'save' ? '保存' : '刪除'}結果尚未確認，請重新整理確認。`;
}
export class UnconfirmedWrite extends Error {
  constructor(readonly intent: WriteIntent, cause: unknown) { super(unconfirmedMessage(intent.kind), { cause }); }
}
export class OfflineWrite extends Error {
  constructor(kind: WriteIntent['kind']) { super(`目前無法連線，這筆支出尚未${kind === 'save' ? '保存' : '刪除'}。請保留畫面並在連線後再試。`); }
}
export function definitelyRejected(error: unknown) { return error instanceof ApiError && error.status < 500; }
export async function verifiedSave(intent: SaveIntent): Promise<Expense | null> {
  try {
    const saved = await apiRequest<Expense>(`/api/trips/${intent.tripId}/expenses/${intent.id}`);
    if (saved.id === intent.id && saved.tripId === intent.tripId && saved.item === intent.item && saved.spentOn === intent.spentOn &&
      saved.currencyCode === intent.currencyCode && saved.minorUnit === intent.minorUnit && (saved.category?.id ?? null) === intent.categoryId &&
      parseMoney(saved.amount, saved.minorUnit).toString() === intent.amountMinor) return saved;
  } catch { /* Even a 404 cannot establish the outcome of a potentially in-flight POST. */ }
  return null;
}
export async function verifiedDelete(intent: DeleteIntent) {
  try { await apiRequest<Expense>(`/api/trips/${intent.tripId}/expenses/${intent.id}`); }
  catch (error) { return error instanceof ApiError && error.status === 404; }
  return false;
}
