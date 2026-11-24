import '../i18n/shared-messages.js';
import { useTranslation } from 'react-i18next';
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
import { BusyIndicator } from '../components/waiting/BusyIndicator.js';
import { QueryState } from '../components/QueryState.js';
import { TripSettlement } from '../features/settlement/TripSettlement.js';
import { SettleArrangement } from '../features/settlement/SettleArrangement.js';
import { TripMembers } from '../features/members/TripMembers.js';
import { IndependentRepayment } from '../features/repayments/IndependentRepayment.js';

const TripExpenseAnalysis = React.lazy(() =>
  import('../features/expenses/analysis/TripExpenseAnalysis.js').then((module) => ({
    default: module.TripExpenseAnalysis,
  })),
);

function PrivatePage({ children }: { children: React.ReactNode }) {
  const session = useSession();

  if (!session.account) return <Navigate to="/" replace />;

  return <AppShell key={session.account.id}>{children}</AppShell>;
}

export function App() {
  const { t } = useTranslation();
  const session = useSession();
  const location = useLocation();

  if (session.pending || session.closing)
    return (
      <main className="session-state">
        <BusyIndicator
          accessibleLabel={session.closing ? t('app.signingOut') : t('app.checkingSession')}
        />
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
        path="/trips/:tripId/analysis"
        element={
          <PrivatePage>
            <React.Suspense
              fallback={
                <QueryState pending fetchStatus="fetching" label={t('common.spendingAnalysis')} />
              }
            >
              <TripExpenseAnalysis key={location.key} />
            </React.Suspense>
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
              <h1>{t('common.pageMissing')}</h1>
              <Button asChild variant="default">
                <Link to="/trips">{t('common.backToTrips')}</Link>
              </Button>
            </div>
          </PrivatePage>
        }
      />
    </Routes>
  );
}
