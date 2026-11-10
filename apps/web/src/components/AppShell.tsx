import { Button } from '../components/ui/button.js';
import React from 'react';
import { Link, NavLink, useLocation, useMatch } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../features/auth/session.js';
import { apiRequest, type Trip } from '../api/index.js';
import { Icon } from './Icon.js';

type NavigationSection = 'trips' | 'members' | 'settlement' | null;

function navigationSection(pathname: string, tripId?: string): NavigationSection {
  if (tripId && pathname === `/trips/${tripId}/members`) return 'members';
  if (
    tripId &&
    (pathname.startsWith(`/trips/${tripId}/settlement`) ||
      pathname.startsWith(`/trips/${tripId}/repayments/`))
  )
    return 'settlement';

  return pathname.startsWith('/trips') ? 'trips' : null;
}

function TripNavigation({ section, tripId }: { section: NavigationSection; tripId?: string }) {
  return (
    <div className="trip-nav-group">
      <Link
        to="/trips"
        className={section === 'trips' ? 'active' : undefined}
        aria-current={section === 'trips' ? 'page' : undefined}
      >
        <Icon name="trips" />
        <span>我的旅行</span>
      </Link>
      {tripId ? (
        <div className="trip-subnav">
          <Link
            to={`/trips/${tripId}/members`}
            className={section === 'members' ? 'active' : undefined}
            aria-current={section === 'members' ? 'page' : undefined}
          >
            <Icon name="members" />
            <span>同行者</span>
          </Link>
          <Link
            to={`/trips/${tripId}/settlement`}
            className={section === 'settlement' ? 'active' : undefined}
            aria-current={section === 'settlement' ? 'location' : undefined}
          >
            <Icon name="settlement" />
            <span>分帳結算</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function Navigation({ mobile = false }: { mobile?: boolean }) {
  const { account, signOut, closing } = useSession();
  const tripMatch = useMatch('/trips/:tripId/*');
  const tripId = tripMatch?.params.tripId;
  const { pathname } = useLocation();
  const section = navigationSection(pathname, tripId);
  const trip = useQuery({
    queryKey: ['account', account!.id, 'trip', tripId],
    queryFn: ({ signal }) => apiRequest<Trip>(`/api/trips/${tripId}`, { signal }),
    enabled: Boolean(tripId),
    retry: false,
  });

  return (
    <nav
      className={mobile ? 'bottom-nav' : undefined}
      aria-label={mobile ? '行動導覽' : '主要導覽'}
    >
      <TripNavigation section={section} tripId={trip.data ? tripId : undefined} />
      <NavLink to="/categories">
        <Icon name="list" />
        <span>支出分類</span>
      </NavLink>
      {mobile ? (
        <Button
          variant="ghost"
          className="text-btn"
          disabled={closing}
          onClick={() => {
            void signOut();
          }}
        >
          <Icon name="back" />
          <span>登出</span>
        </Button>
      ) : null}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { account, signOut, error, closing } = useSession();

  return (
    <>
      <aside className="sidebar">
        <Link to="/trips" className="brand">
          <span className="brand-mark" aria-hidden="true">
            t.
          </span>
          旅帳
        </Link>
        <Navigation />
        <footer>
          <div className="eyebrow">
            A LITTLE RECORD
            <br />
            OF EVERY JOURNEY.
          </div>
          <p>{account?.name} 的旅行帳本</p>
          <Button
            variant="ghost"
            className="text-btn"
            disabled={closing}
            onClick={() => {
              void signOut();
            }}
          >
            <Icon name="back" />
            <span>登出</span>
          </Button>
        </footer>
      </aside>
      <main className="main">
        {error ? (
          <p className="error" role="alert">
            {error.message}
          </p>
        ) : null}
        {children}
      </main>
      <Navigation mobile />
    </>
  );
}
