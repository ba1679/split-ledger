import React, { useRef } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '../../components/ui/button.js';

export function TripOperationCheck({
  busy,
  onCheck,
  label = '再次查證',
  busyLabel = '正在查證原次操作',
}: {
  busy: boolean;
  onCheck: () => Promise<void>;
  label?: string;
  busyLabel?: string;
}) {
  const locked = useRef(false);

  async function check() {
    if (busy || locked.current) return;
    locked.current = true;
    try {
      await onCheck();
    } finally {
      locked.current = false;
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="trip-operation-check"
      aria-disabled={busy}
      aria-busy={busy}
      aria-label={busy ? `${label}，${busyLabel}` : undefined}
      onClick={() => {
        void check();
      }}
    >
      <span aria-hidden={busy} style={{ visibility: busy ? 'hidden' : 'visible' }}>
        {label}
      </span>
      {busy ? <LoaderCircle size={20} className="action-spinner" aria-hidden="true" /> : null}
    </Button>
  );
}
