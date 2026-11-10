import type { OwnedTripScope } from '../splitting/dependencies.js';
import type { TripMember } from './schema.js';

export interface MemberRepository {
  list(scope: OwnedTripScope): Promise<readonly TripMember[]>;
  find(scope: OwnedTripScope, memberId: string): Promise<TripMember | undefined>;
}
