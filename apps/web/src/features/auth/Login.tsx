import { ActionButton } from '../../components/waiting/ActionButton.js';
import React, { useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { authClient, useSession } from './session.js';

export function Login() {
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
        setError(result.error.message ?? '登入尚未完成，請重新嘗試。');
        setBusy(false);
        starting.current = false;
      }
    } catch {
      setError('目前無法連線，登入尚未完成。請重新嘗試。');
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
          旅帳
        </Link>
        <div>
          <div className="eyebrow">LESS CALCULATING. MORE EXPLORING.</div>
          <h1>
            好好旅行，
            <br />
            每一筆都記得。
          </h1>
          <p>從出發前的機票，到路邊的一杯咖啡。把花費放好，把時間留給風景。</p>
          <div className="travel-stamp" aria-hidden="true">
            LET'S
            <br />
            GO PLACES
          </div>
        </div>
        <footer>YOUR JOURNEY, IN LITTLE DETAILS.</footer>
      </section>
      <section className="login-panel">
        <div className="login-box">
          <div className="eyebrow">WELCOME TO TRAVEL LEDGER</div>
          <h2>
            下一趟旅行，
            <br />
            從這裡開始。
          </h2>
          <p>登入你的個人旅行帳本，隨手記下沿途的花費。</p>
          <ActionButton
            busy={busy}
            label="使用 Google 帳號登入"
            busyLabel="正在進行 Google 登入"
            variant="outline"
            className="google"
            disabled={busy}
            onClick={() => {
              void signIn();
            }}
          />
          <p className="error" role="alert">
            {error || (params.has('error') ? '登入尚未完成，請重新嘗試。' : '')}
          </p>
          <p className="privacy">
            你的帳本只屬於你。
            <br />
            登入後，可在手機與電腦查看同一份紀錄。
          </p>
        </div>
      </section>
    </main>
  );
}
