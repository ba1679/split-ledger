// Transport input boundaries only; product requests and response parsing arrive in Green tasks.
// Revisions remain decimal strings and must never be coerced through Number.
export interface ThumbnailCommandInput {
  tripId: string;
  operationId: string;
  expectedLifecycleRevision: string;
  expectedThumbnailRevision: string;
  signal?: AbortSignal;
}

export interface ThumbnailUploadInput extends ThumbnailCommandInput {
  file: File;
}

export interface ThumbnailReadInput {
  tripId: string;
  thumbnailRevision: string;
  scope: 'active' | 'trash';
  signal?: AbortSignal;
}
