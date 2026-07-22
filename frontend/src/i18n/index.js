import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import te from './locales/te.json'
import ta from './locales/ta.json'
import hi from './locales/hi.json'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'hi', label: 'हिन्दी' },
]

const STORAGE_KEY = 'ktw_language'

i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    te: { translation: te },
    ta: { translation: ta },
    hi: { translation: hi },
  },
  lng: localStorage.getItem(STORAGE_KEY) || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

i18next.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng)
})

export default i18next
