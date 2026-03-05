import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format as formatDateFns } from 'date-fns';
import { enUS, es as esDateFns } from 'date-fns/locale';
import en from './translations/en';
import es from './translations/es';
import { mapCommonApiError } from './errorMap';

export const LOCALE_STORAGE_KEY = 'livo_mobile_locale';
export const SUPPORTED_LOCALES = ['en', 'es'];
export const DEFAULT_LOCALE = 'en';

const dictionaries = {
  en,
  es,
};

const dateFnsLocale = {
  en: enUS,
  es: esDateFns,
};

const intlLocale = {
  en: 'en-US',
  es: 'es-ES',
};

const weekdayShortMap = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  es: ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'],
};

let activeLocale = DEFAULT_LOCALE;

function normalizeLocale(value) {
  return value === 'es' ? 'es' : 'en';
}

function interpolate(template, params = {}) {
  if (!template || typeof template !== 'string') return '';
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    const value = params[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

function translateValue(locale, key, params) {
  const localized = dictionaries[locale]?.[key] ?? dictionaries.en?.[key] ?? key;
  return interpolate(localized, params);
}

export function translateGlobal(key, params) {
  return translateValue(activeLocale, key, params);
}

export function getActiveLocale() {
  return activeLocale;
}

const I18nContext = createContext({
  ready: false,
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key, params) => interpolate(key, params),
  formatDate: (value, formatStr = 'dd MMM, yyyy') => {
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return formatDateFns(parsed, formatStr, { locale: enUS });
  },
  formatDateByOptions: (value, options = {}) => {
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', options).format(parsed);
  },
  weekdaysShort: weekdayShortMap.en,
  mapApiError: (message) => message,
});

export function I18nProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);

  useEffect(() => {
    let mounted = true;

    const loadLocale = async () => {
      try {
        const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
        if (!mounted) return;
        setLocaleState(normalizeLocale(stored));
      } catch (error) {
        console.warn('Unable to load locale preference:', error?.message || error);
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    };

    loadLocale();

    return () => {
      mounted = false;
    };
  }, []);

  const setLocale = async (nextLocale) => {
    const normalized = normalizeLocale(nextLocale);
    activeLocale = normalized;
    setLocaleState(normalized);

    try {
      await AsyncStorage.setItem(LOCALE_STORAGE_KEY, normalized);
    } catch (error) {
      console.warn('Unable to persist locale preference:', error?.message || error);
    }
  };

  const value = useMemo(() => {
    activeLocale = locale;
    const t = (key, params) => translateValue(locale, key, params);

    const formatDate = (dateValue, formatStr = 'dd MMM, yyyy') => {
      const parsed = dateValue instanceof Date ? dateValue : new Date(dateValue);
      if (Number.isNaN(parsed.getTime())) return '';
      return formatDateFns(parsed, formatStr, { locale: dateFnsLocale[locale] || enUS });
    };

    const formatDateByOptions = (dateValue, options = {}) => {
      const parsed = dateValue instanceof Date ? dateValue : new Date(dateValue);
      if (Number.isNaN(parsed.getTime())) return '';
      return new Intl.DateTimeFormat(intlLocale[locale] || 'en-US', options).format(parsed);
    };

    const mapApiError = (message, fallbackKey = 'An unexpected error occurred') =>
      mapCommonApiError(message, t, fallbackKey);

    return {
      ready,
      locale,
      setLocale,
      t,
      formatDate,
      formatDateByOptions,
      weekdaysShort: weekdayShortMap[locale] || weekdayShortMap.en,
      mapApiError,
    };
  }, [ready, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function withLocaleFallback(inputLocale) {
  return normalizeLocale(inputLocale);
}
