import type { ExpenseDraft } from './ExpenseForm.js';

export type RetainedExpenseDraft = ExpenseDraft & { id: string };

// Tab-memory only: the session provider cancels and clears all account queries on logout.
export const expenseDraftKey = (ownerId: string, tripId: string) =>
  ['account', ownerId, 'expense-draft', tripId] as const;
