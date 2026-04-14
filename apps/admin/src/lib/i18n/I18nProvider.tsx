'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_LOCALE, LOCALE_COOKIE_KEY, LOCALE_STORAGE_KEY, getIntlLocale, normalizeLocale, type Locale } from './constants';
import { translate } from './index';

type SetLocaleOptions = {
  refresh?: boolean;
};

type I18nContextValue = {
  locale: Locale;
  t: (key: string, params?: Record<string, unknown>) => string;
  setLocale: (locale: Locale, options?: SetLocaleOptions) => void;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
};

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  t: (key) => key,
  setLocale: () => {},
  formatDate: (value, options = {}) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', options).format(date);
  },
});

type I18nProviderProps = {
  children: React.ReactNode;
  initialLocale: Locale;
};

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(normalizeLocale(initialLocale));

  const setLocale = useCallback((nextLocale: Locale, options?: SetLocaleOptions) => {
    const normalized = normalizeLocale(nextLocale);
    setLocaleState(normalized);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
      document.cookie = `${LOCALE_COOKIE_KEY}=${normalized}; path=/; max-age=31536000; samesite=lax`;
    }

    if (options?.refresh) {
      router.refresh();
    }
  }, [router]);

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string, params?: Record<string, unknown>) => translate(locale, key, params);

    const formatDate = (value: Date | string | number, options: Intl.DateTimeFormatOptions = {}) => {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat(getIntlLocale(locale), options).format(date);
    };

    return {
      locale,
      t,
      setLocale,
      formatDate,
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
