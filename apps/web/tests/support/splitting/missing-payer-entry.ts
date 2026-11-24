import React, { type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SessionProvider, useSession } from '../../../src/features/auth/session.js';
import * as ExpenseModule from '../../../src/features/expenses/ExpenseForm.js';
import { App } from '../../../src/app/App.js';
import { initializeInterfaceLanguage } from '../../../src/i18n/runtime.js';
import type { SharedExpenseDraft } from './expense-draft.js';
import '../../../src/design-system.css';
import '../../../src/styles/index.css';

// Public component initialization contract for defensive validation. GREEN adds this optional
// prop to the actual component; ordinary application routes continue to omit it. This harness
// supplies an initial draft, never mutates React internals or substitutes a form implementation.
const ExpenseForm = ExpenseModule.ExpenseForm as ComponentType<{
  initialDraft?: SharedExpenseDraft;
}>;
const initialDraft = JSON.parse(
  document.getElementById('missing-payer-initial-draft')!.textContent!,
) as SharedExpenseDraft;
const client = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } },
});

function AuthenticatedForm() {
  const session = useSession();
  if (session.pending) return React.createElement('p', null, '載入中');
  if (!session.account) return React.createElement('p', { role: 'alert' }, '需要登入');

  return React.createElement(ExpenseForm, { initialDraft });
}

initializeInterfaceLanguage();

createRoot(document.getElementById('root')!).render(
  React.createElement(
    QueryClientProvider,
    { client },
    React.createElement(
      BrowserRouter,
      null,
      React.createElement(
        SessionProvider,
        null,
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/trips/:tripId/expenses/new',
            element: React.createElement(AuthenticatedForm),
          }),
          React.createElement(Route, { path: '*', element: React.createElement(App) }),
        ),
      ),
    ),
  ),
);
