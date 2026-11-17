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
import { Input } from '../../components/ui/input.js';
import { QueryState } from '../../components/QueryState.js';
import { FormDialog } from '../../components/FormDialog.js';
import { Icon } from '../../components/Icon.js';
import './members.css';

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
      ? '請輸入同行者名稱。'
      : members.some((row) => row.id !== commandId && nameKey(row.name) === nameKey(trimmed))
        ? '這個名稱已使用，請使用其他名稱。'
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
            failure.code === 'MEMBER_NAME_CONFLICT'
              ? '這個名稱已使用，請使用其他名稱。'
              : failure.message,
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
        <label htmlFor={fieldId}>同行者名稱</label>
        <Input
          id={fieldId}
          ref={input}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          placeholder="輸入名字"
          required
          disabled={pending || Boolean(unknown)}
          aria-invalid={Boolean(error)}
          aria-describedby={`${fieldId}-hint ${fieldId}-error`}
        />
        <p id={`${fieldId}-hint`} className="field-hint">
          前後空白會自動去除；同一趟旅行內名稱不可重複。
        </p>
        <p id={`${fieldId}-error`} role="alert" className="error">
          {error}
        </p>
      </div>
      {unknown ? (
        <div role="alert" className="member-unknown">
          <p>保存結果尚未確認，你的輸入仍保留。請先查證這次操作是否已保存。</p>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              void checkResult();
            }}
          >
            查證結果
          </Button>
        </div>
      ) : null}
      <Button type="submit" disabled={pending || Boolean(unknown)}>
        {member ? '儲存名稱' : '新增同行者'}
      </Button>
      {pending ? <p role="status">正在確認保存結果…</p> : null}
    </form>
  );
}

type MemberAction = { member: TripMember; kind: 'rename' | 'deactivate' | 'delete' };

export function TripMembers() {
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
  const [failure, setFailure] = useState('');
  const [message, setMessage] = useState('');
  const writing = useRef(false);

  async function refresh() {
    await Promise.all(
      ['members', 'expenses', 'expense', 'repayments', 'settlement', 'trip', 'trips'].map((key) =>
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
    setMessage('同行者資料已保存。');
    setAction(null);
    await refresh();
  }

  async function changeStatus(member: TripMember, isActive: boolean) {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
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
          : '保存結果尚未確認，請重新載入名單確認。',
      );
    } finally {
      writing.current = false;
      setBusy(false);
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
      setMessage('同行者已刪除。');
      await refresh();
    } catch (error) {
      setAction(null);
      setFailure(
        error instanceof ApiError && error.code === 'MEMBER_IN_USE'
          ? `${member.name} 已有支出或還款紀錄，不能刪除。請改為停用，歷史紀錄會保留。`
          : error instanceof ApiError && error.status < 500
            ? error.message
            : '刪除結果尚未確認，請重新載入名單確認。',
      );
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  const pageHead = (
    <header className="page-head">
      <div>
        <h1>同行者</h1>
        <p className="muted">新增同行者，或管理這趟旅行的成員。</p>
      </div>
    </header>
  );
  const back = (
    <Link className="back" to={`/trips/${tripId}`}>
      <Icon name="back" />
      <span>{trip.data?.name ?? '旅行帳本'}</span>
    </Link>
  );
  if (!members.data || !trip.data)
    return (
      <>
        {back}
        {pageHead}
        <QueryState
          label="同行者清單"
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
        <h2 id="member-add-title">一起旅行的人</h2>
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
          {message}
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
      <section aria-label="同行者清單">
        <ul className="member-list" aria-label="旅行成員">
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
                      '帳本擁有者 · 永久啟用'
                    ) : member.isActive ? (
                      '啟用中'
                    ) : (
                      <>
                        <span>已停用</span> · 保留過去紀錄
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
                <span className="muted">你</span>
              ) : (
                <div className="member-actions">
                  <Button
                    variant="ghost"
                    aria-label={`改名 ${member.name}`}
                    disabled={busy}
                    onClick={() => {
                      setFailure('');
                      setAction({ member, kind: 'rename' });
                    }}
                  >
                    改名
                  </Button>
                  {member.isActive ? (
                    <Button
                      variant="ghost"
                      aria-label={`停用 ${member.name}`}
                      disabled={busy}
                      onClick={() => {
                        setFailure('');
                        setAction({ member, kind: 'deactivate' });
                      }}
                    >
                      停用
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      aria-label={`重新啟用 ${member.name}`}
                      disabled={busy}
                      onClick={() => {
                        void changeStatus(member, true);
                      }}
                    >
                      重新啟用
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    aria-label={`刪除 ${member.name}`}
                    disabled={busy}
                    onClick={() => {
                      setFailure('');
                      setAction({ member, kind: 'delete' });
                    }}
                  >
                    刪除
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      <p className="muted">同行者不用登入，由你統一管理這趟旅行的帳務。</p>
      {action ? (
        <FormDialog
          title={`${action.kind === 'rename' ? '管理' : action.kind === 'delete' ? '刪除' : '停用'} ${action.member.name}`}
          busy={busy}
          onClose={() => setAction(null)}
        >
          {action.kind === 'rename' ? (
            <div className="member-rename-panel">
              <p className="muted">改名後，過去的支出與還款仍屬於同一位同行者。</p>
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
                取消
              </Button>
            </div>
          ) : (
            <>
              <p>
                {action.kind === 'deactivate'
                  ? '過去的支出與還款會保留。停用後，新支出與還款不能再選用這位同行者。'
                  : '只有未被帳務引用的同行者才能刪除；刪除後會從同行者名單移除。有歷史紀錄請改為停用。'}
              </p>
              <div className="form-actions">
                <Button variant="outline" disabled={busy} onClick={() => setAction(null)}>
                  取消
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => {
                    if (action.kind === 'delete') void remove(action.member);
                    else void changeStatus(action.member, false);
                  }}
                >
                  {action.kind === 'delete' ? '刪除' : '停用'}
                </Button>
              </div>
            </>
          )}
        </FormDialog>
      ) : null}
    </div>
  );
}
