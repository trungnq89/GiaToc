import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import viCommon from './locales/vi/common.json';
import enCommon from './locales/en/common.json';

export const SUPPORTED_LANGUAGES = ['vi', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'vi';

const NAMESPACES = ['common'] as const;

void i18next.use(initReactI18next).init({
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: 'common',
  ns: NAMESPACES,
  resources: {
    vi: {
      common: viCommon,
    },
    en: {
      common: enCommon,
    },
  },
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18next;
