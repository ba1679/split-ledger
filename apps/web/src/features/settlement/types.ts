import type { ExactAmount } from '@split-ledger/shared';
import type { Repayment } from '../repayments/types.js';

export interface SettlementArrangement {
  readonly key: string;
  readonly debtorMemberId: string;
  readonly creditorMemberId: string;
  readonly currencyCode: string;
  readonly amount: ExactAmount;
}

export interface SettlementView {
  readonly accountingRevision: string;
  readonly simplifyDebts: boolean;
  readonly balances: readonly {
    readonly memberId: string;
    readonly currencyCode: string;
    readonly netAmount: ExactAmount;
  }[];
  readonly arrangements: readonly SettlementArrangement[];
  readonly explanation: string;
  readonly directArrangementCount: number;
  readonly suggestedArrangementCount: number;
}

export interface SettlementViewWithExplanationDetails extends SettlementView {
  readonly explanationDetails: {
    readonly kind: 'direct' | 'unchanged' | 'changed';
    readonly directArrangements: readonly Omit<SettlementArrangement, 'key'>[];
  };
}

export interface SettleArrangementRequest {
  readonly id: string;
  readonly repaymentId: string;
  readonly arrangementKey: string;
  readonly accountingRevision: string;
  readonly debtorMemberId: string;
  readonly creditorMemberId: string;
  readonly currencyCode: string;
  readonly expectedAmount: ExactAmount;
  readonly paidAmount: string;
  readonly paidOn: string;
}

export interface SettlementRecord {
  readonly id: string;
  readonly tripId: string;
  readonly arrangementKey: string;
  readonly sourceRevision: string;
  readonly simplifyDebts: boolean;
  readonly debtorMemberId: string;
  readonly creditorMemberId: string;
  readonly currencyCode: string;
  readonly obligation: ExactAmount;
  readonly repayment: Repayment;
  readonly adjustments: readonly {
    readonly memberId: string;
    readonly currencyCode: string;
    readonly amount: ExactAmount;
  }[];
  readonly createdAt: string;
}

export interface PartialArrangementPayment {
  readonly kind: 'partial';
  readonly repayment: Repayment;
  readonly remainingAmount: ExactAmount;
  readonly accountingRevision: string;
}

export type ArrangementPaymentResult = SettlementRecord | PartialArrangementPayment;
