import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Image, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button.js';

export function TripManagementMenu({
  onSelect,
}: {
  onSelect: (action: 'thumbnail' | 'trash') => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const anchor = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    items.current[0]?.focus();
    const outside = (event: PointerEvent) => {
      if (anchor.current?.contains(event.target as Node)) return;

      const focusTarget =
        event.target instanceof Element
          ? event.target.closest(
              'a[href],button,input,select,textarea,[tabindex],[contenteditable="true"]',
            )
          : null;

      // A blank-surface pointer press would otherwise blur the restored trigger
      // after this listener runs. Preserve native focus for deliberate field/link clicks.
      if (!focusTarget) event.preventDefault();
      close();
    };
    document.addEventListener('pointerdown', outside);

    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  return (
    <div
      className="trip-management"
      ref={anchor}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          close();
        }
      }}
    >
      <Button
        ref={trigger}
        variant="outline"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        管理旅行 <ChevronDown size={16} aria-hidden="true" />
      </Button>
      {open ? (
        <div
          id={id}
          className="trip-management-menu"
          role="menu"
          aria-label="管理旅行"
          onKeyDown={(event) => {
            const index = items.current.indexOf(document.activeElement as HTMLButtonElement);
            const next =
              event.key === 'ArrowDown'
                ? (index + 1) % 2
                : event.key === 'ArrowUp'
                  ? (index + 1) % 2
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? 1
                      : null;
            if (next !== null) {
              event.preventDefault();
              items.current[next]?.focus();
            }
            if (event.key === 'Tab') setOpen(false);
          }}
        >
          {(
            [
              { action: 'thumbnail', text: '自訂旅行縮圖', Icon: Image },
              { action: 'trash', text: '移至垃圾桶', Icon: Trash2 },
            ] as const
          ).map(({ action, text, Icon }, index) => (
            <button
              key={action}
              ref={(element) => {
                items.current[index] = element;
              }}
              type="button"
              role="menuitem"
              onClick={() => {
                trigger.current?.focus();
                setOpen(false);
                onSelect(action);
              }}
            >
              <Icon size={19} aria-hidden="true" />
              {text}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
