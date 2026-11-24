import { tripText, useTripText } from './messages.js';
import React, { type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { QueryState } from '../../components/QueryState.js';
import { Icon } from '../../components/Icon.js';
import { useSession } from '../auth/session.js';
import { expenseDraftKey, type RetainedExpenseDraft } from '../expenses/expense-draft.js';
import type { TripState } from './management-api.js';

export function TripAccessState({
  authority,
  heading,
  tripId,
}: {
  authority: UseQueryResult<TripState>;
  heading: RefObject<HTMLHeadingElement | null>;
  tripId: string;
}) {
  useTripText();
  const { account } = useSession();
  const client = useQueryClient();
  const draft = client.getQueryData<RetainedExpenseDraft>(expenseDraftKey(account!.id, tripId));
  if (authority.isPending || authority.error)
    return (
      <>
        {authority.error ? (
          <Link className="back" to="/trips">
            <Icon name="back" />
            <span>{tripText('myTrips')}</span>
          </Link>
        ) : null}
        <QueryState
          label={tripText('tripDetails')}
          fetchStatus={authority.fetchStatus}
          pending={authority.isPending}
          error={authority.error}
          retry={() => {
            void authority.refetch();
          }}
        />
      </>
    );
  const state = authority.data.state;

  return (
    <section className="state">
      <h1 ref={heading} tabIndex={-1}>
        {state === 'trash' ? tripText('tripIsInTrash') : tripText('tripNotFound')}
      </h1>
      <p>
        {state === 'trash'
          ? tripText('restoreItFromTrashBeforeContinuingToRecord')
          : tripText('thisTripWasPermanentlyDeletedItsLedgerCan')}
      </p>
      <Link to={state === 'trash' ? '/trips/trash' : '/trips'}>
        {state === 'trash' ? tripText('goToTrashToRestore') : tripText('backToTripList')}
      </Link>
      {draft ? (
        <section aria-label={tripText('unsavedExpenseDraft')}>
          <h2>{tripText('unsavedExpenseDraft')}</h2>
          <p>{draft.item}</p>
          <p>
            {draft.amount} {draft.currencyCode}
          </p>
          <p>{draft.spentOn}</p>
        </section>
      ) : null}
    </section>
  );
}
