export const SUPPORTED_LANGUAGES = ['zh-CN', 'en', 'id', 'pt-BR', 'es-MX'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh-CN';

export const LANGUAGE_PREFIX_PATTERN = /^\/(zh-CN|en|id|pt-BR|es-MX)(\/|$)/;

export const LANGUAGE_OPTIONS: Array<{
  key: SupportedLanguage;
  flag: string;
  label: string;
}> = [
  { key: 'zh-CN', flag: '🇨🇳', label: '简体中文' },
  { key: 'en', flag: '🇺🇸', label: 'English' },
  { key: 'id', flag: '🇮🇩', label: 'Bahasa Indonesia' },
  { key: 'pt-BR', flag: '🇧🇷', label: 'Português (Brasil)' },
  { key: 'es-MX', flag: '🇲🇽', label: 'Español (México)' },
];

export const isSupportedLanguage = (lang?: string): lang is SupportedLanguage =>
  Boolean(lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage));
