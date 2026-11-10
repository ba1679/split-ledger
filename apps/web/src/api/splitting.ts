import type { ExactAmount } from '@split-ledger/shared';
import type { Trip, Expense } from './index.js';

export type { ExactAmount } from '@split-ledger/shared';

export type {
  TripMember,
  CreateMemberRequest,
  UpdateMemberRequest,
} from '../features/members/index.js';

export type {
  Repayment,
  CreateRepaymentRequest,
  OverpaymentConfirmation,
} from '../features/repayments/index.js';

export type {
  SettlementArrangement,
  SettlementView,
  SettleArrangementRequest,
  SettlementRecord,
} from '../features/settlement/index.js';

export interface SplittingTrip extends Trip {
  ownerMemberId: string;
  simplifyDebts: boolean;
  accountingRevision: string;
}

export interface SharedExpense extends Expense {
  payerMemberId: string;
  shares: { memberId: string; amount: ExactAmount }[];
}

export interface SharedExpenseSelection {
  payerMemberId: string;
  shareMemberIds: string[];
}
