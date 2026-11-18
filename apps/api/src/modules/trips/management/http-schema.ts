import { Type } from '@sinclair/typebox';
import { Uuid } from '../../../http.js';

export const revisionPattern = /^(?:0|[1-9][0-9]*)$/;

export const Revision = Type.String({ pattern: revisionPattern.source });

export const State = Type.Object(
  {
    state: Type.Union([Type.Literal('active'), Type.Literal('trash'), Type.Literal('purged')]),
    lifecycleRevision: Type.Union([Revision, Type.Null()]),
    thumbnailRevision: Type.Union([Revision, Type.Null()]),
    hasThumbnail: Type.Union([Type.Boolean(), Type.Null()]),
  },
  { additionalProperties: false },
);
const Result = Type.Object(
  {
    operationId: Uuid,
    kind: Type.Union(
      ['move_to_trash', 'restore', 'purge', 'save_thumbnail', 'reset_thumbnail'].map((value) =>
        Type.Literal(value),
      ),
    ),
    state: Type.Union([Type.Literal('active'), Type.Literal('trash'), Type.Literal('purged')]),
    lifecycleRevision: Revision,
    thumbnailRevision: Revision,
    thumbnailPresent: Type.Union([Type.Boolean(), Type.Null()]),
  },
  { additionalProperties: false },
);

export const OperationOutcome = Type.Object(
  { result: Result, currentState: State },
  { additionalProperties: false },
);
