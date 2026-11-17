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
  if (files.length !== 1) return '一次只能選擇一張圖片，請重新選圖。';
  if (selected!.size === 0) return '圖片檔案沒有內容，請重新選擇有效的 JPG、PNG 或 WebP。';
  if (selected!.size > 10 * 1024 * 1024) return '圖片容量超過 10 MiB，請縮小後重新選圖。';
  if (selected!.type && !['image/jpeg', 'image/png', 'image/webp'].includes(selected!.type))
    return '不支援這種圖片格式，請轉成單張靜態 JPG、PNG 或 WebP 後重新選圖。';

  return null;
}

function rejectionMessage(failure: ApiError): string {
  if (failure.code === 'THUMBNAIL_UPDATED') return '其他裝置已更新圖片，請確認目前圖片後再保存。';
  if (failure.code === 'TRIP_STATE_CHANGED') return '旅行狀態已更新，請確認目前狀態後再保存。';
  if (failure.code === 'UNSUPPORTED_IMAGE_TYPE')
    return '格式或動畫內容不支援，請轉成單張靜態 JPG、PNG 或 WebP 後重新選圖。';
  if (failure.code === 'INVALID_IMAGE')
    return '圖片內容損壞或尺寸無效，請重新選擇有效的 JPG、PNG 或 WebP。';
  if (failure.code === 'IMAGE_TOO_LARGE')
    return '圖片超過上限（10 MiB、總像素 2,500 萬、最長邊 16,384 像素），請縮小後重新選圖。';

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
          ? `原次圖片保存已確認成功。目前旅行${current.state === 'trash' ? '已在垃圾桶，可前往復原' : '已永久刪除'}。`
          : `原次圖片保存已確認成功。目前縮圖${current.hasThumbnail ? '已保存，以目前圖片為準' : '使用預設圖'}。`
        : '圖片已保存，原次操作已確認。',
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
        setError(`圖片未保存：${rejectionMessage(failure)}`);
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
      <p>圖片保存結果尚未確認，請查證原次操作。關閉不會撤回已送出的保存。</p>
      <TripOperationCheck
        busy={busy}
        onCheck={() => verify(attempt)}
        busyLabel="正在查證圖片保存"
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
      title="自訂旅行縮圖"
      description={
        unknown ? (
          `「${trip.name}」圖片保存結果尚未確認，請查證原次保存。`
        ) : (
          <>
            <span className="desktop-thumbnail-description">
              {draft?.kind === 'default'
                ? `為「${trip.name}」已在本機選用預設風景，按「保存圖片」才會套用。`
                : `為「${trip.name}」選一張照片，讓旅程更容易辨識。`}
            </span>
            <span className="mobile-thumbnail-description">
              {draft?.kind === 'default'
                ? `「${trip.name}」已選預設風景；保存後才套用。`
                : `為「${trip.name}」選一張照片。`}
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
            aria-label="旅行目前無法編輯縮圖"
          >
            旅行目前無法編輯縮圖
          </div>
        ) : source && !failedDraftPreview ? (
          <img
            key={source}
            className="thumbnail-preview"
            src={source}
            alt={`${trip.name}旅行縮圖預覽`}
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
            aria-label="無法預覽這張照片，請重新選圖。"
          >
            無法預覽這張照片，請重新選圖。
          </div>
        ) : (busy || unknown) && trip.hasThumbnail ? (
          <div
            className="thumbnail-confirmed-placeholder"
            role="img"
            aria-label="最後確認的圖片預覽暫不可用"
          >
            最後確認的圖片預覽暫不可用
          </div>
        ) : (
          <div className="thumbnail-default" role="img" aria-label="預設旅行縮圖">
            <Mountain size={48} aria-hidden="true" />
          </div>
        )}
        {draft ? (
          <span className="thumbnail-draft-badge">
            {unknown ? '結果尚未確認' : busy ? '最後確認的縮圖' : '尚未保存'}
          </span>
        ) : null}
      </div>
      <div className="thumbnail-selection">
        <strong className="thumbnail-filename">
          {file ? file.name : draft?.kind === 'default' ? '預設旅行縮圖' : '目前旅行縮圖'}
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
            重新選圖
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
            使用預設圖
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
        <p>支援單張靜態 JPG（.jpg、.jpeg）、PNG、WebP，最大 10 MiB。</p>
        <p>最長邊 16,384 像素、總像素 2,500 萬以內。</p>
        <p>
          <span className="desktop-thumbnail-description">
            手機 HEIC 照片請先轉成 JPG、PNG 或 WebP。
          </span>
          <span className="mobile-thumbnail-description">HEIC 請先轉成 JPG、PNG 或 WebP。</span>
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
          label="重新讀取目前狀態"
          busyLabel="正在重新讀取目前狀態"
        />
      ) : null}
      {unavailable ? (
        <p className="error">
          {availability === 'trash'
            ? '旅行已在垃圾桶。照片草稿保留，復原後可重新讀取狀態再保存。'
            : '旅行已永久刪除，這張照片無法再保存到原旅行。'}
          <Link to={availability === 'trash' ? '/trips/trash' : '/trips'}>
            {availability === 'trash' ? '前往垃圾桶復原' : '返回旅行清單'}
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
          取消
        </Button>
        <ActionButton
          label="保存圖片"
          busy={busy && !refreshing}
          busyLabel="正在保存圖片"
          disabled={!draft || busy || unknown || conflict || unavailable}
          onClick={() => {
            void save();
          }}
        />
      </div>
    </FormDialog>
  );
}
