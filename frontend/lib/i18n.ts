import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import translations
import nlTranslations from "./locales/nl.json";
import enTranslations from "./locales/en.json";

const resources = {
  nl: {
    translation: nlTranslations,
  },
  en: {
    translation: enTranslations,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "nl", // default language
  fallbackLng: "nl",
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  detection: {
    order: ["localStorage", "navigator"],
    caches: ["localStorage"],
  },
});

export default i18n;
