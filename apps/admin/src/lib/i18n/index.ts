import en from './translations/en';
import es from './translations/es';
import type { Locale } from './constants';

const dictionaries: Record<Locale, Record<string, string>> = {
  en,
  es,
};

export function interpolate(template: string, params?: Record<string, unknown>) {
  if (!params) return template;
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    const value = params[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

export function translate(locale: Locale, key: string, params?: Record<string, unknown>) {
  const value = dictionaries[locale]?.[key] ?? dictionaries.en?.[key] ?? key;
  return interpolate(value, params);
}
