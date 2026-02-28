import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import frBe from './locales/fr-be.json';
import nlBe from './locales/nl-be.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      'fr-be': { translation: frBe },
      'nl-be': { translation: nlBe },
    },
    supportedLngs: ['en', 'fr-be', 'nl-be'],
    fallbackLng: 'en',
    lowerCaseLng: true,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
