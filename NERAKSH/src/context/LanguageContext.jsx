import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LANGUAGES, translate } from '../i18n';

const LanguageContext = createContext();

const STORAGE_KEY = 'neraksh_language';

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && LANGUAGES.some(l => l.code === saved)) {
        return saved;
      }
    } catch (e) {
      console.warn('localStorage access failed:', e);
    }
    return 'en';
  });

  const setLanguage = useCallback((newLang) => {
    if (LANGUAGES.some(l => l.code === newLang)) {
      setLanguageState(newLang);
      try {
        localStorage.setItem(STORAGE_KEY, newLang);
      } catch (e) {
        console.warn('localStorage save failed:', e);
      }
    }
  }, []);

  const t = useCallback((key, params) => {
    return translate(language, key, params);
  }, [language]);

  /**
   * Helper to translate backend severity values ('Low', 'Moderate', 'High', 'Critical')
   */
  const getSeverityLabel = useCallback((severity) => {
    if (!severity) return '';
    const key = `severity.${severity.toLowerCase()}`;
    return translate(language, key) || severity;
  }, [language]);

  const value = {
    language,
    setLanguage,
    t,
    getSeverityLabel,
    languages: LANGUAGES,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
