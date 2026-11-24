import React, { useId, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  apiRequest,
  ApiError,
  type ItemList,
  type Trip,
  type TripMember,
} from '../../api/index.js';
import { useSession } from '../auth/session.js';
import type { SettlementView } from '../settlement/types.js';
import { formatShareAmount } from '../expenses/ExpenseShares.js';
import { Button } from '../../components/ui/button.js';
import { ActionButton } from '../../components/waiting/ActionButton.js';
import { Input } from '../../components/ui/input.js';
import { QueryState } from '../../components/QueryState.js';
import { FormDialog } from '../../components/FormDialog.js';
import { Icon } from '../../components/Icon.js';
import { useTranslation } from 'react-i18next';
import { registerInterfaceMessages } from '../../i18n/runtime.js';
import './members.css';

registerInterfaceMessages('membersPage', {
  required: ['請輸入同行者名稱。', 'Enter a companion name.'],
  duplicate: [
    '這個名稱已使用，請使用其他名稱。',
    'This companion name is already in use. Choose a different name.',
  ],
  name: ['同行者名稱', 'Companion name'],
  namePlaceholder: ['輸入名字', 'Enter a name'],
  unknown: [
    '保存結果尚未確認，你的輸入仍保留。請先查證這次操作是否已保存。',
    'Save status unconfirmed. Your input is still here. Select Check status to verify.',
  ],
  verify: ['查證結果', 'Check status'],
  saveName: ['儲存名稱', 'Save name'],
  add: ['新增同行者', 'Add companion'],
  saved: ['同行者資料已保存。', 'Companion saved.'],
  deleted: ['同行者已刪除。', 'Companion deleted.'],
  saveUnknown: [
    '保存結果尚未確認，請重新載入名單確認。',
    'Save status unconfirmed. Reload the list to check.',
  ],
  deleteUnknown: [
    '刪除結果尚未確認，請重新載入名單確認。',
    'Deletion status unconfirmed. Reload the list to check.',
  ],
  inUse: [
    '{{name}} 已有支出或還款紀錄，不能刪除。請改為停用，歷史紀錄會保留。',
    '{{name}} has expenses or payments and cannot be deleted. Deactivate this companion to keep the history.',
  ],
  title: ['同行者', 'Companions'],
  intro: ['新增同行者，或管理這趟旅行的成員。', 'Add companions or manage members of this trip.'],
  ledger: ['旅行帳本', 'Trip ledger'],
  list: ['同行者清單', 'Companions list'],
  together: ['一起旅行的人', 'People on this trip'],
  travelMembers: ['旅行成員', 'Trip members'],
  owner: ['帳本擁有者 · 永久啟用', 'Ledger owner · always active'],
  active: ['啟用中', 'Active'],
  inactive: ['已停用', 'Inactive'],
  history: ['保留過去紀錄', 'History preserved'],
  you: ['你', 'You'],
  rename: ['改名', 'Rename'],
  deactivate: ['停用', 'Deactivate'],
  reactivate: ['重新啟用', 'Reactivate'],
  delete: ['刪除', 'Delete'],
  renameFor: ['改名 {{name}}', 'Rename {{name}}'],
  deactivateFor: ['停用 {{name}}', 'Deactivate {{name}}'],
  reactivateFor: ['重新啟用 {{name}}', 'Reactivate {{name}}'],
  deleteFor: ['刪除 {{name}}', 'Delete {{name}}'],
  manageTitle: ['管理 {{name}}', 'Manage {{name}}'],
  deleteTitle: ['刪除 {{name}}', 'Delete {{name}}'],
  deactivateTitle: ['停用 {{name}}', 'Deactivate {{name}}'],
  renameHint: [
    '改名後，過去的支出與還款仍屬於同一位同行者。',
    'Past expenses and payments remain linked to this companion after renaming.',
  ],
  deactivateHint: [
    '過去的支出與還款會保留。停用後，新支出與還款不能再選用這位同行者。',
    'Past expenses and payments remain. New records cannot select this companion after deactivation.',
  ],
  deleteHint: [
    '只有未被帳務引用的同行者才能刪除；刪除後會從同行者名單移除。有歷史紀錄請改為停用。',
    'Only companions with no accounting records can be deleted. Deletion removes them from the list; deactivate companions with history instead.',
  ],
  cancel: ['取消', 'Cancel'],
});

function nameKey(value: string) {
  return value.trim().replace(/[A-Z]/g, (character) => character.toLowerCase());
}

function MemberNameForm({
  member,
  members,
  base,
  onSaved,
  onBusyChange,
  onBegin,
}: {
  member?: TripMember;
  members: TripMember[];
  base: string;
  onSaved: (member: TripMember) => Promise<void>;
  onBusyChange?: (busy: boolean) => void;
  onBegin?: () => void;
}) {
  const { t } = useTranslation();
  const [commandId, setCommandId] = useState(() => member?.id ?? crypto.randomUUID());
  const [name, setName] = useState(member?.name ?? '');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [unknown, setUnknown] = useState<string | null>(null);
  const writing = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const fieldId = useId();

  async function verify(expected: string) {
    try {
      const saved = await apiRequest<TripMember>(`${base}/members/${commandId}`);
      if (
        saved.id !== commandId ||
        saved.tripId !== members[0]?.tripId ||
        saved.role !== 'companion' ||
        saved.name !== expected
      )
        return null;

      return saved;
    } catch {
      return null;
    }
  }

  async function completed(saved: TripMember) {
    await onSaved(saved);
    setUnknown(null);
    setError('');
    if (!member) {
      setName('');
      setCommandId(crypto.randomUUID());
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (writing.current || unknown) return;
    onBegin?.();
    const trimmed = name.trim();
    const invalid = !trimmed
      ? t('membersPage.required')
      : members.some((row) => row.id !== commandId && nameKey(row.name) === nameKey(trimmed))
        ? t('membersPage.duplicate')
        : '';
    setError(invalid);
    if (invalid) {
      input.current?.focus();

      return;
    }
    writing.current = true;
    setPending(true);
    onBusyChange?.(true);
    try {
      let saved: TripMember;
      try {
        saved = await apiRequest<TripMember>(
          member ? `${base}/members/${commandId}` : `${base}/members`,
          {
            method: member ? 'PATCH' : 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(member ? { name: trimmed } : { id: commandId, name: trimmed }),
          },
        );
      } catch (failure) {
        if (failure instanceof ApiError && failure.status >= 400 && failure.status < 500) {
          setError(
            failure.code === 'MEMBER_NAME_CONFLICT' ? t('membersPage.duplicate') : failure.message,
          );

          return;
        }
        setUnknown(trimmed);
        const confirmed = await verify(trimmed);
        if (!confirmed) return;
        saved = confirmed;
      }
      await completed(saved);
    } finally {
      writing.current = false;
      setPending(false);
      onBusyChange?.(false);
    }
  }

  async function checkResult() {
    if (writing.current || !unknown) return;
    writing.current = true;
    setPending(true);
    onBusyChange?.(true);
    try {
      const saved = await verify(unknown);
      if (saved) await completed(saved);
    } finally {
      writing.current = false;
      setPending(false);
      onBusyChange?.(false);
    }
  }

  return (
    <form
      noValidate
      data-command-id={commandId}
      onSubmit={(event) => {
        void save(event);
      }}
    >
      <div className="field">
        <label htmlFor={fieldId}>{t('membersPage.name')}</label>
        <Input
          id={fieldId}
          ref={input}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          placeholder={t('membersPage.namePlaceholder')}
          required
          disabled={pending || Boolean(unknown)}
          aria-invalid={Boolean(error)}
          aria-describedby={`${fieldId}-error`}
        />
        <p id={`${fieldId}-error`} role="alert" className="error">
          {error}
        </p>
      </div>
      {unknown ? (
        <div role="alert" className="member-unknown">
          <p>{t('membersPage.unknown')}</p>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              void checkResult();
            }}
          >
            {t('membersPage.verify')}
          </Button>
        </div>
      ) : null}
      <ActionButton
        busy={pending}
        label={t(member ? 'membersPage.saveName' : 'membersPage.add')}
        type="submit"
        disabled={pending || Boolean(unknown)}
      />
    </form>
  );
}

type MemberAction = { member: TripMember; kind: 'rename' | 'deactivate' | 'delete' };

export function TripMembers() {
  const { t } = useTranslation();
  const { tripId } = useParams();
  const { account } = useSession();
  const client = useQueryClient();
  const base = `/api/trips/${tripId}`;
  const prefix = ['account', account!.id];
  const membersKey = [...prefix, 'members', tripId];
  const members = useQuery({
    queryKey: membersKey,
    queryFn: ({ signal }) => apiRequest<ItemList<TripMember>>(`${base}/members`, { signal }),
  });
  const trip = useQuery({
    queryKey: [...prefix, 'trip', tripId],
    queryFn: ({ signal }) => apiRequest<Trip>(base, { signal }),
  });
  const settlement = useQuery({
    queryKey: [...prefix, 'settlement', tripId, 'members'],
    queryFn: ({ signal }) => apiRequest<SettlementView>(`${base}/settlement`, { signal }),
  });
  const [action, setAction] = useState<MemberAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [activationId, setActivationId] = useState<string | null>(null);
  const [failure, setFailure] = useState('');
  const [message, setMessage] = useState('');
  const writing = useRef(false);

  async function refresh() {
    await Promise.all(
      [
        'members',
        'expenses',
        'expense',
        'expense-analysis',
        'repayments',
        'settlement',
        'trip',
        'trips',
      ].map((key) =>
        client.invalidateQueries({
          queryKey: [...prefix, key, ...(key === 'trips' ? [] : [tripId])],
        }),
      ),
    );
  }

  async function changed(saved: TripMember) {
    // Publish only the server-confirmed identity; all historical joins continue to use its ID.
    client.setQueryData<ItemList<TripMember>>(membersKey, (current) => ({
      items: current?.items.some((row) => row.id === saved.id)
        ? current.items.map((row) => (row.id === saved.id ? saved : row))
        : [...(current?.items ?? []), saved],
    }));
    setMessage('membersPage.saved');
    setAction(null);
    await refresh();
  }

  async function changeStatus(member: TripMember, isActive: boolean) {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    setActivationId(isActive ? member.id : null);
    setFailure('');
    try {
      const saved = await apiRequest<TripMember>(`${base}/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      await changed(saved);
    } catch (error) {
      setFailure(
        error instanceof ApiError && error.status < 500
          ? error.message
          : t('membersPage.saveUnknown'),
      );
    } finally {
      writing.current = false;
      setBusy(false);
      setActivationId(null);
    }
  }

  async function remove(member: TripMember) {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    setFailure('');
    try {
      await apiRequest<void>(`${base}/members/${member.id}`, { method: 'DELETE' });
      client.setQueryData<ItemList<TripMember>>(membersKey, (current) => ({
        items: (current?.items ?? []).filter((row) => row.id !== member.id),
      }));
      setAction(null);
      setMessage('membersPage.deleted');
      await refresh();
    } catch (error) {
      setAction(null);
      setFailure(
        error instanceof ApiError && error.code === 'MEMBER_IN_USE'
          ? t('membersPage.inUse', { name: member.name })
          : error instanceof ApiError && error.status < 500
            ? error.message
            : t('membersPage.deleteUnknown'),
      );
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  const pageHead = (
    <header className="page-head">
      <div>
        <h1>{t('membersPage.title')}</h1>
        <p className="muted">{t('membersPage.intro')}</p>
      </div>
    </header>
  );
  const back = (
    <Link className="back" to={`/trips/${tripId}`}>
      <Icon name="back" />
      <span>{trip.data?.name ?? t('membersPage.ledger')}</span>
    </Link>
  );
  if (!members.data || !trip.data)
    return (
      <>
        {back}
        {pageHead}
        <QueryState
          label={t('membersPage.list')}
          layout="list"
          fetchStatus={
            members.fetchStatus === 'paused' || trip.fetchStatus === 'paused'
              ? 'paused'
              : members.fetchStatus
          }
          pending={members.isPending || trip.isPending}
          error={members.error ?? trip.error}
          retry={() => {
            void members.refetch();
            void trip.refetch();
          }}
        />
      </>
    );

  return (
    <div className="members-page">
      {back}
      {pageHead}
      <section className="member-add-panel" aria-labelledby="member-add-title">
        <h2 id="member-add-title">{t('membersPage.together')}</h2>
        <MemberNameForm
          members={members.data.items}
          base={base}
          onSaved={changed}
          onBusyChange={setBusy}
          onBegin={() => {
            setMessage('');
            setFailure('');
          }}
        />
      </section>
      {message ? (
        <p role="status" className="feedback">
          {t(message)}
        </p>
      ) : null}
      {failure ? (
        <p role="alert" className="error">
          {failure}
        </p>
      ) : null}
      {members.error ? (
        <QueryState
          error={members.error}
          retry={() => {
            void members.refetch();
          }}
        />
      ) : null}
      <section aria-label={t('membersPage.list')}>
        <ul className="member-list" aria-label={t('membersPage.travelMembers')}>
          {members.data.items.map((member) => (
            <li key={member.id}>
              <div className="member-person">
                <span aria-hidden="true" className="member-avatar">
                  {[...member.name][0]}
                </span>
                <div>
                  <strong>{member.name}</strong>
                  <p className="muted">
                    {member.role === 'owner' ? (
                      t('membersPage.owner')
                    ) : member.isActive ? (
                      t('membersPage.active')
                    ) : (
                      <>
                        <span>{t('membersPage.inactive')}</span> · {t('membersPage.history')}
                      </>
                    )}
                  </p>
                  {settlement.data?.balances
                    .filter((row) => row.memberId === member.id)
                    .map((row) => (
                      <p className="member-balance" key={row.currencyCode}>
                        {row.currencyCode} {formatShareAmount(row.netAmount)}
                      </p>
                    ))}
                </div>
              </div>
              {member.role === 'owner' ? (
                <span className="muted">{t('membersPage.you')}</span>
              ) : (
                <div className="member-actions">
                  <Button
                    variant="ghost"
                    aria-label={t('membersPage.renameFor', { name: member.name })}
                    disabled={busy}
                    onClick={() => {
                      setFailure('');
                      setAction({ member, kind: 'rename' });
                    }}
                  >
                    {t('membersPage.rename')}
                  </Button>
                  {member.isActive ? (
                    <Button
                      variant="ghost"
                      aria-label={t('membersPage.deactivateFor', { name: member.name })}
                      disabled={busy}
                      onClick={() => {
                        setFailure('');
                        setAction({ member, kind: 'deactivate' });
                      }}
                    >
                      {t('membersPage.deactivate')}
                    </Button>
                  ) : (
                    <ActionButton
                      busy={busy && activationId === member.id}
                      label={t('membersPage.reactivateFor', { name: member.name })}
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        void changeStatus(member, true);
                      }}
                    >
                      {t('membersPage.reactivate')}
                    </ActionButton>
                  )}
                  <Button
                    variant="ghost"
                    aria-label={t('membersPage.deleteFor', { name: member.name })}
                    disabled={busy}
                    onClick={() => {
                      setFailure('');
                      setAction({ member, kind: 'delete' });
                    }}
                  >
                    {t('membersPage.delete')}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      {action ? (
        <FormDialog
          title={t(
            action.kind === 'rename'
              ? 'membersPage.manageTitle'
              : action.kind === 'delete'
                ? 'membersPage.deleteTitle'
                : 'membersPage.deactivateTitle',
            { name: action.member.name },
          )}
          busy={busy}
          onClose={() => setAction(null)}
        >
          {action.kind === 'rename' ? (
            <div className="member-rename-panel">
              <p className="muted">{t('membersPage.renameHint')}</p>
              <MemberNameForm
                member={action.member}
                members={members.data.items}
                base={base}
                onSaved={changed}
                onBusyChange={setBusy}
                onBegin={() => {
                  setMessage('');
                  setFailure('');
                }}
              />
              <Button variant="outline" disabled={busy} onClick={() => setAction(null)}>
                {t('membersPage.cancel')}
              </Button>
            </div>
          ) : (
            <>
              <p>
                {action.kind === 'deactivate'
                  ? t('membersPage.deactivateHint')
                  : t('membersPage.deleteHint')}
              </p>
              <div className="form-actions">
                <Button variant="outline" disabled={busy} onClick={() => setAction(null)}>
                  {t('membersPage.cancel')}
                </Button>
                <ActionButton
                  busy={busy}
                  label={t(
                    action.kind === 'delete' ? 'membersPage.delete' : 'membersPage.deactivate',
                  )}
                  disabled={busy}
                  onClick={() => {
                    if (action.kind === 'delete') void remove(action.member);
                    else void changeStatus(action.member, false);
                  }}
                />
              </div>
            </>
          )}
        </FormDialog>
      ) : null}
    </div>
  );
}
