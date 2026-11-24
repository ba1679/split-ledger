import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  initializeInterfaceLanguage,
  interfaceI18n,
  registerInterfaceMessages,
  resolveInterfaceLanguage,
} from '../../src/i18n/runtime.js';
import { localizeApiError } from '../../src/i18n/api-errors.js';
import '../../src/i18n/shared-messages.js';

afterEach(() => vi.unstubAllGlobals());

describe('interface language', () => {
  it.each([
    [null, 'zh-Hant-TW', 'zh-Hant'],
    [null, 'zh-CN', 'zh-Hant'],
    [null, 'ja', 'en'],
    [null, 'zh__TW', 'en'],
    [null, undefined, 'en'],
    ['zh-TW', 'en-US', 'en'],
    ['zh-Hant', 'ja', 'zh-Hant'],
    ['en', 'zh-TW', 'en'],
  ] as const)('resolves saved %s and browser primary %s as %s', (saved, primary, expected) => {
    expect(resolveInterfaceLanguage(saved, primary)).toBe(expected);
  });

  it('initializes before display and accepts bundled feature translations loaded later', () => {
    const document = { documentElement: { lang: '' }, title: '' };
    const getItem = vi.fn(() => {
      throw new Error('Storage blocked');
    });
    vi.stubGlobal('document', document);
    vi.stubGlobal('localStorage', { getItem });
    vi.stubGlobal('navigator', { language: 'ja', languages: ['ja', 'zh-TW'] });

    initializeInterfaceLanguage();
    expect(document).toEqual({ documentElement: { lang: 'en' }, title: 'Travel Ledger' });
    registerInterfaceMessages('lateFeature', { example: ['項目：{{name}}', 'Item: {{name}}'] });
    expect(interfaceI18n.t('lateFeature.example', { name: '晚餐先代墊' })).toBe('Item: 晚餐先代墊');
    expect(localizeApiError('VALIDATION_ERROR', 'item', '伺服器原文')).toBe(
      'Enter an expense item.',
    );
    expect(localizeApiError('UNRECOGNIZED_CODE', undefined, '伺服器原文')).toBe(
      'Could not complete the request. Please try again.',
    );

    const en = interfaceI18n.getResourceBundle('en', 'translation');
    const zh = interfaceI18n.getResourceBundle('zh-Hant', 'translation');
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort());
    for (const [key, phrase] of Object.entries(en)) {
      const names = (value: string) =>
        Array.from(value.matchAll(/\{\{(\w+)\}\}/gu), ([, name]) => name).sort();
      expect(names(phrase as string), key).toEqual(names(zh[key]));
    }
  });
});
