import { TrashTrips } from '../features/trips/TrashTrips.js';
import { Button } from '../components/ui/button.js';
import React from 'react';
import { Navigate, Route, Routes, Link, useLocation } from 'react-router-dom';
import { useSession } from '../features/auth/session.js';
import { Login } from '../features/auth/Login.js';
import { Trips } from '../features/trips/Trips.js';
import { TripLedger } from '../features/trips/TripLedger.js';
import { Categories } from '../features/categories/Categories.js';
import { ExpenseForm } from '../features/expenses/ExpenseForm.js';
import { AppShell } from '../components/AppShell.js';
import { QueryState } from '../components/QueryState.js';
import { TripSettlement } from '../features/settlement/TripSettlement.js';
import { SettleArrangement } from '../features/settlement/SettleArrangement.js';
import { TripMembers } from '../features/members/TripMembers.js';
import { IndependentRepayment } from '../features/repayments/IndependentRepayment.js';

function PrivatePage({ children }: { children: React.ReactNode }) {
  const session = useSession();

  if (!session.account) return <Navigate to="/" replace />;

  return <AppShell key={session.account.id}>{children}</AppShell>;
}

export function App() {
  const session = useSession();
  const location = useLocation();

  if (session.pending || session.closing)
    return (
      <main className="session-state">
        <QueryState pending />
      </main>
    );
  if (session.error && !session.account)
    return (
      <main className="session-state">
        <QueryState error={session.error} retry={session.retry} />
      </main>
    );

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/trips"
        element={
          <PrivatePage>
            <Trips />
          </PrivatePage>
        }
      />
      <Route
        path="/trips/trash"
        element={
          <PrivatePage>
            <TrashTrips />
          </PrivatePage>
        }
      />
      <Route
        path="/trips/:tripId"
        element={
          <PrivatePage>
            <TripLedger key={location.pathname} />
          </PrivatePage>
        }
      />
      <Route
        path="/trips/:tripId/expenses/new"
        element={
          <PrivatePage>
            <ExpenseForm />
          </PrivatePage>
        }
      />
      <Route
        path="/trips/:tripId/expenses/:expenseId"
        element={
          <PrivatePage>
            <ExpenseForm />
          </PrivatePage>
        }
      />
      <Route
        path="/trips/:tripId/members"
        element={
          <PrivatePage>
            <TripMembers />
          </PrivatePage>
        }
      />
      <Route
        path="/trips/:tripId/settlement"
        element={
          <PrivatePage>
            <TripSettlement />
          </PrivatePage>
        }
      />
      <Route
        path="/trips/:tripId/settlements/new"
        element={
          <PrivatePage>
            <SettleArrangement />
          </PrivatePage>
        }
      />
      <Route
        path="/trips/:tripId/repayments/new"
        element={
          <PrivatePage>
            <IndependentRepayment />
          </PrivatePage>
        }
      />
      <Route
        path="/categories"
        element={
          <PrivatePage>
            <Categories />
          </PrivatePage>
        }
      />
      <Route
        path="*"
        element={
          <PrivatePage>
            <div className="empty">
              <h1>找不到這個頁面</h1>
              <Button asChild variant="default">
                <Link to="/trips">返回我的旅行</Link>
              </Button>
            </div>
          </PrivatePage>
        }
      />
    </Routes>
  );
}
