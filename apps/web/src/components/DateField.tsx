import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { calendarDate, dateOnly, localToday, parseDate, shiftMonth } from './date.js';
import './date-picker.css';

const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

function CalendarIcon() {
  return (
    <svg
      className="icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v5m10-5v5M3 11h18M7 15h2m3 0h2m-7 3h2" />
    </svg>
  );
}

function Arrow({ forward }: { forward?: boolean }) {
  return (
    <svg
      className="icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={forward ? 'm10 7 5 5-5 5' : 'm14 7-5 5 5 5'} />
    </svg>
  );
}

interface PickerProps {
  label: string;
  value: string;
  anchor: React.RefObject<HTMLDivElement | null>;
  opener: HTMLElement | null;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

function positionPicker(dialog: HTMLDialogElement, anchor: HTMLDivElement) {
  if (matchMedia('(max-width: 700px)').matches) {
    dialog.style.removeProperty('left');
    dialog.style.removeProperty('top');

    return;
  }

  const box = anchor.getBoundingClientRect();
  const top =
    box.bottom + 8 + dialog.offsetHeight <= innerHeight - 12
      ? box.bottom + 8
      : box.top - dialog.offsetHeight - 8;

  dialog.style.left = `${Math.max(12, Math.min(box.left, innerWidth - dialog.offsetWidth - 12))}px`;
  dialog.style.top = `${Math.max(12, Math.min(top, innerHeight - dialog.offsetHeight - 12))}px`;
}

function Calendar({ label, value, anchor, opener, onSelect, onClose }: PickerProps) {
  const selected = parseDate(value),
    today = localToday();
  const [focused, setFocused] = useState(() => selected ?? today);
  const [visible, setVisible] = useState(() =>
    calendarDate(focused.getUTCFullYear(), focused.getUTCMonth(), 1),
  );
  const [mode, setMode] = useState<'days' | 'months'>('days');
  const [monthFocus, setMonthFocus] = useState(focused.getUTCMonth());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const focusTarget = useRef('day');
  const outside = useRef(false);
  const headingId = useId();
  const year = visible.getUTCFullYear(),
    month = visible.getUTCMonth();

  useLayoutEffect(() => {
    const dialog = dialogRef.current!;

    dialog.showModal();
    document.body.classList.add('date-picker-open');

    function position() {
      positionPicker(dialog, anchor.current!);
    }

    position();
    window.addEventListener('resize', position);
    document.addEventListener('scroll', position, true);

    return () => {
      window.removeEventListener('resize', position);
      document.removeEventListener('scroll', position, true);
      dialog.close();
      document.body.classList.remove('date-picker-open');
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [anchor, opener]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current!;

    positionPicker(dialog, anchor.current!);
    const target = focusTarget.current;

    dialog
      .querySelector<HTMLButtonElement>(
        target === 'day'
          ? '[data-day][tabindex="0"]'
          : target === 'month'
            ? '[data-month][tabindex="0"]'
            : `[data-focus="${target}"]`,
      )
      ?.focus({ preventScroll: true });
  }, [anchor, focused, visible, mode, monthFocus]);

  function commit(date: Date) {
    onSelect(date);
    onClose();
  }

  function move(step: number) {
    const next = calendarDate(
      year + (mode === 'months' ? step : 0),
      month + (mode === 'days' ? step : 0),
      1,
    );

    if (next.getUTCFullYear() < 1 || next.getUTCFullYear() > 9999) return;

    focusTarget.current = step < 0 ? 'previous' : 'next';
    setVisible(next);
    setFocused(
      calendarDate(
        next.getUTCFullYear(),
        next.getUTCMonth(),
        Math.min(
          focused.getUTCDate(),
          calendarDate(next.getUTCFullYear(), next.getUTCMonth() + 1, 0).getUTCDate(),
        ),
      ),
    );
  }

  function keydown(event: React.KeyboardEvent) {
    const target = event.target as HTMLElement;

    if (event.key === 'Tab') {
      const controls = [
        ...dialogRef.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
      ].filter((button) => button.tabIndex >= 0 && button.getClientRects().length);

      if (event.shiftKey && target === controls[0]) {
        event.preventDefault();
        controls.at(-1)?.focus();
      } else if (!event.shiftKey && target === controls.at(-1)) {
        event.preventDefault();
        controls[0]?.focus();
      }

      return;
    }
    if (
      ![
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
        'PageUp',
        'PageDown',
      ].includes(event.key)
    )
      return;
    if (!target.hasAttribute('data-day') && !target.hasAttribute('data-month')) return;

    event.preventDefault();
    if (mode === 'months') {
      const offset: Record<string, number> = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -3,
        ArrowDown: 3,
      };
      const next =
        event.key === 'Home' ? 0 : event.key === 'End' ? 11 : monthFocus + (offset[event.key] ?? 0);

      if (next >= 0 && next <= 11) {
        focusTarget.current = 'month';
        setMonthFocus(next);
      }

      return;
    }

    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const next =
      event.key === 'PageUp' || event.key === 'PageDown'
        ? shiftMonth(focused, (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1))
        : calendarDate(
            focused.getUTCFullYear(),
            focused.getUTCMonth(),
            focused.getUTCDate() +
              (event.key === 'Home'
                ? -focused.getUTCDay()
                : event.key === 'End'
                  ? 6 - focused.getUTCDay()
                  : offsets[event.key]!),
          );

    if (next.getUTCFullYear() < 1 || next.getUTCFullYear() > 9999) return;

    focusTarget.current = 'day';
    setFocused(next);
    setVisible(calendarDate(next.getUTCFullYear(), next.getUTCMonth(), 1));
  }

  function isOutside(event: React.PointerEvent | React.MouseEvent) {
    const box = dialogRef.current!.getBoundingClientRect();

    return (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    );
  }

  const cellCount =
    Math.max(
      5,
      Math.ceil((visible.getUTCDay() + calendarDate(year, month + 1, 0).getUTCDate()) / 7),
    ) * 7;
  const dates = Array.from({ length: cellCount }, (_, index) =>
    calendarDate(year, month, index - visible.getUTCDay() + 1),
  );

  return createPortal(
    <dialog
      className="date-dialog"
      ref={dialogRef}
      aria-label={`選擇${label}`}
      onKeyDown={keydown}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        outside.current = isOutside(event);
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (outside.current && isOutside(event)) onClose();
      }}
    >
      <div className="date-sheet-handle" aria-hidden="true" />
      <div className="date-sheet-heading">
        <h2>選擇{label}</h2>
        <button type="button" aria-label="關閉日期選擇器" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="calendar-content">
        <div className="calendar-header">
          <button
            type="button"
            className="calendar-title"
            aria-label={mode === 'days' ? '選擇年份與月份' : '返回日期選擇'}
            onClick={() => {
              focusTarget.current = mode === 'days' ? 'month' : 'day';
              setMonthFocus(month);
              setMode(mode === 'days' ? 'months' : 'days');
            }}
          >
            <span id={headingId} aria-live="polite">
              {year} 年{mode === 'days' ? ` ${month + 1} 月` : ''}
            </span>
          </button>
          <div className="calendar-navigation">
            <button
              type="button"
              data-focus="previous"
              aria-label={mode === 'days' ? '上一個月' : '上一年'}
              onClick={() => move(-1)}
              disabled={year === 1 && (mode === 'months' || month === 0)}
            >
              <Arrow />
            </button>
            <button
              type="button"
              data-focus="next"
              aria-label={mode === 'days' ? '下一個月' : '下一年'}
              onClick={() => move(1)}
              disabled={year === 9999 && (mode === 'months' || month === 11)}
            >
              <Arrow forward />
            </button>
          </div>
        </div>
        {mode === 'months' ? (
          <>
            <div className="calendar-months" role="group" aria-label="選擇月份">
              {Array.from({ length: 12 }, (_, index) => (
                <button
                  type="button"
                  key={index}
                  data-month={index}
                  tabIndex={index === monthFocus ? 0 : -1}
                  aria-pressed={index === month}
                  className={index === month ? 'is-selected' : ''}
                  onClick={() => {
                    const next = calendarDate(
                      year,
                      index,
                      Math.min(focused.getUTCDate(), calendarDate(year, index + 1, 0).getUTCDate()),
                    );

                    focusTarget.current = 'day';
                    setVisible(calendarDate(year, index, 1));
                    setFocused(next);
                    setMode('days');
                  }}
                >
                  {index + 1} 月
                </button>
              ))}
            </div>
            <div className="calendar-footer">
              <button
                type="button"
                className="calendar-today"
                onClick={() => {
                  focusTarget.current = 'day';
                  setMode('days');
                }}
              >
                返回日期選擇
              </button>
            </div>
          </>
        ) : (
          <>
            <table role="grid" className="calendar-grid" aria-labelledby={headingId}>
              <thead>
                <tr role="row">
                  {weekdays.map((day) => (
                    <th key={day} scope="col" aria-label={`星期${day}`}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: cellCount / 7 }, (_, row) => (
                  <tr role="row" key={row}>
                    {dates.slice(row * 7, row * 7 + 7).map((date) => {
                      const key = dateOnly(date),
                        isSelected = !!selected && key === dateOnly(selected),
                        isToday = key === dateOnly(today);

                      return (
                        <td role="gridcell" aria-selected={isSelected} key={key}>
                          <button
                            type="button"
                            data-day={key}
                            disabled={date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999}
                            tabIndex={key === dateOnly(focused) ? 0 : -1}
                            aria-current={isToday ? 'date' : undefined}
                            aria-label={`${date.getUTCFullYear()} 年 ${date.getUTCMonth() + 1} 月 ${date.getUTCDate()} 日，星期${weekdays[date.getUTCDay()]}${isToday ? '，今天' : ''}`}
                            className={`calendar-day${date.getUTCMonth() !== month ? ' is-outside' : ''}${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}`}
                            onClick={() => commit(date)}
                          >
                            {date.getUTCDate()}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="calendar-footer">
              <button type="button" className="calendar-today" onClick={() => commit(localToday())}>
                <CalendarIcon />
                回到今天
              </button>
              <span>
                {today.getUTCMonth() + 1} 月 {today.getUTCDate()} 日 · 週
                {weekdays[today.getUTCDay()]}
              </span>
            </div>
          </>
        )}
      </div>
    </dialog>,
    document.body,
  );
}

export function DateField({
  label,
  value,
  onChange,
  optional = false,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  error?: string;
}) {
  const id = useId(),
    fieldRef = useRef<HTMLDivElement>(null),
    inputRef = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false),
    [blurred, setBlurred] = useState(false);
  const invalid = (blurred && value.trim() && !parseDate(value)) || error;

  function show(source: HTMLElement) {
    opener.current = source;
    setOpen(true);
  }

  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {optional ? <span className="optional">選填</span> : null}
      </label>
      <div
        ref={fieldRef}
        className={`date-field${value ? ' has-value' : ''}${open ? ' is-open' : ''}`}
      >
        <input
          id={id}
          ref={inputRef}
          className="date-input"
          aria-label={label}
          value={value}
          placeholder="YYYY/MM/DD"
          autoComplete="off"
          spellCheck={false}
          required={!optional}
          aria-invalid={!!invalid}
          aria-describedby={`${id}-hint ${id}-error`}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            setBlurred(true);
            const parsed = parseDate(value);

            if (parsed) onChange(dateOnly(parsed).replaceAll('-', '/'));
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              show(event.currentTarget);
            }
          }}
        />
        {optional ? (
          <button
            type="button"
            className="date-clear"
            aria-label={`清除${label}`}
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
          >
            ×
          </button>
        ) : null}
        <button
          type="button"
          className="date-toggle"
          aria-label={`選擇${label}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={(event) => show(event.currentTarget)}
        >
          <span>
            <CalendarIcon />
          </span>
        </button>
      </div>
      <span id={`${id}-hint`} className="sr-only">
        以 YYYY/MM/DD 輸入日期，或按向下鍵開啟日曆。
      </span>
      <p id={`${id}-error`} className="error" role="status">
        {error || (invalid ? '請輸入有效日期，例如 2027/03/11。' : '')}
      </p>
      {open ? (
        <Calendar
          label={label}
          value={value}
          anchor={fieldRef}
          opener={opener.current}
          onSelect={(date) => onChange(dateOnly(date).replaceAll('-', '/'))}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
