export type InterfaceLanguage = 'zh-Hant' | 'en';

export type LocalizedMessages<Messages> = Readonly<Record<InterfaceLanguage, Messages>>;
