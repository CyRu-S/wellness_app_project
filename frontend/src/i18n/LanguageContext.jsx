import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../services/storage/asyncStorage';
import { translate } from './translations';

const STORAGE_KEY = 'mr-care.language';
const LanguageContext = createContext(null);
let activeLanguage = 'en';

export const getActiveLanguage = () => activeLanguage;

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');

  useEffect(() => { activeLanguage = language; }, [language]);

  useEffect(() => {
    let active = true;
    storage.get(STORAGE_KEY).then((saved) => {
      if (active && (saved === 'en' || saved === 'te')) setLanguageState(saved);
    });
    return () => { active = false; };
  }, []);

  const setLanguage = useCallback((nextLanguage) => {
    const next = nextLanguage === 'te' ? 'te' : 'en';
    setLanguageState(next);
    storage.set(STORAGE_KEY, next);
  }, []);
  const t = useCallback((key, values) => translate(language, key, values), [language]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider');
  return value;
}
