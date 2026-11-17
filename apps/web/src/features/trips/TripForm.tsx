import React, { useEffect, useId, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiRequest, ApiError, type Trip } from '../../api/index.js';
import { useSession } from '../auth/session.js';
import { FormDialog } from '../../components/FormDialog.js';
import { DateField } from '../../components/DateField.js';
import { dateOnly, parseDate } from '../../components/date.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { TripImagePicker } from './TripImagePicker.js';
import { requestThumbnail, type ThumbnailCommandInput } from '../../api/thumbnail.js';
import { CreatedTripResult } from './CreatedTripResult.js';
import type { OperationOutcome, TripState } from './management-api.js';

type PhotoAttempt = ThumbnailCommandInput & { file: File };

export function TripForm({
  trip,
  onClose,
  onCreationResult,
}: {
  trip?: Trip;
  onClose: () => void;
  onCreationResult?: () => void;
}) {
  const { account } = useSession(),
    client = useQueryClient(),
    navigate = useNavigate();
  const inputId = useId(),
    nameInput = useRef<HTMLInputElement>(null);
  const [id] = useState(() => trip?.id ?? crypto.randomUUID());
  const [name, setName] = useState(trip?.name ?? '');
  const [start, setStart] = useState(trip?.startDate?.replaceAll('-', '/') ?? '');
  const [end, setEnd] = useState(trip?.endDate?.replaceAll('-', '/') ?? '');
  const [validation, setValidation] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [created, setCreated] = useState<Trip | null>(null);
  const [photoFailure, setPhotoFailure] = useState<string | null>(null);
  const [photoPending, setPhotoPending] = useState(false);
  const [photoUnknown, setPhotoUnknown] = useState(false);
  const [currentImageAvailable, setCurrentImageAvailable] = useState(true);
  const [photoAttempt, setPhotoAttempt] = useState<PhotoAttempt | null>(null);
  const [createUnknown, setCreateUnknown] = useState(false);
  const [createVerifying, setCreateVerifying] = useState(false);
  const createLocked = useRef(false);
  const createIntent = useRef<{
    name: string;
    startDate: string | null;
    endDate: string | null;
    lifecycleRevision: string;
    thumbnailRevision: string;
  } | null>(null);
  const photoLocked = useRef(false);
  const alive = useRef(true);
  const photoError =
    file && (/\.hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type))
      ? 'HEIC 照片目前不支援，請先轉成 JPG、PNG 或 WebP，或移除選圖。'
      : '';

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
    };
  }, []);

  async function finish(saved: Trip, message?: string) {
    if (!alive.current) return;
    if (trip) client.setQueryData(['account', account!.id, 'trip', saved.id], saved);
    await Promise.all([
      client.invalidateQueries({ queryKey: ['account', account!.id, 'trips'] }),
      ...(!trip
        ? [client.invalidateQueries({ queryKey: ['account', account!.id, 'trip', saved.id] })]
        : []),
    ]);
    if (!alive.current) return;
    onClose();
    navigate(`/trips/${saved.id}`, message ? { state: { message } } : undefined);
  }

  async function verifyPhoto(saved: Trip, original: PhotoAttempt) {
    if (!alive.current) return;
    setPhotoPending(true);
    setPhotoUnknown(true);
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
      if (!alive.current || receipt.status !== 'fulfilled' || state.status !== 'fulfilled') return;
      if (
        receipt.value.result.operationId !== original.operationId ||
        receipt.value.result.kind !== 'save_thumbnail'
      )
        return;
      const current = await apiRequest<Trip>(`/api/trips/${saved.id}`, {
        signal: AbortSignal.timeout(5000),
      });
      await finish(
        current,
        `原次圖片保存已確認成功。目前縮圖${current.hasThumbnail ? '已保存，以目前圖片為準' : '使用預設圖'}。`,
      );
    } catch {
      // Keep the original operation and File while its current projection is unavailable.
    } finally {
      if (alive.current) setPhotoPending(false);
    }
  }

  async function savePhoto(saved: Trip) {
    if (!alive.current || !file || photoLocked.current || photoUnknown) return;
    photoLocked.current = true;
    setPhotoPending(true);
    setPhotoFailure(null);
    const original: PhotoAttempt = {
      tripId: saved.id,
      operationId: crypto.randomUUID(),
      expectedLifecycleRevision: createIntent.current?.lifecycleRevision ?? saved.lifecycleRevision,
      expectedThumbnailRevision: createIntent.current?.thumbnailRevision ?? saved.thumbnailRevision,
      file,
    };
    setPhotoAttempt(original);
    try {
      await requestThumbnail<OperationOutcome>(original);
      await finish(saved);
    } catch (error) {
      if (!alive.current) return;
      if (
        error instanceof ApiError &&
        ([400, 401, 403, 404, 409, 413, 415].includes(error.status) || error.code === 'UPLOAD_BUSY')
      ) {
        const current = await apiRequest<Trip>(`/api/trips/${saved.id}`, {
          signal: AbortSignal.timeout(5000),
        }).catch(() => null);
        if (!alive.current) return;
        setCreated(current ?? saved);
        setCurrentImageAvailable(Boolean(current));
        setPhotoAttempt(null);
        setPhotoFailure(error.message);
        onCreationResult?.();
      } else {
        setCreated(saved);
        onCreationResult?.();
        await verifyPhoto(saved, original);
      }
    } finally {
      photoLocked.current = false;
      if (alive.current) setPhotoPending(false);
    }
  }

  async function lookupCreation() {
    const original = createIntent.current;
    if (!alive.current || !original) return;
    setCreateUnknown(true);
    setCreateVerifying(true);
    try {
      const state = await apiRequest<TripState>(`/api/trips/${id}/state`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!alive.current || state.state !== 'active') return;
      const saved = await apiRequest<Trip>(`/api/trips/${id}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (
        !alive.current ||
        saved.id !== id ||
        saved.name !== original.name ||
        saved.startDate !== original.startDate ||
        saved.endDate !== original.endDate
      )
        return;
      setCreateUnknown(false);

      return saved;
    } catch {
      // A missing or unavailable state never authorizes another creation.
    } finally {
      if (alive.current) setCreateVerifying(false);
    }
  }

  async function afterCreation(saved: Trip | undefined) {
    if (!saved || !alive.current) return;
    if (!trip && file) {
      await savePhoto(saved);

      return;
    }
    await finish(saved);
  }

  const mutation = useMutation({
    retry: false,
    mutationFn: async (dates: { startDate: string | null; endDate: string | null }) => {
      if (!trip)
        createIntent.current = {
          name: name.trim(),
          ...dates,
          lifecycleRevision: '0',
          thumbnailRevision: '0',
        };
      try {
        return await apiRequest<Trip>(trip ? `/api/trips/${id}` : '/api/trips', {
          method: trip ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(trip ? dates : { id, name: name.trim(), ...dates }),
          signal: trip ? undefined : AbortSignal.timeout(15000),
        });
      } catch (error) {
        if (!trip) {
          if (
            error instanceof ApiError &&
            [400, 401, 403, 404, 409, 413, 415].includes(error.status)
          )
            throw error;

          return await lookupCreation();
        }
        if (error instanceof ApiError) throw error;
        // A lost response is checked using the original UUID instead of issuing another mutation.
        try {
          const saved = await apiRequest<Trip>(`/api/trips/${id}`);

          if (
            saved.startDate === dates.startDate &&
            saved.endDate === dates.endDate &&
            (trip || saved.name === name.trim())
          )
            return saved;
        } catch {
          /* Keep the original draft and UUID when the result cannot be verified. */
        }
        throw new Error('保存結果尚未確認，請重新整理確認。', { cause: error });
      }
    },
    onSuccess: afterCreation,
    onSettled: () => {
      createLocked.current = false;
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      mutation.isPending ||
      photoPending ||
      createUnknown ||
      createVerifying ||
      (!trip && photoError)
    )
      return;
    if (!name.trim()) {
      setValidation('請填寫旅行名稱。');
      nameInput.current?.focus();

      return;
    }

    const parsedStart = parseDate(start),
      parsedEnd = parseDate(end);

    if ((start.trim() && !parsedStart) || (end.trim() && !parsedEnd)) {
      setValidation('請輸入有效日期，例如 2027/03/11。');

      return;
    }

    const startDate = parsedStart ? dateOnly(parsedStart) : null,
      endDate = parsedEnd ? dateOnly(parsedEnd) : null;

    if (startDate && endDate && endDate < startDate) {
      setValidation('結束日不能早於開始日。');

      return;
    }

    setValidation('');
    if (!trip) {
      if (createLocked.current) return;
      createLocked.current = true;
    }
    mutation.mutate({ startDate, endDate });
  }

  const busy = mutation.isPending || photoPending || createVerifying;

  if (created)
    return (
      <CreatedTripResult
        trip={created}
        error={photoFailure}
        busy={photoPending}
        unknown={photoUnknown}
        currentImageAvailable={currentImageAvailable}
        draftName={file?.name}
        onVerify={() => {
          if (photoAttempt && !photoLocked.current) {
            photoLocked.current = true;
            void verifyPhoto(created, photoAttempt).finally(() => {
              photoLocked.current = false;
            });
          }
        }}
        onRetry={() => {
          void savePhoto(created);
        }}
      />
    );

  return (
    <FormDialog
      title={trip ? '旅行日期' : '新增旅行'}
      description={trip ? undefined : '旅行名稱為必填；日期和縮圖可稍後設定。'}
      className={
        trip
          ? undefined
          : `create-trip-dialog${photoError || createUnknown || validation || mutation.error ? ' has-feedback' : ''}`
      }
      showClose={!trip}
      initialFocus={trip ? undefined : nameInput}
      onClose={onClose}
      busy={busy}
    >
      <form noValidate onSubmit={submit} className={trip ? undefined : 'ds-trip-form'}>
        <fieldset className="trip-form-fields" disabled={!trip && (busy || createUnknown)}>
          {!trip ? (
            <div className="field">
              <label htmlFor={inputId}>旅行名稱</label>
              <Input
                id={inputId}
                ref={nameInput}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：京都賞楓"
                required
              />
            </div>
          ) : null}
          <div className="two-col">
            <DateField
              label="開始日"
              value={start}
              onChange={setStart}
              optional
              placeholder={trip ? undefined : '年 / 月 / 日'}
            />
            <DateField
              label="結束日"
              value={end}
              onChange={setEnd}
              optional
              placeholder={trip ? undefined : '年 / 月 / 日'}
            />
          </div>
          {!trip ? (
            <TripImagePicker
              file={file}
              onChange={setFile}
              invalid={Boolean(photoError)}
              disabled={busy || createUnknown}
            />
          ) : null}
        </fieldset>
        <p className="error" role="alert">
          {photoError || validation || mutation.error?.message}
        </p>
        {createUnknown ? (
          <section className="create-trip-unknown" role="status">
            <p>旅行建立結果尚未確認；請查證原次建立。照片尚未送出。</p>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              aria-busy={createVerifying}
              aria-label={createVerifying ? '正在查證旅行建立' : undefined}
              onClick={() => {
                if (createLocked.current) return;
                createLocked.current = true;
                void (async () => {
                  const saved = await lookupCreation();
                  await afterCreation(saved);
                })().finally(() => {
                  createLocked.current = false;
                });
              }}
            >
              {createVerifying ? (
                <LoaderCircle size={20} className="action-spinner" aria-hidden="true" />
              ) : (
                '再次查證'
              )}
            </Button>
          </section>
        ) : null}
        <div className="form-actions">
          {trip ? (
            <>
              <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
                取消
              </Button>
              <Button variant="default" disabled={mutation.isPending}>
                {mutation.isPending ? '儲存中…' : '儲存日期'}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
                取消
              </Button>
              <Button
                disabled={busy || createUnknown || Boolean(photoError)}
                aria-busy={busy}
                aria-label={busy ? (photoPending ? '正在保存旅行圖片' : '正在建立旅行') : undefined}
              >
                {busy ? (
                  <LoaderCircle size={20} className="action-spinner" aria-hidden="true" />
                ) : (
                  '建立旅行'
                )}
              </Button>
            </>
          )}
        </div>
      </form>
    </FormDialog>
  );
}
