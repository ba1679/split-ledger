import React from 'react';
import { Navigate, Route, Routes, Link } from 'react-router-dom';
import { useSession } from '../features/auth/session.js';
import { Login } from '../features/auth/Login.js';
import { Trips } from '../features/trips/Trips.js';
import { TripLedger } from '../features/trips/TripLedger.js';
import { Categories } from '../features/categories/Categories.js';
import { AppShell } from '../components/AppShell.js';
import { QueryState } from '../components/QueryState.js';

function PrivatePage({ children }: { children: React.ReactNode }) {
  const session = useSession();
  if (!session.account) return <Navigate to="/" replace />;
  return <AppShell key={session.account.id}>{children}</AppShell>;
}

export function App() {
  const session = useSession();
  if (session.pending || session.closing) return <main className="session-state"><QueryState pending /></main>;
  if (session.error && !session.account) return <main className="session-state"><QueryState error={session.error} retry={session.retry} /></main>;
  return <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/trips" element={<PrivatePage><Trips /></PrivatePage>} />
    <Route path="/trips/:tripId" element={<PrivatePage><TripLedger /></PrivatePage>} />
    <Route path="/categories" element={<PrivatePage><Categories /></PrivatePage>} />
    <Route path="*" element={<PrivatePage><div className="empty"><h1>找不到這個頁面</h1><Link className="btn" to="/trips">返回我的旅行</Link></div></PrivatePage>} />
  </Routes>;
}
