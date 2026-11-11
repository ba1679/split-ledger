export interface TripMember {
  readonly id: string;
  readonly tripId: string;
  readonly role: 'owner' | 'companion';
  readonly name: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateMemberRequest {
  readonly id: string;
  readonly name: string;
}

export interface UpdateMemberRequest {
  readonly name?: string;
  readonly isActive?: boolean;
}
