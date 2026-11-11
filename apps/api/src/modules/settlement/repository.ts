import type { OwnedTripScope } from '../splitting/dependencies.js';
import type { SettlementRecord } from './schema.js';

export interface SettlementRepository {
  find(scope: OwnedTripScope, settlementId: string): Promise<SettlementRecord | undefined>;
}
