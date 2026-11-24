import { tripText, useTripText } from './messages.js';
import React, { useEffect, useRef, useState } from 'react';
import { Mountain } from 'lucide-react';
import { ActionButton } from '../../components/waiting/ActionButton.js';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { requestThumbnail, type ThumbnailCommandInput } from '../../api/thumbnail.js';
import { apiRequest, ApiError, type Trip } from '../../api/index.js';
import { useSession } from '../auth/session.js';
import { Button } from '../../components/ui/button.js';
import { FormDialog } from '../../components/FormDialog.js';
import { usePreviewUrl } from './use-preview-url.js';
import { TripOperationCheck } from './TripOperationCheck.js';
import type { ManagedTrip, OperationOutcome, TripState } from './management-api.js';

type ThumbnailDraft = { kind: 'photo'; file: File } | { kind: 'default' } | null;
type ImageAttempt = ThumbnailCommandInput & { file?: File };

function selectionError(files: FileList): string | null {
  const selected = files[0];
  if (files.length !== 1) return tripText('chooseOneImageAtATimeSelectAnother');
  if (selected!.size === 0) return tripText('thisImageFileIsEmptyChooseAValid');
  if (selected!.size > 10 * 1024 * 1024) return tripText('theImageExceeds10MiBReduceItsSize');
  if (selected!.type && !['image/jpeg', 'image/png', 'image/webp'].includes(selected!.type))
    return tripText('thisFormatIsNotSupportedConvertItTo');

  return null;
}

function rejectionMessage(failure: ApiError): string {
  if (failure.code === 'THUMBNAIL_UPDATED')
    return tripText('theImageChangedOnAnotherDeviceCheckThe');
  if (failure.code === 'TRIP_STATE_CHANGED')
    return tripText('theTripStatusChangedCheckItsCurrentStatus');
  if (failure.code === 'UNSUPPORTED_IMAGE_TYPE')
    return tripText('thisFormatOrAnimationIsNotSupportedConvert');
  if (failure.code === 'INVALID_IMAGE') return tripText('theImageIsDamagedOrItsDimensionsAre');
  if (failure.code === 'IMAGE_TOO_LARGE') return tripText('theImageExceedsTheLimits10MiB25');

  return failure.message;
}

export function ThumbnailEntryDialog({
  trip,
  open = true,
  onClose,
  availability = 'active',
}: {
  trip: ManagedTrip;
  open?: boolean;
  onClose: () => void;
  availability?: TripState['state'];
}) {
  useTripText();
  const unavailable = availability !== 'active';
  const cancel = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ThumbnailDraft>(null);
  const file = draft?.kind === 'photo' ? draft.file : undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unknown, setUnknown] = useState(false);
  const [attempt, setAttempt] = useState<ImageAttempt | null>(null);
  const [confirmed, setConfirmed] = useState<Blob | null>(null);
  const [failedPreviewUrl, setFailedPreviewUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);
  const alive = useRef(true);
  const locked = useRef(false);
  const wasOpen = useRef(open);
  const client = useQueryClient();
  const { account } = useSession();

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (open && !wasOpen.current) setNotice(null);
    wasOpen.current = open;
    if (!open && !attempt) {
      setDraft(null);
      setError(null);
      setConfirmed(null);
      setShowRefresh(false);
    }
  }, [open, attempt]);

  async function complete(current?: TripState) {
    if (!alive.current) return;
    await Promise.all([
      client.invalidateQueries({ queryKey: ['account', account!.id, 'trips'] }),
      client.invalidateQueries({ queryKey: ['account', account!.id, 'trip', trip.id] }),
    ]);
    if (!alive.current) return;
    setAttempt(null);
    setUnknown(false);
    setDraft(null);
    setError(null);
    setNotice(
      current
        ? current.state !== 'active'
          ? tripText(
              current.state === 'trash'
                ? 'thumbnailSaveVerifiedTripInTrash'
                : 'thumbnailSaveVerifiedTripPurged',
            )
          : tripText(
              current.hasThumbnail
                ? 'thumbnailSaveVerifiedCurrentImage'
                : 'thumbnailSaveVerifiedDefaultImage',
            )
        : tripText('imageSavedTheOriginalOperationIsConfirmed'),
    );
    if (!current) onClose();
  }

  async function verify(original: ImageAttempt) {
    setBusy(true);
    setUnknown(true);
    setError(null);
    try {
      const [receipt, state] = await Promise.allSettled([
        apiRequest<OperationOutcome>(
          `/api/trips/${original.tripId}/operations/${original.operationId}`,
          {
            signal: AbortSignal.timeout(5000),
          },
        ),
        apiRequest<TripState>(`/api/trips/${original.tripId}/state`, {
          signal: AbortSignal.timeout(5000),
        }),
      ]);
      if (!alive.current) return;
      if (receipt.status !== 'fulfilled' || state.status !== 'fulfilled') return;
      if (
        receipt.value.result.operationId !== original.operationId ||
        receipt.value.result.kind !== (original.file ? 'save_thumbnail' : 'reset_thumbnail')
      )
        return;
      await complete(state.value);
    } finally {
      setBusy(false);
    }
  }

  async function refreshCurrent() {
    setBusy(true);
    setRefreshing(true);
    setShowRefresh(true);
    try {
      const state = await apiRequest<TripState>(`/api/trips/${trip.id}/state`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!alive.current || client.getQueryData<{ id: string }>(['session'])?.id !== account!.id)
        return;
      if (state.state === 'active') {
        const current = await apiRequest<Trip>(`/api/trips/${trip.id}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!alive.current || client.getQueryData<{ id: string }>(['session'])?.id !== account!.id)
          return;
        client.setQueryData(['account', account!.id, 'trip', trip.id], current);
      }
      client.setQueriesData<TripState>(
        {
          predicate: (query) =>
            query.queryKey[0] === 'account' &&
            query.queryKey[1] === account!.id &&
            query.queryKey.includes(trip.id) &&
            query.queryKey.includes('entry-state'),
        },
        state,
      );
      setConflict(state.state !== 'active');
    } catch {
      // Keep the draft and require an explicit fresh read before another save.
      if (alive.current) setConflict(true);
    } finally {
      if (alive.current) {
        setBusy(false);
        setRefreshing(false);
      }
    }
  }

  async function save() {
    if (!draft || locked.current || unknown || conflict || unavailable) return;
    const original: ImageAttempt = {
      tripId: trip.id,
      operationId: crypto.randomUUID(),
      expectedLifecycleRevision: trip.lifecycleRevision,
      expectedThumbnailRevision: trip.thumbnailRevision,
      ...(file ? { file } : {}),
    };
    locked.current = true;
    setBusy(true);
    setError(null);
    setAttempt(original);
    setShowRefresh(false);
    try {
      await requestThumbnail<OperationOutcome>(original);
      await complete();
    } catch (failure) {
      if (
        failure instanceof ApiError &&
        ([400, 401, 403, 404, 409, 413, 415, 422].includes(failure.status) ||
          failure.code === 'UPLOAD_BUSY')
      ) {
        setAttempt(null);
        setError(tripText('imageNotSavedReason', { reason: rejectionMessage(failure) }));
        if (
          [
            'THUMBNAIL_UPDATED',
            'TRIP_STATE_CHANGED',
            'TRIP_TRASHED',
            'TRIP_PURGED',
            'NOT_FOUND',
          ].includes(failure.code)
        ) {
          setConflict(true);
          await refreshCurrent();
        }
      } else {
        await verify(original);
      }
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!open || attempt || unavailable) return;
    if (!trip.hasThumbnail) {
      setConfirmed(null);

      return;
    }
    const controller = new AbortController();
    void fetch(`/api/trips/${trip.id}/thumbnail/${trip.thumbnailRevision}`, {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.ok) {
          const blob = await response.blob();
          if (!controller.signal.aborted) setConfirmed(blob);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [trip.id, trip.hasThumbnail, trip.thumbnailRevision, open, attempt, unavailable]);

  const confirmedPreview = usePreviewUrl(confirmed, open);
  const preview = usePreviewUrl(file, open);

  const source =
    busy || unknown
      ? confirmedPreview
      : file
        ? preview
        : draft?.kind !== 'default' && trip.hasThumbnail
          ? `/api/trips/${trip.id}/thumbnail/${trip.thumbnailRevision}`
          : null;

  const failedDraftPreview = Boolean(
    file && source && !busy && !unknown && source === preview && source === failedPreviewUrl,
  );

  const outcome = attempt ? (
    <section className="thumbnail-outcome" role="status">
      <p>{tripText('imageSaveResultUnconfirmedCheckTheOriginalOperation')}</p>
      <TripOperationCheck
        busy={busy}
        onCheck={() => verify(attempt)}
        busyLabel={tripText('checkingImageSave')}
      />
    </section>
  ) : null;

  if (!open)
    return (
      <>
        {outcome}
        {notice ? (
          <p role="status" className="feedback">
            {notice}
          </p>
        ) : null}
      </>
    );

  return (
    <FormDialog
      title={tripText('customizeTripThumbnail')}
      description={
        unknown ? (
          tripText('theImageSaveResultForNameIsUnconfirmed', { name: trip.name })
        ) : (
          <>
            <span className="desktop-thumbnail-description">
              {draft?.kind === 'default'
                ? tripText('theDefaultLandscapeIsSelectedLocallyForName', { name: trip.name })
                : tripText('chooseAPhotoForNameToMakeThe', { name: trip.name })}
            </span>
            <span className="mobile-thumbnail-description">
              {draft?.kind === 'default'
                ? tripText('defaultLandscapeSelectedForNameSaveToApply', { name: trip.name })
                : tripText('chooseAPhotoForName', { name: trip.name })}
            </span>
          </>
        )
      }
      onClose={onClose}
      showClose
      initialFocus={cancel}
      className={`thumbnail-editor${error || unknown || notice ? ' has-feedback' : ''}`}
    >
      <div className="thumbnail-preview-area">
        {unavailable && !file ? (
          <div
            className="thumbnail-confirmed-placeholder"
            role="img"
            aria-label={tripText('thisTripSThumbnailCannotBeEditedNow')}
          >
            {tripText('thisTripSThumbnailCannotBeEditedNow')}
          </div>
        ) : source && !failedDraftPreview ? (
          <img
            key={source}
            className="thumbnail-preview"
            src={source}
            alt={tripText('thumbnailPreviewForName', { name: trip.name })}
            onError={
              file && !busy && !unknown && source === preview
                ? () => setFailedPreviewUrl(source)
                : undefined
            }
          />
        ) : failedDraftPreview ? (
          <div
            className="thumbnail-confirmed-placeholder"
            role="img"
            aria-label={tripText('cannotPreviewThisPhotoChooseAnotherImage')}
          >
            {tripText('cannotPreviewThisPhotoChooseAnotherImage')}
          </div>
        ) : (busy || unknown) && trip.hasThumbnail ? (
          <div
            className="thumbnail-confirmed-placeholder"
            role="img"
            aria-label={tripText('lastConfirmedImagePreviewUnavailable')}
          >
            {tripText('lastConfirmedImagePreviewUnavailable')}
          </div>
        ) : (
          <div
            className="thumbnail-default"
            role="img"
            aria-label={tripText('defaultTripThumbnail')}
          >
            <Mountain size={48} aria-hidden="true" />
          </div>
        )}
        {draft ? (
          <span className="thumbnail-draft-badge">
            {unknown
              ? tripText('resultUnconfirmed')
              : busy
                ? tripText('lastConfirmedThumbnail')
                : tripText('notSavedYet')}
          </span>
        ) : null}
      </div>
      <div className="thumbnail-selection">
        <strong className="thumbnail-filename">
          {file
            ? file.name
            : draft?.kind === 'default'
              ? tripText('defaultTripThumbnail')
              : tripText('currentTripThumbnail')}
        </strong>
        <div className="thumbnail-tools">
          <Button
            variant="ghost"
            disabled={busy || unknown || unavailable}
            onClick={() => {
              if (input.current) {
                input.current.value = '';
                input.current.click();
              }
            }}
          >
            {tripText('chooseAnotherImage')}
          </Button>
          <span aria-hidden="true">・</span>
          <Button
            variant="ghost"
            disabled={busy || unknown || unavailable}
            onClick={() => {
              setDraft({ kind: 'default' });
              setError(null);
              setNotice(null);
            }}
          >
            {tripText('useDefaultImage')}
          </Button>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => {
          const selected = event.currentTarget.files?.[0];
          if (selected && !busy && !attempt && !unavailable) {
            const localError = selectionError(event.currentTarget.files!);
            setDraft(localError ? null : { kind: 'photo', file: selected });
            setError(localError);
            setNotice(null);
          }
        }}
      />
      <div className="thumbnail-limits">
        <p>{tripText('oneStillJPGJpgJpegPNGOrWebP')}</p>
        <p>{tripText('longestSide16384PixelsTotalUpTo')}</p>
        <p>
          <span className="desktop-thumbnail-description">
            {tripText('convertHEICPhotosFromYourPhoneToJPG')}
          </span>
          <span className="mobile-thumbnail-description">
            {tripText('convertHEICToJPGPNGOrWebPFirst')}
          </span>
        </p>
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {unknown ? outcome : null}
      {showRefresh || conflict || unavailable ? (
        <TripOperationCheck
          busy={refreshing}
          onCheck={refreshCurrent}
          label={tripText('reloadCurrentStatus')}
          busyLabel={tripText('reloadingCurrentStatus')}
        />
      ) : null}
      {unavailable ? (
        <p className="error">
          {availability === 'trash'
            ? tripText('tripIsInTrashYourPhotoDraftIs')
            : tripText('thisTripWasPermanentlyDeletedThePhotoCannot')}
          <Link to={availability === 'trash' ? '/trips/trash' : '/trips'}>
            {availability === 'trash' ? tripText('goToTrashToRestore') : tripText('backToTripList')}
          </Link>
        </p>
      ) : null}
      {notice ? (
        <p className="feedback" role="status">
          {notice}
        </p>
      ) : null}
      <div className="form-actions thumbnail-actions">
        <Button ref={cancel} variant="outline" onClick={onClose}>
          {tripText('cancel')}
        </Button>
        <ActionButton
          label={tripText('saveImage')}
          busy={busy && !refreshing}
          busyLabel={tripText('savingImage')}
          disabled={!draft || busy || unknown || conflict || unavailable}
          onClick={() => {
            void save();
          }}
        />
      </div>
    </FormDialog>
  );
}
