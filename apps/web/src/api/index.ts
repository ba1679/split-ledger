export interface Account {
  id: string;
  name: string;
}

export interface Trip {
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
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', ...options });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
      field?: string;
    } | null;

    if (response.status === 401 && path !== '/api/me')
      window.dispatchEvent(new Event('ledger:unauthenticated'));

    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN_ERROR',
      error?.message ?? '暫時無法取得資料，請稍後再試。',
      error?.field,
    );
  }
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}
