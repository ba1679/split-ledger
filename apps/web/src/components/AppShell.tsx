import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useSession } from '../features/auth/session.js';
import { Icon } from './Icon.js';

function Navigation({ mobile = false }: { mobile?: boolean }) {
  const { signOut, closing } = useSession();
  return <nav className={mobile ? 'bottom-nav' : undefined} aria-label={mobile ? '行動導覽' : '主要導覽'}>
    <NavLink to="/trips"><Icon name="trips" /><span>我的旅行</span></NavLink><NavLink to="/categories"><Icon name="list" /><span>支出分類</span></NavLink>
    {mobile ? <button className="text-btn" disabled={closing} onClick={() => { void signOut(); }}><Icon name="back" /><span>登出</span></button> : null}
  </nav>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { account, signOut, error, closing } = useSession();
  return <>
    <aside className="sidebar">
      <Link to="/trips" className="brand"><span className="brand-mark" aria-hidden="true">t.</span>旅帳</Link>
      <Navigation />
      <footer><div className="eyebrow">A LITTLE RECORD<br />OF EVERY JOURNEY.</div><p>{account?.name}</p><button className="text-btn" disabled={closing} onClick={() => { void signOut(); }}><Icon name="back" /><span>登出</span></button></footer>
    </aside>
    <main className="main">{error ? <p className="error" role="alert">{error.message}</p> : null}{children}</main>
    <Navigation mobile />
  </>;
}
