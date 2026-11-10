import type { OwnedTripScope } from '../splitting/dependencies.js';
import type { CreateMemberRequest, TripMember, UpdateMemberRequest } from './schema.js';
import type { MemberRepository } from './repository.js';

export interface MemberService extends MemberRepository {
  create(scope: OwnedTripScope, request: CreateMemberRequest): Promise<TripMember>;
  update(
    scope: OwnedTripScope,
    memberId: string,
    request: UpdateMemberRequest,
  ): Promise<TripMember>;
  remove(scope: OwnedTripScope, memberId: string): Promise<void>;
}
