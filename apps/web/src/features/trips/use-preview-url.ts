import { useEffect, useState } from 'react';

export function usePreviewUrl(value: Blob | null | undefined, open: boolean) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value || !open) {
      setUrl(null);

      return;
    }
    const objectUrl = URL.createObjectURL(value);
    setUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [value, open]);

  return url;
}
