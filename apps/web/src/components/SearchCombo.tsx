import { useTranslation } from 'react-i18next';
import '../i18n/shared-messages.js';
import { ChevronDown } from 'lucide-react';
import { Input } from '../components/ui/input.js';
import React, { useId, useRef, useState } from 'react';
import { BusyIndicator } from './waiting/BusyIndicator.js';

export interface ComboOption {
  value: string;
  label: string;
  searchText?: string;
}

export function SearchCombo({
  label,
  value,
  options,
  onChange,
  onSelect,
  error,
  optional = false,
  disabled = false,
  pending = false,
}: {
  label: string;
  value: string;
  options: ComboOption[];
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  error?: string;
  optional?: boolean;
  disabled?: boolean;
  pending?: boolean;
}) {
  const { t } = useTranslation();
  const id = useId(),
    root = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState<string | null>(null),
    [active, setActive] = useState(0);
  const filtered =
    search === null
      ? options
      : options.filter((option) =>
          `${option.label} ${option.searchText ?? ''}`.toLowerCase().includes(search.toLowerCase()),
        );
  const selected = options.find((option) => option.value === value);

  function select(option: ComboOption) {
    if (pending || disabled) return;
    onChange(option.value);
    onSelect?.(option.value);
    setSearch(null);
    setOpen(false);
    input.current?.focus();
  }

  function move(step: number) {
    setOpen(true);
    const next = open
      ? (active + step + filtered.length) % Math.max(1, filtered.length)
      : step < 0
        ? Math.max(0, filtered.length - 1)
        : 0;

    setActive(next);
    requestAnimationFrame(() =>
      root.current
        ?.querySelector<HTMLElement>(`[data-option-index="${next}"]`)
        ?.scrollIntoView({ block: 'nearest' }),
    );
  }

  return (
    <div
      className="field"
      role="group"
      aria-label={t('common.options', { label })}
      aria-busy={pending || undefined}
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setSearch(null);
        }
      }}
    >
      <label htmlFor={id}>
        {label}
        {optional ? <span className="optional">{t('common.optional')}</span> : null}
        {pending ? <BusyIndicator accessibleLabel={t('common.loadingOptions', { label })} /> : null}
      </label>
      <div className="combo">
        <Input
          id={id}
          ref={input}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && !pending}
          aria-controls={`${id}-options`}
          aria-activedescendant={
            open && !pending && filtered[active] ? `${id}-option-${active}` : undefined
          }
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          autoComplete="off"
          disabled={disabled}
          readOnly={pending}
          aria-disabled={pending || undefined}
          placeholder={t(
            /^(?:幣別|currency)$/iu.test(label) ? 'common.searchCurrency' : 'common.search',
            { label },
          )}
          value={search ?? selected?.label ?? ''}
          onClick={() => {
            if (pending) return;
            setSearch(null);
            setActive(0);
            setOpen(true);
          }}
          onChange={(event) => {
            if (pending) return;
            setSearch(event.target.value);
            setActive(0);
            setOpen(true);
            onChange('');
          }}
          onKeyDown={(event) => {
            if (pending) {
              if (['Enter', 'ArrowDown', 'ArrowUp'].includes(event.key)) event.preventDefault();

              return;
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              move(event.key === 'ArrowDown' ? 1 : -1);
            } else if (event.key === 'Enter' && open) {
              event.preventDefault();
              if (filtered[active]) select(filtered[active]);
            } else if (event.key === 'Escape' && open) {
              event.preventDefault();
              setOpen(false);
              setSearch(null);
            }
          }}
        />
        <button
          type="button"
          className="combo-toggle"
          aria-label={t('common.expandOptions', { label })}
          aria-expanded={open && !pending}
          aria-controls={`${id}-options`}
          disabled={disabled || pending}
          onClick={() => {
            setSearch(null);
            setActive(0);
            setOpen(!open);
            input.current?.focus();
          }}
        >
          <span>
            <ChevronDown className="icon" size={19} strokeWidth={1.6} aria-hidden="true" />
          </span>
        </button>
        {open && !pending ? (
          <div
            id={`${id}-options`}
            className="options"
            role="listbox"
            aria-label={t('common.options', { label })}
          >
            {filtered.length ? (
              filtered.map((option, index) => (
                <div
                  id={`${id}-option-${index}`}
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  className={`combo-option${index === active ? ' active' : ''}`}
                  data-option-index={index}
                  onPointerMove={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(option)}
                >
                  <span>{option.label}</span>
                  {option.value === value ? <span aria-hidden="true">✓</span> : null}
                </div>
              ))
            ) : (
              <p className="combo-empty">{t('common.noOptions', { label })}</p>
            )}
          </div>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
