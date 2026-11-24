import { useTranslation } from 'react-i18next';
import React, { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  apiRequest,
  ApiError,
  type Trip,
  type TripMember,
  type ItemList,
} from '../../api/index.js';
import type { Repayment } from '../repayments/types.js';
import type {
  SettlementArrangement,
  SettlementView,
  SettlementViewWithExplanationDetails,
} from './types.js';
import { balanceStatus, formatBalanceAmount } from './balance-status.js';
import { useSession } from '../auth/session.js';
import { formatShareAmount } from '../expenses/ExpenseShares.js';
import { displayAmount } from '../expenses/money.js';
import { Button } from '../../components/ui/button.js';
import { QueryState } from '../../components/QueryState.js';
import { BusyIndicator } from '../../components/waiting/BusyIndicator.js';
import { Icon } from '../../components/Icon.js';
import { interfaceI18n, registerInterfaceMessages } from '../../i18n/runtime.js';
import './settlement.css';

registerInterfaceMessages('settlementPage', {
  stale: [
    '帳本已更新，請重新載入付款安排。',
    'The ledger has changed. Reload payment arrangements.',
  ],
  intro: [
    '查看每個人的應收、應付與付款安排。',
    'See each person’s balance and payment arrangements.',
  ],
  ledger: ['旅行帳本', 'Trip ledger'],
  arrangements: ['付款安排', 'Payment arrangements'],
  simplifyHint: ['調整付款對象，減少轉帳筆數。', 'Adjust who pays whom to reduce transfers.'],
  updating: ['正在更新簡化付款', 'Updating simplified payments'],
  counts: [
    '直接安排 {{direct}} 筆 · 目前安排 {{current}} 筆',
    '{{direct}} original payments · {{current}} current payments',
  ],
  unknown: [
    '簡化付款保存結果尚未確認，暫時保留上次已確認的安排。',
    'Save status unconfirmed. Select Check status to verify. The last confirmed arrangements remain visible.',
  ],
  failed: [
    '簡化付款保存失敗，已保留上次確認的安排。',
    'Could not save simplified payments. The last confirmed arrangements remain visible.',
  ],
  check: ['查證結果', 'Check status'],
  retry: ['重試', 'Try again'],
  refreshError: [
    '目前無法更新，仍顯示上次已確認的付款安排。',
    'Could not update. The last confirmed payment arrangements remain visible.',
  ],
  reload: ['重新載入', 'Reload'],
  balances: ['成員淨額', 'Member balances'],
  paymentFor: ['{{payer}} 付款給 {{payee}} {{currency}}', '{{payer}} pays {{payee}} {{currency}}'],
  settle: ['結清', 'Record payment'],
  actualRepayments: ['實際還款', 'Payments made'],
  recordRepayment: ['記錄還款', 'Record a separate payment'],
  repaymentHistory: ['還款紀錄', 'Payments made'],
  paidBy: ['{{payer}} 支付 {{payee}}', '{{payer}} paid {{payee}}'],
  noRepayments: ['目前還沒有已記錄的實際還款。', 'No payments recorded yet.'],
});

/** Publish only a trip and calculation confirmed at the same accounting version. */
async function readSettlement(base: string, localized: boolean, signal?: AbortSignal) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const [trip, settlement, members, repayments] = await Promise.all([
      apiRequest<Trip>(base, { signal }),
      apiRequest<SettlementView | SettlementViewWithExplanationDetails>(
        `${base}/settlement${localized ? '?include=explanationDetails' : ''}`,
        { signal },
      ),
      apiRequest<ItemList<TripMember>>(`${base}/members`, { signal }),
      apiRequest<ItemList<Repayment>>(`${base}/repayments`, { signal }),
    ]);
    if (
      trip.accountingRevision === settlement.accountingRevision &&
      trip.simplifyDebts === settlement.simplifyDebts
    )
      return { trip, settlement, members: members.items, repayments: repayments.items };
  }
  throw new Error(interfaceI18n.t('settlementPage.stale'));
}

export function TripSettlement() {
  const { t, i18n } = useTranslation();
  const localized = i18n.resolvedLanguage === 'en';
  const location = useLocation();
  const { tripId } = useParams();
  const { account } = useSession();
  const client = useQueryClient();
  const base = `/api/trips/${tripId}`;
  const queryKey = ['account', account!.id, 'settlement', tripId, 'screen', localized];
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => readSettlement(base, localized, signal),
  });
  const [saving, setSaving] = useState(false);
  const writing = useRef(false);
  const [failure, setFailure] = useState<{ target: boolean; unknown: boolean } | null>(null);

  async function changeMode(target: boolean) {
    if (writing.current) return;
    writing.current = true;
    setSaving(true);
    setFailure(null);
    let saved = false;
    try {
      await client.cancelQueries({ queryKey });
      await apiRequest<Trip>(base, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simplifyDebts: target }),
      });
      saved = true;
      const confirmed = await readSettlement(base, localized);
      client.setQueryData(queryKey, confirmed);
      client.setQueryData(['account', account!.id, 'trip', tripId], confirmed.trip);
    } catch (error) {
      setFailure({
        target,
        unknown: saved || !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      });
    } finally {
      writing.current = false;
      setSaving(false);
    }
  }

  async function confirmMode() {
    if (writing.current) return;
    writing.current = true;
    setSaving(true);
    try {
      const confirmed = await readSettlement(base, localized);
      client.setQueryData(queryKey, confirmed);
      client.setQueryData(['account', account!.id, 'trip', tripId], confirmed.trip);
      setFailure(null);
    } catch {
      // Keep the last confirmed graph while the result cannot be verified.
    } finally {
      writing.current = false;
      setSaving(false);
    }
  }

  const pageHead = (
    <header className="page-head">
      <div>
        <h1>{t('settlement.title')}</h1>
        <p className="muted">{t('settlementPage.intro')}</p>
      </div>
    </header>
  );
  const back = (
    <Link className="back" to={`/trips/${tripId}`}>
      <Icon name="back" />
      <span>{query.data?.trip.name ?? t('settlementPage.ledger')}</span>
    </Link>
  );
  if (!query.data)
    return (
      <>
        {back}
        {pageHead}
        <QueryState
          label={t('settlementPage.arrangements')}
          layout="list"
          fetchStatus={query.fetchStatus}
          pending={query.isPending}
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      </>
    );
  const { settlement, members, repayments } = query.data;
  const names = new Map(members.map((member) => [member.id, member.name]));
  let explanation = settlement.explanation;
  if ('explanationDetails' in settlement) {
    const { kind, directArrangements } = settlement.explanationDetails;
    const list = new Intl.ListFormat('en');
    const describe = (arrangements: readonly Omit<SettlementArrangement, 'key'>[]) =>
      list.format(
        arrangements.map((entry) =>
          t('settlement.pays', {
            payer: names.get(entry.debtorMemberId),
            payee: names.get(entry.creditorMemberId),
          }),
        ),
      );
    const arrangements =
      kind === 'changed'
        ? t('settlement.changed', {
            before: describe(directArrangements),
            after: describe(settlement.arrangements),
            original: settlement.directArrangementCount,
            current: settlement.suggestedArrangementCount,
          })
        : t(`settlement.${kind}`, { count: settlement.suggestedArrangementCount });
    explanation = [arrangements, t('settlement.sameBalances'), t('settlement.sameRecords')].join(
      ' ',
    );
  }
  const currencies = [
    ...new Set([
      ...settlement.balances.map((balance) => balance.currencyCode),
      ...settlement.arrangements.map((arrangement) => arrangement.currencyCode),
      ...repayments.map((repayment) => repayment.currencyCode),
    ]),
  ].sort();

  return (
    <div className="settlement-page">
      {back}
      {location.state?.messageKey || location.state?.message ? (
        <p role="status" className="notice">
          {location.state.messageKey ? t(location.state.messageKey) : location.state.message}
        </p>
      ) : null}
      {pageHead}
      <section
        className="settlement-panel simplification-panel"
        aria-labelledby="simplification-title"
      >
        <div className="simplification-heading">
          <div>
            <h2 id="simplification-title">{t('settlement.simplify')}</h2>
            <p className="muted">{t('settlementPage.simplifyHint')}</p>
          </div>
          <button
            type="button"
            className="simplification-switch"
            role="switch"
            aria-label={t('settlement.simplify')}
            aria-checked={settlement.simplifyDebts}
            aria-busy={saving}
            aria-disabled={saving || failure?.unknown || undefined}
            disabled={failure?.unknown}
            onClick={(event) => {
              event.currentTarget.focus({ preventScroll: true });
              void changeMode(!settlement.simplifyDebts);
            }}
          >
            <span className="switch-track" />
            {saving ? (
              <BusyIndicator
                className="switch-spinner"
                accessibleLabel={t('settlementPage.updating')}
              />
            ) : null}
          </button>
        </div>
        <p>{explanation}</p>
        <p className="muted">
          {t('settlementPage.counts', {
            direct: settlement.directArrangementCount,
            current: settlement.suggestedArrangementCount,
          })}
        </p>
        {failure ? (
          <div className="error" role="alert">
            <p>{failure.unknown ? t('settlementPage.unknown') : t('settlementPage.failed')}</p>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => {
                if (failure.unknown) void confirmMode();
                else void changeMode(failure.target);
              }}
            >
              {t(failure.unknown ? 'settlementPage.check' : 'settlementPage.retry')}
            </Button>
          </div>
        ) : null}
      </section>
      {query.error ? (
        <p role="alert" className="error">
          {t('settlementPage.refreshError')}
          <Button
            variant="outline"
            onClick={() => {
              void query.refetch();
            }}
          >
            {t('settlementPage.reload')}
          </Button>
        </p>
      ) : null}
      <section aria-label={t('settlementPage.balances')} className="balance-grid">
        {currencies.map((currency) => (
          <div key={currency} className="settlement-panel">
            <h2>{currency}</h2>
            {members.map((member) => {
              const amount = settlement.balances.find(
                (balance) => balance.memberId === member.id && balance.currencyCode === currency,
              )?.netAmount ?? { numerator: '0', denominator: '1', minorUnit: 0 };
              const sign = BigInt(amount.numerator);

              return (
                <div
                  className="balance-row"
                  key={member.id}
                  role="group"
                  aria-label={`${member.name} ${currency}`}
                >
                  <span className="balance-person">
                    <span>{member.name}</span>
                    <span>
                      {t(balanceStatus(sign, member.id, currency, settlement.arrangements))}
                    </span>
                  </span>
                  <strong className={sign > 0n ? 'receivable' : undefined}>
                    {currency} {formatBalanceAmount(amount, i18n.resolvedLanguage)}
                  </strong>
                </div>
              );
            })}
          </div>
        ))}
      </section>
      <section className="settlement-panel" aria-label={t('settlementPage.arrangements')}>
        <h2>{t('settlement.pending')}</h2>
        {settlement.arrangements.length > 0 &&
          currencies
            .filter(
              (currency) =>
                !settlement.arrangements.some((entry) => entry.currencyCode === currency),
            )
            .map((currency) => <p key={currency}>{t('settlement.emptyCurrency', { currency })}</p>)}
        {settlement.arrangements.length ? (
          settlement.arrangements.map((arrangement) => {
            const payer = names.get(arrangement.debtorMemberId),
              payee = names.get(arrangement.creditorMemberId);

            return (
              <div
                className="arrangement-row"
                role="group"
                aria-label={t('settlementPage.paymentFor', {
                  payer,
                  payee,
                  currency: arrangement.currencyCode,
                })}
                key={arrangement.key}
              >
                <div>
                  <p>
                    {payer} → {payee}
                  </p>
                  <span>{t('settlement.amountDue')}</span>{' '}
                  <strong className="arrangement-amount">
                    {arrangement.currencyCode} {formatShareAmount(arrangement.amount)}
                  </strong>
                </div>
                <Button asChild variant="outline">
                  <Link
                    to={`/trips/${tripId}/settlements/new?arrangementKey=${encodeURIComponent(arrangement.key)}`}
                  >
                    {t('settlementPage.settle')}
                  </Link>
                </Button>
              </div>
            );
          })
        ) : (
          <p>{t('settlement.empty')}</p>
        )}
      </section>
      <section className="repayment-history">
        <h2>{t('settlementPage.actualRepayments')}</h2>
        <Button asChild variant="outline">
          <Link to={`/trips/${tripId}/repayments/new`}>{t('settlementPage.recordRepayment')}</Link>
        </Button>
        <ul aria-label={t('settlementPage.repaymentHistory')}>
          {repayments.map((repayment) => (
            <li key={repayment.id}>
              <span>
                {t('settlementPage.paidBy', {
                  payer: names.get(repayment.payerMemberId),
                  payee: names.get(repayment.payeeMemberId),
                })}
              </span>
              <span>{repayment.paidOn}</span>
              <strong>
                {t('settlement.amountPaid')} {repayment.currencyCode}{' '}
                {displayAmount(repayment.amount)}
              </strong>
            </li>
          ))}
        </ul>
        {repayments.length === 0 ? (
          <p className="muted">{t('settlementPage.noRepayments')}</p>
        ) : null}
      </section>
    </div>
  );
}
