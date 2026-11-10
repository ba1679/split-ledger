import { Button } from '../components/ui/button.js';
import React from 'react';
import { Link, NavLink, useMatch } from 'react-router-dom';
import { useSession } from '../features/auth/session.js';
import { Icon } from './Icon.js';

function Navigation({ mobile = false }: { mobile?: boolean }) {
  const { signOut, closing } = useSession();
  const tripMatch = useMatch('/trips/:tripId/*');

  return (
    <nav
      className={mobile ? 'bottom-nav' : undefined}
      aria-label={mobile ? '行動導覽' : '主要導覽'}
    >
      <NavLink to="/trips">
        <Icon name="trips" />
        <span>我的旅行</span>
      </NavLink>
      <NavLink to="/categories">
        <Icon name="list" />
        <span>支出分類</span>
      </NavLink>
      {tripMatch ? (
        <NavLink to={`/trips/${tripMatch.params.tripId}/members`}>
          <Icon name="list" />
          <span>同行者</span>
        </NavLink>
      ) : null}
      {tripMatch ? (
        <NavLink to={`/trips/${tripMatch.params.tripId}/settlement`}>
          <Icon name="list" />
          <span>分帳結算</span>
        </NavLink>
      ) : null}
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
