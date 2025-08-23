import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import XHR from "i18next-http-backend";
import LanguageDetector from 'i18next-browser-languagedetector';

// Import locale files
import coreEn from './core/renderer/locales/en.json';
import settingsEn from './settings/renderer/locales/en.json';

const resources = {
    en: {
        translation: {
            ...coreEn,
            ...settingsEn,
        },
    },
};

i18n
    .use(XHR)
    .use(initReactI18next)
    .use(LanguageDetector)
    .init({
        resources,
        detection: {
            order: ['querystring', 'navigator'],
            lookupQuerystring: 'lng'
        },
        lng: 'en', // Default language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // React already escapes values
        },
    });

export default i18n;
