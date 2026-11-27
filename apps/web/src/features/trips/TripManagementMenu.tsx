import { tripText, useTripText } from './messages.js';
import React, { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, Image, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button.js';

const actions = [
  { action: 'dates', label: 'editTripDates', Icon: CalendarDays },
  { action: 'thumbnail', label: 'changeTripCover', Icon: Image },
  { action: 'trash', label: 'moveToTrash', Icon: Trash2 },
] as const;

export type TripManagementAction = (typeof actions)[number]['action'];

export function TripManagementMenu({
  tripName,
  onSelect,
}: {
  tripName: string;
  onSelect: (action: TripManagementAction) => void;
}) {
  useTripText();
  const [open, setOpen] = useState(false);
  const id = useId();
  const anchor = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const initialIndex = useRef(0);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const menu = popup.current!;
    const button = trigger.current!;

    function positionMenu() {
      const triggerBounds = button.getBoundingClientRect();
      const navigation = document.querySelector('.bottom-nav');
      const navigationTop = navigation?.getBoundingClientRect().top;
      const bottom = navigationTop
        ? Math.min(navigationTop, window.innerHeight)
        : window.innerHeight;
      const below = bottom - triggerBounds.bottom - 8;
      const above = triggerBounds.top - 8;
      const flip = below < menu.scrollHeight && above > below;
      menu.dataset.placement = flip ? 'above' : 'below';
      menu.style.maxHeight = `${Math.max(0, flip ? above : below)}px`;
    }

    positionMenu();
    items.current[initialIndex.current]?.focus({ preventScroll: true });
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
    window.addEventListener('scroll', positionMenu, { passive: true });
    window.addEventListener('resize', positionMenu);

    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('scroll', positionMenu);
      window.removeEventListener('resize', positionMenu);
    };
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
        size="icon"
        aria-label={tripText('editNamedTrip', { name: tripName })}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => {
          initialIndex.current = 0;
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            initialIndex.current = event.key === 'ArrowUp' ? actions.length - 1 : 0;
            setOpen(true);
          }
        }}
      >
        <Pencil aria-hidden="true" />
      </Button>
      {open ? (
        <div
          id={id}
          ref={popup}
          className="trip-management-menu"
          role="menu"
          aria-label={tripText('manageTrip')}
          onKeyDown={(event) => {
            const index = items.current.indexOf(document.activeElement as HTMLButtonElement);
            const next =
              event.key === 'ArrowDown'
                ? (index + 1) % actions.length
                : event.key === 'ArrowUp'
                  ? (index + actions.length - 1) % actions.length
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? actions.length - 1
                      : null;
            if (next !== null) {
              event.preventDefault();
              items.current[next]?.focus();
            }
            if (event.key === 'Tab') close();
          }}
        >
          {actions.map(({ action, label, Icon }, index) => (
            <button
              key={action}
              ref={(element) => {
                items.current[index] = element;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={action === 'trash' ? 'trip-management-danger' : undefined}
              onClick={() => {
                trigger.current?.focus();
                setOpen(false);
                onSelect(action);
              }}
            >
              <Icon size={19} aria-hidden="true" />
              {tripText(label)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
