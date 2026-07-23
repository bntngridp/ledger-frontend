import React, { createContext, useContext, useState, useEffect } from 'react';
import { en, type TranslationKeys } from '@/constants/translations/en';
import { id } from '@/constants/translations/id';
import { storage } from '@/services/storage';

export type LanguageCode = 'en' | 'id';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (path: string, defaultValue?: string) => string;
}

const translations: Record<LanguageCode, TranslationKeys> = {
  en,
  id,
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: async () => {},
  t: (path) => path,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await storage.getItem('user_language');
        if (savedLang === 'en' || savedLang === 'id') {
          setLanguageState(savedLang);
        }
      } catch (err) {
        console.error('Failed to load saved language preference:', err);
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = async (newLang: LanguageCode) => {
    setLanguageState(newLang);
    try {
      await storage.setItem('user_language', newLang);
    } catch (err) {
      console.error('Failed to save language preference:', err);
    }
  };

  // Translation lookup function supporting nested keys (e.g. "welcome.headline")
  const t = (path: string, defaultValue?: string): string => {
    const keys = path.split('.');
    let current: any = translations[language];

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to English dictionary if key missing in target language
        let fallback: any = translations['en'];
        for (const k of keys) {
          if (fallback && typeof fallback === 'object' && k in fallback) {
            fallback = fallback[k];
          } else {
            return defaultValue || path;
          }
        }
        return typeof fallback === 'string' ? fallback : defaultValue || path;
      }
    }

    return typeof current === 'string' ? current : defaultValue || path;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguageContext = () => useContext(LanguageContext);
