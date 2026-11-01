import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Locale, TranslationDictionary } from './types';
import { en } from './locales/en';
import { vi } from './locales/vi';

interface I18nContextType {
  locale: Locale;
  setLocale: (newLocale: Locale) => void;
  toggleLocale: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  dictionary: TranslationDictionary;
}

const dictionaries: Record<Locale, TranslationDictionary> = {
  vi,
  en,
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = 'lora_dashboard_locale';

export function resolveInitialLocale(userDiscordLocale?: string | null): Locale {
  // 1. User manual preference in localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'vi' || saved === 'en') {
      return saved;
    }
  } catch {
    // ignore storage errors
  }

  // 2. Discord Account Locale (from OAuth2 session)
  if (userDiscordLocale) {
    const lower = userDiscordLocale.toLowerCase();
    if (lower.startsWith('en')) return 'en';
    if (lower.startsWith('vi')) return 'vi';
  }

  // 3. Browser locale
  if (typeof navigator !== 'undefined' && navigator.language) {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('en')) return 'en';
    if (browserLang.startsWith('vi')) return 'vi';
  }

  // 4. Fallback default
  return 'vi';
}

interface I18nProviderProps {
  children: ReactNode;
  userDiscordLocale?: string | null;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  userDiscordLocale,
}) => {
  const [locale, setLocaleState] = useState<Locale>(() =>
    resolveInitialLocale(userDiscordLocale),
  );

  // Sync when user logs in and userDiscordLocale becomes available if user has no saved preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved && userDiscordLocale) {
        const resolved = resolveInitialLocale(userDiscordLocale);
        setLocaleState(resolved);
      }
    } catch {
      // ignore
    }
  }, [userDiscordLocale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'vi' ? 'en' : 'vi');
  }, [locale, setLocale]);

  const dictionary = useMemo(() => dictionaries[locale], [locale]);

  /**
   * Helper function to translate path e.g. t('overview.title') with optional params
   */
  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const keys = path.split('.');
      let current: unknown = dictionary;

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = (current as Record<string, unknown>)[k];
        } else {
          // Fallback to Vietnamese dictionary if missing in active dictionary
          let fallbackCurrent: unknown = vi;
          for (const fbKey of keys) {
            if (
              fallbackCurrent &&
              typeof fallbackCurrent === 'object' &&
              fbKey in fallbackCurrent
            ) {
              fallbackCurrent = (fallbackCurrent as Record<string, unknown>)[fbKey];
            } else {
              fallbackCurrent = undefined;
              break;
            }
          }
          current = fallbackCurrent;
          break;
        }
      }

      if (typeof current !== 'string') {
        return path;
      }

      let result = current;
      if (params) {
        for (const [key, val] of Object.entries(params)) {
          result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
        }
      }

      return result;
    },
    [dictionary],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t,
      dictionary,
    }),
    [locale, setLocale, toggleLocale, t, dictionary],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

export type { Locale, TranslationDictionary } from './types';
