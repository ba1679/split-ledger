import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { firstScreenMessages } from './first-screen.js';
import { settlementMessages } from './settlement.js';
import { repaymentStatusMessages } from './repayment-status.js';
import type { InterfaceLanguage } from './types.js';

export const interfaceLanguageKey = 'split-ledger.interface-language';

export function resolveInterfaceLanguage(
  saved: string | null,
  primary: string | undefined,
): InterfaceLanguage {
  if (saved === 'zh-Hant' || saved === 'en') return saved;
  if (primary) {
    try {
      if (new Intl.Locale(primary).language === 'zh') return 'zh-Hant';
    } catch {
      // Ignore malformed language tags from the browser.
    }
  }

  return 'en';
}

export const interfaceI18n = createInstance();

const resources = {
  en: {
    translation: {
      ...firstScreenMessages.en,
      ...settlementMessages.en,
      ...repaymentStatusMessages.en,
      'language.label': 'Language',
    },
  },
  'zh-Hant': {
    translation: {
      ...firstScreenMessages['zh-Hant'],
      ...settlementMessages['zh-Hant'],
      ...repaymentStatusMessages['zh-Hant'],
      'language.label': '語言',
    },
  },
};

export function registerInterfaceMessages(
  scope: string,
  messages: Record<string, readonly [traditionalChinese: string, english: string]>,
): void {
  const translations = {
    en: {} as Record<string, string>,
    'zh-Hant': {} as Record<string, string>,
  };
  for (const [key, [zh, en]] of Object.entries(messages)) {
    translations['zh-Hant'][`${scope}.${key}`] = zh;
    translations.en[`${scope}.${key}`] = en;
  }

  for (const language of ['en', 'zh-Hant'] as const) {
    if (interfaceI18n.isInitialized)
      interfaceI18n.addResourceBundle(language, 'translation', translations[language], true, true);
    else Object.assign(resources[language].translation, translations[language]);
  }
}

export function chooseInterfaceLanguage(language: InterfaceLanguage): void {
  try {
    localStorage.setItem(interfaceLanguageKey, language);
  } catch {
    // The current page can still use the selection when browser storage is unavailable.
  }
  void interfaceI18n.changeLanguage(language);
}

export function initializeInterfaceLanguage(): void {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(interfaceLanguageKey);
  } catch {
    // Browser storage can be unavailable.
  }
  const language = resolveInterfaceLanguage(saved, navigator.languages?.[0] ?? navigator.language);
  const syncDocument = (value: string) => {
    document.documentElement.lang = value;
    document.title = interfaceI18n.t('app.title', { lng: value });
  };
  interfaceI18n.on('languageChanged', syncDocument);
  window.addEventListener('storage', (event) => {
    if (
      event.key === interfaceLanguageKey &&
      (event.newValue === 'en' || event.newValue === 'zh-Hant')
    )
      void interfaceI18n.changeLanguage(event.newValue);
  });
  void interfaceI18n.use(initReactI18next).init({
    lng: language,
    supportedLngs: ['en', 'zh-Hant'],
    fallbackLng: 'en',
    resources,
    initAsync: false,
    keySeparator: false,
    interpolation: { escapeValue: false },
  });
}
