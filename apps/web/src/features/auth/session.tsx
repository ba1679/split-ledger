import { useTranslation } from 'react-i18next';
import '../../i18n/shared-messages.js';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createAuthClient } from 'better-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiRequest, ApiError, type Account } from '../../api/index.js';

export const authClient = createAuthClient({ baseURL: window.location.origin });
const sessionKey = ['session'] as const;
interface SessionState {
  account: Account | null;
  pending: boolean;
  error: Error | null;
  closing: boolean;
  signOut: () => Promise<void>;
  retry: () => void;
}
const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [closing, setClosing] = useState(false);
  const [signOutError, setSignOutError] = useState<Error | null>(null);
  const previousAccount = useRef<string | null>(null);
  const session = useQuery({
    queryKey: sessionKey,
    queryFn: async ({ signal }) => {
      try {
        return await apiRequest<Account>('/api/me', { signal });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;

        throw error;
      }
    },
    retry: false,
  });

  useEffect(() => {
    const previous = previousAccount.current;

    previousAccount.current = session.data?.id ?? null;
    if (previous && previous !== session.data?.id) {
      // A session refreshed after another tab changes accounts must discard the old owner's reads too.
      const oldAccount = { queryKey: ['account', previous] };

      void client.cancelQueries(oldAccount).then(() => client.removeQueries(oldAccount));
    }
  }, [client, session.data?.id]);

  useEffect(() => {
    const expire = () => {
      // Cancel before removing data so a late response cannot repopulate the previous account's cache.
      void client.cancelQueries().then(() => {
        client.clear();
        client.setQueryData(sessionKey, null);
        navigate('/', { replace: true });
      });
    };

    window.addEventListener('ledger:unauthenticated', expire);

    return () => window.removeEventListener('ledger:unauthenticated', expire);
  }, [client, navigate]);

  async function signOut() {
    setClosing(true);
    setSignOutError(null);
    await client.cancelQueries();

    try {
      const result = await authClient.signOut();

      if (result.error) throw new Error(t('common.signOutError'));

      client.clear();
      client.setQueryData(sessionKey, null);
      navigate('/', { replace: true });
    } catch (error) {
      setSignOutError(error instanceof Error ? error : new Error(t('common.signOutError')));
    } finally {
      setClosing(false);
    }
  }

  return (
    <SessionContext
      value={{
        account: session.data ?? null,
        pending: session.isPending,
        error: signOutError ?? session.error,
        closing,
        signOut,
        retry: () => {
          void session.refetch();
        },
      }}
    >
      {children}
    </SessionContext>
  );
}

export function useSession() {
  const session = useContext(SessionContext);

  if (!session) throw new Error('SessionProvider is required');

  return session;
}
