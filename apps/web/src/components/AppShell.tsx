import '../i18n/shared-messages.js';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button.js';
import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { FormDialog } from './FormDialog.js';
import { Link, NavLink, useLocation, useMatch } from 'react-router-dom';
import { useSession } from '../features/auth/session.js';
import { Icon } from './Icon.js';
import { LanguageMenu, MobileLanguageBar } from './LanguageMenu.js';
import { useAvailableTrip } from '../features/trips/use-available-trip.js';

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
  const { t } = useTranslation();

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
          <span>{t('common.myTrips')}</span>
        </Button>
      ) : (
        <Link
          to="/trips"
          className={section === 'trips' && !trash ? 'active' : undefined}
          aria-current={section === 'trips' && !trash ? 'page' : undefined}
        >
          <Icon name="trips" />
          <span>{t('common.myTrips')}</span>
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
                <span>{t('common.members')}</span>
              </Link>
              <Link
                to={`/trips/${tripId}/settlement`}
                className={section === 'settlement' ? 'active' : undefined}
                aria-current={section === 'settlement' ? 'location' : undefined}
              >
                <Icon name="settlement" />
                <span>{t('ledger.settlement')}</span>
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
              <span>{t('common.trash')}</span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Navigation({ mobile = false }: { mobile?: boolean }) {
  const { t } = useTranslation();
  const { signOut, closing } = useSession();
  const tripMatch = useMatch('/trips/:tripId/*');
  const matchedId = tripMatch?.params.tripId;
  const tripId = matchedId === 'trash' ? undefined : matchedId;
  const [tripsMenu, setTripsMenu] = useState(false);
  const { pathname } = useLocation();
  const section = navigationSection(pathname, tripId);
  const availableTrip = useAvailableTrip(tripId);

  return (
    <>
      <nav
        className={mobile ? 'bottom-nav' : undefined}
        aria-label={t(mobile ? 'common.mobileNavigation' : 'common.navigation')}
      >
        <TripNavigation
          section={section}
          tripId={availableTrip ? tripId : undefined}
          mobile={mobile}
          trash={pathname === '/trips/trash'}
          openTrips={() => setTripsMenu(true)}
        />
        <NavLink to="/categories">
          <Icon name="list" />
          <span>{t('common.categories')}</span>
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
            <span>{t('common.signOut')}</span>
          </Button>
        ) : null}
      </nav>
      {mobile && tripsMenu ? (
        <FormDialog
          title={t('common.myTrips')}
          className={`mobile-trips-menu${availableTrip ? ' has-current-trip' : ''}`}
          description={
            availableTrip ? t('common.currentTrip', { name: availableTrip.name }) : undefined
          }
          onClose={() => setTripsMenu(false)}
          showClose
        >
          <Link
            tabIndex={0}
            className={pathname === '/trips' ? 'sheet-item active' : 'sheet-item'}
            to="/trips"
            onClick={() => setTripsMenu(false)}
          >
            <Icon name="trips" />
            {t('common.tripList')}
          </Link>
          <Link
            tabIndex={0}
            className={pathname === '/trips/trash' ? 'sheet-item active' : 'sheet-item'}
            to="/trips/trash"
            onClick={() => setTripsMenu(false)}
          >
            <Trash2 className="icon" aria-hidden="true" />
            {t('common.trash')}
          </Link>
        </FormDialog>
      ) : null}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { account, signOut, error, closing } = useSession();

  return (
    <>
      <aside className="sidebar">
        <Link to="/trips" className="brand">
          <span className="brand-mark" aria-hidden="true">
            t.
          </span>
          {t('app.title')}
        </Link>
        <Navigation />
        <footer>
          <div className="eyebrow">
            {t('common.sidebarFirst')}
            <br />
            {t('common.sidebarSecond')}
          </div>
          <p>{t('common.accountLedger', { name: account?.name })}</p>
          <LanguageMenu className="sidebar-language-menu" />
          <Button
            variant="ghost"
            className="text-btn"
            disabled={closing}
            onClick={() => {
              void signOut();
            }}
          >
            <Icon name="back" />
            <span>{t('common.signOut')}</span>
          </Button>
        </footer>
      </aside>
      <main className="main">
        <MobileLanguageBar />
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
