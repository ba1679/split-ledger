import type { ExactAmount } from '@split-ledger/shared';

export interface Repayment {
  readonly id: string;
  readonly tripId: string;
  readonly payerMemberId: string;
  readonly payeeMemberId: string;
  readonly amount: string;
  readonly currencyCode: string;
  readonly minorUnit: number;
  readonly paidOn: string;
  readonly kind: 'independent' | 'settlement';
  readonly settlementId: string | null;
  readonly createdAt: string;
}

export interface OverpaymentConfirmation {
  readonly accountingRevision: string;
  readonly excessAmount: ExactAmount;
  readonly reverseDebtorMemberId: string;
  readonly reverseCreditorMemberId: string;
  readonly confirmationToken: string;
}

export interface CreateRepaymentRequest {
  readonly id: string;
  readonly payerMemberId: string;
  readonly payeeMemberId: string;
  readonly amount: string;
  readonly currencyCode: string;
  readonly paidOn: string;
  readonly overpaymentConfirmation?: OverpaymentConfirmation;
}
