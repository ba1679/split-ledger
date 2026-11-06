import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { SessionProvider } from './features/auth/session.js';
import { App } from './app/App.js';
import './styles.css';

// Keep server reads immediately stale so navigation and window focus verify the current account.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 0, retry: false }, mutations: { retry: false } },
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionProvider>
          <App />
        </SessionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
