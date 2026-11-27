import '../i18n/shared-messages.js';
import '../features/trips/messages.js';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button.js';
import React, { useState } from 'react';
import { ChevronRight, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { FormDialog } from './FormDialog.js';
import { Link, NavLink, useLocation, useMatch } from 'react-router-dom';
import { useSession } from '../features/auth/session.js';
import { Icon } from './Icon.js';
import { LanguageMenu } from './LanguageMenu.js';
import { useAvailableTrip } from '../features/trips/use-available-trip.js';
import { cn } from '../lib/utils.js';

type NavigationSection = 'trips' | 'overview' | 'members' | 'settlement' | null;

function navigationSection(pathname: string, tripId?: string): NavigationSection {
  if (tripId && pathname.replace(/\/$/, '') === `/trips/${tripId}`) return 'overview';
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
  home,
}: {
  section: NavigationSection;
  tripId?: string;
  mobile: boolean;
  home: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="trip-nav-group">
      <Link
        to="/trips"
        className={cn({ active: home || (mobile && section === 'overview') })}
        aria-current={home ? 'page' : undefined}
      >
        <Icon name="trips" />
        <span>{t('common.myTrips')}</span>
      </Link>
      {tripId ? (
        <div className="trip-subnav">
          {!mobile ? (
            <NavLink end to={`/trips/${tripId}`}>
              <LayoutDashboard className="icon" size={19} aria-hidden="true" />
              <span>{t('trips.overview')}</span>
            </NavLink>
          ) : null}
          <Link
            to={`/trips/${tripId}/members`}
            className={cn({ active: section === 'members' })}
            aria-current={section === 'members' ? 'page' : undefined}
          >
            <Icon name="members" />
            <span>{t('common.members')}</span>
          </Link>
          <Link
            to={`/trips/${tripId}/settlement`}
            className={cn({ active: section === 'settlement' })}
            aria-current={section === 'settlement' ? 'location' : undefined}
          >
            <Icon name="settlement" />
            <span>{t('ledger.settlement')}</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function GlobalSettings({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { signOut, closing, error } = useSession();

  return (
    <FormDialog
      title={t('common.globalSettings')}
      className="global-settings-dialog"
      onClose={onClose}
      showClose
    >
      <Link className="sheet-item" to="/categories" onClick={onClose}>
        <Icon name="list" />
        <span>{t('common.categories')}</span>
        <ChevronRight className="settings-arrow" aria-hidden="true" />
      </Link>
      <LanguageMenu className="settings-language-menu" inline />
      <Button
        variant="ghost"
        className="sheet-item sheet-sign-out"
        disabled={closing}
        aria-busy={closing}
        onClick={() => {
          void signOut();
        }}
      >
        <LogOut className="icon" size={19} aria-hidden="true" />
        <span>{t('common.signOut')}</span>
      </Button>
      {error ? (
        <p className="error" role="alert">
          {error.message}
        </p>
      ) : null}
    </FormDialog>
  );
}

function Navigation({
  mobile = false,
  home,
  openSettings,
}: {
  mobile?: boolean;
  home: boolean;
  openSettings: () => void;
}) {
  const { t } = useTranslation();
  const tripMatch = useMatch('/trips/:tripId/*');
  const matchedId = tripMatch?.params.tripId;
  const tripId = matchedId === 'trash' ? undefined : matchedId;
  const { pathname } = useLocation();
  const section = navigationSection(pathname, tripId);
  const availableTrip = useAvailableTrip(tripId);
  const floatingEntry = mobile && section === 'overview' && availableTrip;

  return (
    <>
      <nav
        className={cn({ 'bottom-nav': mobile, 'ledger-bottom-nav': floatingEntry })}
        aria-label={t(mobile ? 'common.mobileNavigation' : 'common.navigation')}
      >
        <TripNavigation
          section={section}
          tripId={availableTrip ? tripId : undefined}
          mobile={mobile}
          home={home}
        />
        {mobile && home ? <SettingsButton onClick={openSettings} mobile /> : null}
      </nav>
      {floatingEntry ? (
        <Button asChild size="icon" className="ledger-mobile-add">
          <Link to={`/trips/${floatingEntry.id}/expenses/new`} aria-label={t('ledger.addExpense')}>
            <Icon name="plus" />
          </Link>
        </Button>
      ) : null}
    </>
  );
}

function SettingsButton({ onClick, mobile = false }: { onClick: () => void; mobile?: boolean }) {
  const { t } = useTranslation();

  return (
    <Button
      variant="ghost"
      className="global-settings-trigger"
      aria-haspopup="dialog"
      aria-label={t('common.globalSettings')}
      onClick={(event) => {
        event.currentTarget.focus({ preventScroll: true });
        onClick();
      }}
    >
      <Settings className="icon" size={19} aria-hidden="true" />
      <span>{t(mobile ? 'common.settings' : 'common.globalSettings')}</span>
    </Button>
  );
}

function Brand({ className }: { className: string }) {
  const { t } = useTranslation();

  return (
    <Link to="/trips" className={className}>
      <span className="brand-mark" aria-hidden="true">
        t.
      </span>
      {t('app.title')}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { account, error } = useSession();
  const home = Boolean(useMatch({ path: '/trips', end: true }));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const showSettings = home && settingsOpen;
  const openSettings = () => setSettingsOpen(true);

  return (
    <>
      <aside className="sidebar">
        <Brand className="brand" />
        <Navigation home={home} openSettings={openSettings} />
        <footer>
          <p>{t('common.accountLedger', { name: account?.name })}</p>
          {home ? <SettingsButton onClick={openSettings} /> : null}
        </footer>
      </aside>
      <main className="main">
        <header className="mobile-brand-header">
          <Brand className="brand" />
        </header>
        {error && !showSettings ? (
          <p className="error" role="alert">
            {error.message}
          </p>
        ) : null}
        {children}
      </main>
      <Navigation mobile home={home} openSettings={openSettings} />
      {showSettings ? <GlobalSettings onClose={() => setSettingsOpen(false)} /> : null}
    </>
  );
}
