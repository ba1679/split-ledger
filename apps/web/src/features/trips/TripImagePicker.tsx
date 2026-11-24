import { tripText, useTripText } from './messages.js';
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
  useTripText();
  const input = useRef<HTMLInputElement>(null);
  const preview = usePreviewUrl(file, !invalid);

  return (
    <section className="create-trip-image">
      <h3>{tripText('tripThumbnailOptional')}</h3>
      <div className="create-image-preview">
        {preview ? (
          <img src={preview} alt={tripText('previewOfUnsavedTripThumbnail')} />
        ) : (
          <div
            className="thumbnail-default"
            role="img"
            aria-label={tripText('defaultTripThumbnail')}
          >
            <Mountain size={48} aria-hidden="true" />
          </div>
        )}
        {file && !invalid ? (
          <span className="thumbnail-draft-badge">{tripText('notSavedYet')}</span>
        ) : null}
      </div>
      {file ? (
        <strong className="create-image-name">{file.name}</strong>
      ) : (
        <p className="create-image-default-label">{tripText('usingTheDefaultLandscape')}</p>
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
          {file ? tripText('chooseAnotherImage') : tripText('chooseAPhoto')}
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
              {tripText('removeSelectedPhoto')}
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
          ? tripText('thePhotoIsPreviewedLocallyAndSavedAfter')
          : tripText('youCanCreateATripWithoutAPhoto')}
      </p>
      <p className="create-image-limits">
        {tripText('stillJPGPNGOrWebPOneImageUp')}
        <br />
        {tripText('longestSide16384PixelsConvertHEICFirst')}
      </p>
    </section>
  );
}
