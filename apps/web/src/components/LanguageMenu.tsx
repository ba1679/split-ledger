import React, { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button.js';
import { chooseInterfaceLanguage } from '../i18n/runtime.js';

const languages = [
  { value: 'zh-Hant', label: '繁體中文' },
  { value: 'en', label: 'English' },
] as const;

export function LanguageMenu({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = i18n.resolvedLanguage === 'zh-Hant' ? languages[0] : languages[1];
  const label = t('language.label');

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus({
      preventScroll: true,
    });

    function dismiss(event: PointerEvent) {
      if (!anchor.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener('pointerdown', dismiss);

    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  function closeAndFocusTrigger() {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }

  return (
    <div
      className={`language-menu ${className}`}
      ref={anchor}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget))
          setOpen(false);
      }}
      onKeyDown={(event) => {
        if (!open || event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        closeAndFocusTrigger();
      }}
    >
      <Button
        ref={trigger}
        variant="outline"
        type="button"
        className="language-menu-trigger"
        aria-label={`${label}: ${selected.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          setOpen(true);
        }}
      >
        <Languages aria-hidden="true" size={16} />
        <span lang={selected.value}>{selected.label}</span>
        <ChevronDown className="language-menu-chevron" aria-hidden="true" size={16} />
      </Button>
      {open ? (
        <div
          className="language-menu-options"
          id={menuId}
          ref={menu}
          role="menu"
          aria-label={label}
          onKeyDown={(event) => {
            const choices = Array.from(event.currentTarget.querySelectorAll('button'));
            const current = choices.indexOf(document.activeElement as HTMLButtonElement);
            const last = choices.length - 1;
            const next = {
              ArrowDown: (current + 1) % choices.length,
              ArrowUp: (current + last) % choices.length,
              Home: 0,
              End: last,
            }[event.key];
            if (next === undefined) return;
            event.preventDefault();
            choices[next]?.focus({ preventScroll: true });
          }}
        >
          {languages.map((language) => (
            <button
              key={language.value}
              type="button"
              role="menuitemradio"
              aria-checked={language === selected}
              tabIndex={-1}
              onClick={() => {
                chooseInterfaceLanguage(language.value);
                closeAndFocusTrigger();
              }}
            >
              <span lang={language.value}>{language.label}</span>
              {language === selected ? <Check aria-hidden="true" size={16} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MobileLanguageBar({ children }: { children?: ReactNode }) {
  return (
    <div
      className={
        children ? 'mobile-language-bar' : 'mobile-language-bar mobile-language-bar-fallback'
      }
    >
      {children}
      <LanguageMenu className="mobile-language-control" />
    </div>
  );
}
