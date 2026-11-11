import type { OwnedTripScope } from '../splitting/dependencies.js';
import type { SettlementRepository } from './repository.js';
import type {
  SettleArrangementRequest,
  ArrangementPaymentResult,
  SettlementView,
} from './schema.js';

export interface SettlementService extends SettlementRepository {
  view(scope: OwnedTripScope): Promise<SettlementView>;
  settle(
    scope: OwnedTripScope,
    request: SettleArrangementRequest,
  ): Promise<ArrangementPaymentResult>;
}
