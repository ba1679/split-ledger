import { useEffect, useState } from 'react';

export function usePreviewUrl(value: Blob | null | undefined, open: boolean) {
  const [preview, setPreview] = useState<{ value: Blob; url: string } | null>(null);

  useEffect(() => {
    if (!value || !open) {
      setPreview(null);

      return;
    }
    const objectUrl = URL.createObjectURL(value);
    setPreview({ value, url: objectUrl });

    return () => URL.revokeObjectURL(objectUrl);
  }, [value, open]);

  return open && preview && preview.value === value ? preview.url : null;
}
