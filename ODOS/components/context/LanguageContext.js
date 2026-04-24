import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from './AuthContext';
import { SUPPORTED_LANGUAGES, TRANSLATIONS } from '../../constants/i18n';

const STORAGE_KEY = 'odos.app.language';

const LanguageContext = createContext(null);

function normalizeLanguage(value) {
  if (!value || typeof value !== 'string') return 'en';
  const lower = value.toLowerCase();
  if (lower.startsWith('tr')) return 'tr';
  if (lower.startsWith('en')) return 'en';
  return 'en';
}

function detectInitialLanguage() {
  try {
    const locale = Intl?.DateTimeFormat?.().resolvedOptions?.().locale;
    return normalizeLanguage(locale);
  } catch {
    return 'en';
  }
}

export function LanguageProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [language, setLanguageState] = useState('en');
  const [isLanguageReady, setIsLanguageReady] = useState(false);

  const setLanguage = useCallback(async (nextLanguage) => {
    const normalized = normalizeLanguage(nextLanguage);
    setLanguageState(normalized);
    await AsyncStorage.setItem(STORAGE_KEY, normalized);
    return normalized;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const selected = stored ? normalizeLanguage(stored) : detectInitialLanguage();
        if (!mounted) return;
        setLanguageState(selected);
        if (!stored) {
          await AsyncStorage.setItem(STORAGE_KEY, selected);
        }
      } finally {
        if (mounted) setIsLanguageReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const pref = normalizeLanguage(user?.preferredLanguage);
    if (!SUPPORTED_LANGUAGES.includes(pref)) return;
    if (pref !== language) {
      setLanguage(pref);
    }
  }, [isAuthenticated, user?.preferredLanguage, language, setLanguage]);

  const t = useCallback((key) => {
    return TRANSLATIONS[language]?.[key]
      ?? TRANSLATIONS.tr?.[key]
      ?? key;
  }, [language]);

  const tx = useCallback((trText, enText) => {
    return language === 'tr' ? trText : enText;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    isLanguageReady,
    t,
    tx,
  }), [language, setLanguage, isLanguageReady, t, tx]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}

