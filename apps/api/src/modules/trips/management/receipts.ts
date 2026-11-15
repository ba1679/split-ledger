import type { TripLifecycleCommand, TripLifecycleState, TripVersions } from './lifecycle.js';

export type TripOperationKind = TripLifecycleCommand | 'save_thumbnail' | 'reset_thumbnail';

export interface TripOperationResult extends TripVersions {
  operationId: string;
  tripId: string;
  kind: TripOperationKind;
  state: TripLifecycleState;
  thumbnailPresent: boolean;
}
