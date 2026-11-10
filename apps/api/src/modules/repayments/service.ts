import type { OwnedTripScope } from '../splitting/dependencies.js';
import type { RepaymentRepository } from './repository.js';
import type { CreateRepaymentRequest, Repayment } from './schema.js';

export interface RepaymentService extends RepaymentRepository {
  create(scope: OwnedTripScope, request: CreateRepaymentRequest): Promise<Repayment>;
}
