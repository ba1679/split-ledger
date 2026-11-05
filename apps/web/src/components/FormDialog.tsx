import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export function FormDialog({ title, children, onClose, busy = false }: { title: string; children: React.ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const outside = useRef(false);
  useEffect(() => {
    const dialog = ref.current!, opener = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => { dialog.close(); if (opener?.isConnected) opener.focus(); };
  }, []);
  function isOutside(event: React.PointerEvent | React.MouseEvent) {
    const box = ref.current!.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  }
  return createPortal(<dialog ref={ref} className="form-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onPointerDown={event => { outside.current = isOutside(event); }}
    onClick={event => { if (outside.current && isOutside(event) && !busy) onClose(); }}>
    <h2 id={titleId}>{title}</h2>{children}
  </dialog>, document.body);
}
