import { apiRequest } from './index.js';

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

export function requestThumbnail<T>(input: ThumbnailCommandInput & { file?: File }): Promise<T> {
  const body = input.file ? new FormData() : undefined;
  if (input.file) body!.append('image', input.file);
  const timeout = AbortSignal.timeout(75_000);

  return apiRequest<T>(`/api/trips/${input.tripId}/thumbnail`, {
    method: input.file ? 'POST' : 'DELETE',
    headers: {
      'X-Operation-Id': input.operationId,
      'X-Expected-Lifecycle-Revision': input.expectedLifecycleRevision,
      'X-Expected-Thumbnail-Revision': input.expectedThumbnailRevision,
    },
    ...(body ? { body } : {}),
    signal: input.signal ? AbortSignal.any([input.signal, timeout]) : timeout,
  });
}
