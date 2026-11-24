import { localizeApiError } from '../i18n/api-errors.js';
import type { ExactAmount } from '@split-ledger/shared';
import type { OverpaymentConfirmation } from '../features/repayments/types.js';

export type { TripMember } from '../features/members/types.js';

export interface Account {
  id: string;
  name: string;
}

export interface Trip {
  lifecycleRevision: string;
  thumbnailRevision: string;
  hasThumbnail: boolean;
  ownerMemberId: string;
  simplifyDebts: boolean;
  accountingRevision: string;
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  expenseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  usageCount: number;
}

export interface Currency {
  code: string;
  name: string;
  minorUnit: number;
}

export interface CurrencyList {
  snapshotDate: string;
  items: Currency[];
}

export interface Expense {
  payerMemberId: string;
  shares: { memberId: string; amount: ExactAmount }[];
  id: string;
  tripId: string;
  item: string;
  amount: string;
  currencyCode: string;
  minorUnit: number;
  spentOn: string;
  category: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseList {
  items: Expense[];
  nextCursor: string | null;
  totalCount: number;
}

export interface CurrencyTotal {
  currencyCode: string;
  amount: string;
  minorUnit: number;
}

export interface PersonalCurrencyTotal {
  currencyCode: string;
  amount: ExactAmount;
}

export interface ItemList<T> {
  items: T[];
  nextCursor?: string | null;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly field?: string,
    readonly confirmation?: OverpaymentConfirmation,
    readonly serverMessage?: string,
  ) {
    super(message);
  }
}

export function apiErrorMessage(error: ApiError): string {
  return localizeApiError(error.code, error.field, error.serverMessage);
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', ...options });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
      field?: string;
      confirmation?: OverpaymentConfirmation;
    } | null;

    if (response.status === 401 && path !== '/api/me')
      window.dispatchEvent(new Event('ledger:unauthenticated'));

    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN_ERROR',
      localizeApiError(error?.code ?? 'UNKNOWN_ERROR', error?.field, error?.message),
      error?.field,
      error?.confirmation,
      error?.message,
    );
  }
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}
