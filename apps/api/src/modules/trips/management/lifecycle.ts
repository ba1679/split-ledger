export type TripLifecycleState = 'active' | 'trash' | 'purged';

export interface TripScope {
  ownerId: string;
  tripId: string;
}

export interface TripVersions {
  lifecycleRevision: bigint;
  thumbnailRevision: bigint;
}

export interface TripCommandContext extends TripScope {
  operationId: string;
  expectedLifecycleRevision: bigint;
}

export type TripLifecycleCommand = 'trash' | 'restore' | 'purge';
