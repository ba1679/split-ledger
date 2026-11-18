import type { Database } from '../../../db/index.js';
import type { TripScope } from './lifecycle.js';
import type { ThumbnailProcessor } from './thumbnail.js';

export interface TripManagementHooks {
  /** Observability only: after the complete job (including late native/DB work) settles.
   * Wire in the T243 real pipeline outer finally; never emit at response timeout alone. */
  afterThumbnailJob?(scope: TripScope & { operationId: string }): Promise<void>;
  beforeTripLock?(scope: TripScope): Promise<void>;
  afterTripLock?(scope: TripScope): Promise<void>;
}

// Deliberately unconnected until the feature Green tasks introduce runtime behavior.
export interface TripManagementDependencies {
  db: Database;
  now: () => Date;
  thumbnailProcessor: ThumbnailProcessor;
  hooks?: TripManagementHooks;
}
