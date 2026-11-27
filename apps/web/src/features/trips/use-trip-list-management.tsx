import React, { useState, type RefObject } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiRequest, type Trip } from '../../api/index.js';
import { useSession } from '../auth/session.js';
import { TripCommandDialog, ThumbnailEntryDialog } from './TripCommandDialog.js';
import { TripForm } from './TripForm.js';
import { lifecycleOutcomeMessageKey, type TripState } from './management-api.js';
import type { TripManagementAction } from './TripManagementMenu.js';

export function useTripListManagement(
  trips: Trip[] | undefined,
  heading: RefObject<HTMLHeadingElement | null>,
) {
  const { account } = useSession();
  const navigate = useNavigate();
  const [active, setActive] = useState<string>();
  const [dateTrip, setDateTrip] = useState<Trip>();
  const [messageKey, setMessageKey] = useState<string>();
  const [operations, setOperations] = useState<
    Record<string, { action: 'trash' | 'thumbnail'; trip: Trip }>
  >({});
  const thumbnailId =
    active && operations[active]?.action === 'thumbnail' ? operations[active].trip.id : undefined;
  const authority = useQuery({
    queryKey: ['account', account!.id, 'trip', thumbnailId, 'card-state'],
    queryFn: ({ signal }) => apiRequest<TripState>(`/api/trips/${thumbnailId}/state`, { signal }),
    enabled: Boolean(thumbnailId),
    retry: false,
  });

  function closeOperation(key: string) {
    setActive((current) => (current === key ? undefined : current));
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) heading.current?.focus({ preventScroll: true });
    });
  }

  function select(action: TripManagementAction, trip: Trip) {
    if (action === 'dates') {
      setMessageKey(undefined);
      setDateTrip(trip);

      return;
    }
    const key = `${action}:${trip.id}`;
    setOperations((current) => ({ ...current, [key]: { action, trip } }));
    setActive(key);
  }

  const dialogs = (
    <>
      {dateTrip ? (
        <TripForm trip={dateTrip} onClose={() => setDateTrip(undefined)} onEdited={setMessageKey} />
      ) : null}
      {Object.entries(operations).map(([key, { action, trip }]) => {
        const close = () => closeOperation(key);
        if (action === 'thumbnail') {
          return (
            <ThumbnailEntryDialog
              key={key}
              trip={trips?.find((item) => item.id === trip.id) ?? trip}
              open={active === key}
              availability={thumbnailId === trip.id ? authority.data?.state : undefined}
              onClose={close}
            />
          );
        }

        return (
          <TripCommandDialog
            key={key}
            trip={trip}
            operation="trash"
            open={active === key}
            onClose={close}
            onComplete={(result, verified) => {
              setOperations((current) => {
                const remaining = { ...current };
                delete remaining[key];

                return remaining;
              });
              setMessageKey(undefined);
              close();
              navigate('/trips', {
                replace: true,
                state: {
                  messageKey: verified
                    ? 'trips.' + lifecycleOutcomeMessageKey(result)
                    : 'trips.tripMovedToTrashYouCanRestoreIt',
                },
              });
            }}
          />
        );
      })}
    </>
  );

  return { dialogs, select, messageKey };
}
