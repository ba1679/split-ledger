import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './ui/button.js';

export function FormDialog({
  title,
  children,
  onClose,
  busy = false,
  description,
  className = '',
  showClose = false,
  initialFocus,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
  description?: React.ReactNode;
  className?: string;
  showClose?: boolean;
  initialFocus?: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const outside = useRef(false);

  useEffect(() => {
    const dialog = ref.current!,
      opener = document.activeElement as HTMLElement | null;

    dialog.showModal();
    initialFocus?.current?.focus({ preventScroll: true });
    dialog.scrollTop = 0;

    return () => {
      dialog.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  function isOutside(event: React.PointerEvent | React.MouseEvent) {
    const box = ref.current!.getBoundingClientRect();

    return (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    );
  }

  return createPortal(
    <dialog
      ref={ref}
      className={`form-dialog ${className}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onPointerDown={(event) => {
        outside.current = isOutside(event);
      }}
      onClick={(event) => {
        if (outside.current && isOutside(event) && !busy) onClose();
      }}
    >
      {showClose ? (
        <Button
          variant="ghost"
          size="icon"
          className="dialog-close"
          aria-label="關閉"
          disabled={busy}
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </Button>
      ) : null}
      <h2 id={titleId}>{title}</h2>
      {description ? (
        <div id={descriptionId} className="dialog-description">
          {description}
        </div>
      ) : null}
      {children}
    </dialog>,
    document.body,
  );
}
