import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { storage } from '@/services/storage';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ActiveTheme = 'light' | 'dark';

interface ThemeContextType {
  themePreference: ThemePreference;
  activeTheme: ActiveTheme;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useRNColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [hasHydrated, setHasHydrated] = useState(false);

  // Load user theme preference on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedPref = await storage.getItem('theme_preference');
        if (savedPref === 'light' || savedPref === 'dark' || savedPref === 'system') {
          setThemePreferenceState(savedPref);
        }
      } catch (err) {
        console.error('Failed to load theme preference:', err);
      } finally {
        setHasHydrated(true);
      }
    };
    loadThemePreference();
  }, []);

  // Determine active theme based on preference and system theme
  const activeTheme: ActiveTheme = (() => {
    if (!hasHydrated) return 'light'; // Default fallback during hydration
    if (themePreference === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themePreference;
  })();

  const setThemePreference = async (pref: ThemePreference) => {
    try {
      setThemePreferenceState(pref);
      await storage.setItem('theme_preference', pref);
    } catch (err) {
      console.error('Failed to save theme preference:', err);
    }
  };

  return (
    <ThemeContext.Provider value={{ themePreference, activeTheme, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}
