import type { ComboOption } from '../components/SearchCombo.js';

const names = {
  en: new Intl.DisplayNames('en', { type: 'currency', fallback: 'none' }),
  'zh-Hant': new Intl.DisplayNames('zh-TW', { type: 'currency', fallback: 'none' }),
};

export function currencyOption(
  currency: { code: string; name: string },
  language: string | undefined,
): ComboOption {
  const locale = language === 'en' ? 'en' : 'zh-Hant';
  const name = names[locale].of(currency.code) ?? currency.name;

  return { value: currency.code, label: `${currency.code} · ${name}`, searchText: currency.name };
}
