import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LoaderCircle, Mountain } from 'lucide-react';
import type { Trip } from '../../api/index.js';
import { Button } from '../../components/ui/button.js';

export function CreatedTripResult({
  trip,
  error,
  busy,
  unknown,
  currentImageAvailable,
  onRetry,
  onVerify,
}: {
  trip: Trip;
  error: string | null;
  busy: boolean;
  unknown: boolean;
  currentImageAvailable: boolean;
  onRetry: () => void;
  onVerify: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="created-trip-result">
      <div className="mobile-trip-brand">t. 旅帳</div>
      <header>
        <div className="eyebrow">MY JOURNEYS</div>
        <h1 ref={heading} tabIndex={-1}>
          旅行已建立
        </h1>
        <p>{trip.name}已可以開始記帳。</p>
      </header>
      <section className="created-image-feedback" role={unknown ? 'status' : 'alert'}>
        <div>
          <h2>{unknown ? '旅行已建立，圖片結果尚未確認' : '旅行已建立，但圖片未保存'}</h2>
          <p>
            {unknown ? (
              '請查證原次圖片操作；等候確認時不重新送出，也不重新建立旅行。'
            ) : !currentImageAvailable ? (
              '行程和帳務已保留，目前圖片暫時無法讀取。可重新上傳縮圖，不必再建立一次。'
            ) : trip.hasThumbnail ? (
              '行程和帳務與目前圖片已保留，本次圖片未保存。可重新上傳縮圖，不必再建立一次。'
            ) : (
              <>
                行程與帳務保留，現在顯示預設風景。可重新上傳。
                <span className="desktop-created-detail">不必再建立一次。</span>
              </>
            )}
          </p>
          {error ? <p>{error}</p> : null}
        </div>
        <Button
          aria-disabled={busy}
          aria-busy={busy}
          aria-label={busy ? (unknown ? '正在查證圖片保存' : '正在重新上傳圖片') : undefined}
          onClick={() => {
            if (!busy) (unknown ? onVerify : onRetry)();
          }}
        >
          {busy ? (
            <LoaderCircle size={20} className="action-spinner" aria-hidden="true" />
          ) : unknown ? (
            '再次查證'
          ) : (
            '重新上傳'
          )}
        </Button>
      </section>
      <h2 className="created-trip-section-title">已建立的旅行</h2>
      <Link className="trip-card create-result-card" to={`/trips/${trip.id}`}>
        {unknown || !currentImageAvailable ? (
          <div
            className="created-trip-image created-image-unknown"
            role="img"
            aria-label={unknown ? '圖片保存結果尚未確認' : '目前圖片暫時無法讀取'}
          >
            {unknown ? '圖片結果尚未確認' : '目前圖片暫時無法讀取'}
          </div>
        ) : trip.hasThumbnail ? (
          <div className="created-trip-image">
            <img
              src={`/api/trips/${trip.id}/thumbnail/${trip.thumbnailRevision}`}
              alt={`${trip.name}旅行縮圖`}
            />
          </div>
        ) : (
          <div
            className="created-trip-image thumbnail-default"
            role="img"
            aria-label="預設旅行縮圖"
          >
            <Mountain size={48} aria-hidden="true" />
          </div>
        )}
        <div className="card-content">
          <h2>{trip.name}</h2>
          <p className="card-date">
            {trip.startDate || trip.endDate
              ? `${trip.startDate ?? '開始日未定'} — ${trip.endDate ?? '結束日未定'}`
              : '旅行日期未定'}
          </p>
          <div className="card-bottom">
            <span>{trip.expenseCount} 筆支出</span>
            <span>
              開啟旅行帳本 <ArrowRight size={14} aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
