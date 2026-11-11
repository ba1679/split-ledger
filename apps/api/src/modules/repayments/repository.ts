import type { OwnedTripScope } from '../splitting/dependencies.js';
import type { Repayment } from './schema.js';

export interface RepaymentRepository {
  list(scope: OwnedTripScope): Promise<readonly Repayment[]>;
  find(scope: OwnedTripScope, repaymentId: string): Promise<Repayment | undefined>;
}
