import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { apiRequest, type Trip } from '../../api/index.js';
import { useSession } from '../auth/session.js';
import { QueryState } from '../../components/QueryState.js';
import { tripDates } from './Trips.js';
import { TripForm } from './TripForm.js';

export function TripLedger() {
  const { tripId } = useParams(), { account } = useSession();
  const [editing, setEditing] = useState(false);
  const trip = useQuery({ queryKey: ['account', account!.id, 'trip', tripId], queryFn: ({ signal }) => apiRequest<Trip>(`/api/trips/${tripId}`, { signal }) });
  if (trip.isPending || trip.error) return <><Link className="back" to="/trips">我的旅行</Link><QueryState pending={trip.isPending} error={trip.error} retry={() => { void trip.refetch(); }} /></>;
  return <>
    <Link className="back" to="/trips">我的旅行</Link>
    <header className="page-head"><div><div className="eyebrow">TRAVEL JOURNAL</div><h1>{trip.data.name}</h1><p className="muted"><span>{tripDates(trip.data)}</span><button className="text-btn" onClick={() => setEditing(true)}>旅行日期</button></p></div></header>
    {trip.data.expenseCount === 0 ? <div className="empty"><h2>旅程還有很多空白，真好。</h2><p>先記下一筆機票，或今天的一杯咖啡。</p><Link className="btn" to={`/trips/${trip.data.id}/expenses/new`}>記錄第一筆支出</Link></div> : <p className="muted">{trip.data.expenseCount} 筆支出</p>}
    {editing ? <TripForm trip={trip.data} onClose={() => setEditing(false)} /> : null}
  </>;
}
