import { Button } from '../components/ui/button.js';
import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { FormDialog } from './FormDialog.js';
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

function TripNavigation({
  section,
  tripId,
  mobile,
  trash,
  openTrips,
}: {
  section: NavigationSection;
  tripId?: string;
  mobile: boolean;
  trash: boolean;
  openTrips: () => void;
}) {
  return (
    <div className="trip-nav-group">
      {mobile ? (
        <Button
          variant="ghost"
          className={section === 'trips' ? 'active' : undefined}
          aria-current={section === 'trips' ? 'page' : undefined}
          aria-haspopup="dialog"
          onClick={(event) => {
            event.currentTarget.focus({ preventScroll: true });
            openTrips();
          }}
        >
          <Icon name="trips" />
          <span>我的旅行</span>
        </Button>
      ) : (
        <Link
          to="/trips"
          className={section === 'trips' && !trash ? 'active' : undefined}
          aria-current={section === 'trips' && !trash ? 'page' : undefined}
        >
          <Icon name="trips" />
          <span>我的旅行</span>
        </Link>
      )}
      {tripId || !mobile ? (
        <div className="trip-subnav">
          {tripId ? (
            <>
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
            </>
          ) : null}
          {!mobile ? (
            <Link
              to="/trips/trash"
              className={trash ? 'active' : undefined}
              aria-current={trash ? 'page' : undefined}
            >
              <Trash2 className="icon" size={19} strokeWidth={1.6} aria-hidden="true" />
              <span>垃圾桶</span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Navigation({ mobile = false }: { mobile?: boolean }) {
  const { account, signOut, closing } = useSession();
  const tripMatch = useMatch('/trips/:tripId/*');
  const matchedId = tripMatch?.params.tripId;
  const tripId = matchedId === 'trash' ? undefined : matchedId;
  const [tripsMenu, setTripsMenu] = useState(false);
  const { pathname } = useLocation();
  const section = navigationSection(pathname, tripId);
  const trip = useQuery({
    queryKey: ['account', account!.id, 'trip', tripId],
    queryFn: ({ signal }) => apiRequest<Trip>(`/api/trips/${tripId}`, { signal }),
    enabled: Boolean(tripId),
    retry: false,
  });

  return (
    <>
      <nav
        className={mobile ? 'bottom-nav' : undefined}
        aria-label={mobile ? '行動導覽' : '主要導覽'}
      >
        <TripNavigation
          section={section}
          tripId={trip.data ? tripId : undefined}
          mobile={mobile}
          trash={pathname === '/trips/trash'}
          openTrips={() => setTripsMenu(true)}
        />
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
      {mobile && tripsMenu ? (
        <FormDialog
          title="我的旅行"
          className={`mobile-trips-menu${trip.data ? ' has-current-trip' : ''}`}
          description={trip.data ? `目前：${trip.data.name}` : undefined}
          onClose={() => setTripsMenu(false)}
          showClose
        >
          <Link
            className={pathname === '/trips' ? 'sheet-item active' : 'sheet-item'}
            to="/trips"
            onClick={() => setTripsMenu(false)}
          >
            <Icon name="trips" />
            旅行清單
          </Link>
          <Link
            className={pathname === '/trips/trash' ? 'sheet-item active' : 'sheet-item'}
            to="/trips/trash"
            onClick={() => setTripsMenu(false)}
          >
            <Trash2 className="icon" aria-hidden="true" />
            垃圾桶
          </Link>
        </FormDialog>
      ) : null}
    </>
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
