import React, { useState } from 'react';
import { LoaderCircle } from 'lucide-react';

export function TripThumbnail({ src, children }: { src: string; children?: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed)
    return (
      <>
        {children ?? (
          <span className="word" aria-hidden="true">
            JOURNEY
          </span>
        )}
        <span className="trip-thumbnail-fallback">圖片載入失敗・已顯示預設圖</span>
      </>
    );

  return (
    <>
      <img
        className="trip-thumbnail"
        src={src}
        alt=""
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
      {!loaded ? (
        <span className="trip-thumbnail-status" role="status" aria-label="正在讀取旅行縮圖">
          <LoaderCircle size={24} className="action-spinner" aria-hidden="true" />
        </span>
      ) : null}
    </>
  );
}
