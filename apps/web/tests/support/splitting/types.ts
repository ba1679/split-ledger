import type { Page, Route } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { SourceSnapshot } from '../../../../api/tests/support/splitting/types.js';
import type { ExactAmount } from '@split-ledger/shared';

export interface SplittingPageContext {
  readonly page: Page;
  readonly world: LedgerWorld;
}

export interface StableCommandIds {
  readonly commandId: string;
  readonly repaymentId?: string;
  readonly mutationIds: string[];
  readonly lookupIds: string[];
}

export interface ConfirmedApiSnapshot {
  readonly tripId: string;
  readonly accountingRevision: string;
  readonly sources: SourceSnapshot;
  readonly balances: readonly {
    readonly memberId: string;
    readonly currencyCode: string;
    readonly netAmount: ExactAmount;
  }[];
}

/** Transmission controls may drop real responses, never manufacture a saved result. */
export interface LostResponseInterceptor {
  readonly ids: StableCommandIds;
  handleMutation(route: Route): Promise<void>;
  handleVerification(route: Route): Promise<void>;
  restore(): Promise<void>;
}

export type VerificationAvailability = 'available' | 'temporary-not-found' | 'unavailable';

/** Selectors belong in concrete page objects, rather than step registrations. */
export interface SplittingPage {
  openMembers(tripId: string): Promise<void>;
  openSettlement(tripId: string): Promise<void>;
  openIndependentRepayment(tripId: string): Promise<void>;
  choosePayer(memberName: string): Promise<void>;
  choosePayee(memberName: string): Promise<void>;
  chooseShares(memberNames: readonly string[]): Promise<void>;
  fillAmount(amount: string): Promise<void>;
  fillDate(date: string): Promise<void>;
  submit(): Promise<void>;
  recheck(): Promise<void>;
}

export interface SplittingBrowserState {
  readonly commands: Map<string, StableCommandIds>;
  readonly confirmed: Map<string, ConfirmedApiSnapshot>;
}
