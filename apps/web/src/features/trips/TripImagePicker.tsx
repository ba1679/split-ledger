import React, { useRef } from 'react';
import { Mountain } from 'lucide-react';
import { Button } from '../../components/ui/button.js';
import { usePreviewUrl } from './use-preview-url.js';

export function TripImagePicker({
  file,
  onChange,
  disabled = false,
  invalid = false,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const preview = usePreviewUrl(file, !invalid);

  return (
    <section className="create-trip-image">
      <h3>旅行縮圖（選填）</h3>
      <div className="create-image-preview">
        {preview ? (
          <img src={preview} alt="尚未保存的旅行縮圖預覽" />
        ) : (
          <div className="thumbnail-default" role="img" aria-label="預設旅行縮圖">
            <Mountain size={48} aria-hidden="true" />
          </div>
        )}
        {file && !invalid ? <span className="thumbnail-draft-badge">尚未保存</span> : null}
      </div>
      {file ? (
        <strong className="create-image-name">{file.name}</strong>
      ) : (
        <p className="create-image-default-label">目前使用預設風景</p>
      )}
      <div className={`create-image-tools${file ? ' has-photo' : ''}`}>
        <Button
          type="button"
          variant={file ? 'ghost' : 'outline'}
          disabled={disabled}
          onClick={() => {
            if (input.current) {
              input.current.value = '';
              input.current.click();
            }
          }}
        >
          {file ? '重新選圖' : '選擇照片'}
        </Button>
        {file ? (
          <>
            <span aria-hidden="true">・</span>
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={() => {
                if (input.current) input.current.value = '';
                onChange(null);
              }}
            >
              移除選圖
            </Button>
          </>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => {
          const selected = event.currentTarget.files?.[0];
          if (selected && !disabled) onChange(selected);
        }}
      />
      <p className="create-image-hint">
        {file
          ? '照片先在本機預覽；建立旅行後才保存。'
          : '不選照片也可以建立旅行，之後仍能自訂縮圖。'}
      </p>
      <p className="create-image-limits">
        靜態 JPG、PNG、WebP；單張最大 10 MiB，2,500 萬像素內。
        <br />
        最長邊 16,384 像素；HEIC 請先轉檔。
      </p>
    </section>
  );
}
