import type { ExactAmount } from '@split-ledger/shared';
import { apiRequest } from './index.js';

export interface AnalysisCategory {
  category: { id: string; name: string } | null;
  amount: ExactAmount;
}

export interface AnalysisChart {
  total: ExactAmount;
  categories: AnalysisCategory[];
}

export interface ExpenseAnalysis {
  tripId: string;
  ownerMemberId: string;
  hasSharedExpenses: boolean;
  currencies: {
    currencyCode: string;
    minorUnit: number;
    personal: AnalysisChart;
    group: AnalysisChart;
  }[];
}

export function getExpenseAnalysis(tripId: string, signal: AbortSignal) {
  return apiRequest<ExpenseAnalysis>(`/api/trips/${tripId}/expense-analysis`, { signal });
}
