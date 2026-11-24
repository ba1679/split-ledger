import { useTranslation } from 'react-i18next';
import { ActionButton } from '../../components/waiting/ActionButton.js';
import React, { useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { authClient, useSession } from './session.js';
import { LanguageMenu } from '../../components/LanguageMenu.js';

export function Login() {
  const { t } = useTranslation();
  const { account } = useSession();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const starting = useRef(false);
  const [error, setError] = useState('');

  if (account) return <Navigate to="/trips" replace />;

  async function signIn() {
    if (starting.current) return;
    starting.current = true;
    setBusy(true);
    setError('');

    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/trips`,
        errorCallbackURL: `${window.location.origin}/?error=login`,
      });

      if (result.error) {
        setError('login.retry');
        setBusy(false);
        starting.current = false;
      }
    } catch {
      setError('login.connection');
      setBusy(false);
      starting.current = false;
    }
  }

  return (
    <main className="login">
      <section className="login-story">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            t.
          </span>
          {t('app.title')}
        </Link>
        <div>
          <div className="eyebrow">{t('login.eyebrow')}</div>
          <h1>
            {t('login.storyFirst')}
            <br />
            {t('login.storySecond')}
          </h1>
          <p>{t('login.storyBody')}</p>
          <div className="travel-stamp" aria-hidden="true">
            {t('login.stampFirst')}
            <br />
            {t('login.stampSecond')}
          </div>
        </div>
        <footer>{t('login.storyFooter')}</footer>
      </section>
      <section className="login-panel">
        <LanguageMenu className="login-language-menu" />
        <div className="login-box">
          <div className="eyebrow">{t('login.welcome')}</div>
          <h2>
            {t('login.headingFirst')}
            <br />
            {t('login.headingSecond')}
          </h2>
          <p>{t('login.intro')}</p>
          <ActionButton
            busy={busy}
            label={t('login.google')}
            busyLabel={t('login.googlePending')}
            variant="outline"
            className="google"
            disabled={busy}
            onClick={() => {
              void signIn();
            }}
          />
          <p className="error" role="alert">
            {error ? t(error) : params.has('error') ? t('login.retry') : null}
          </p>
          <p className="privacy">
            {t('login.private')}
            <br />
            {t('login.sync')}
          </p>
        </div>
      </section>
    </main>
  );
}
