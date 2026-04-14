export type Locale = 'en' | 'es';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'es'];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE_KEY = 'livo_admin_locale';
export const LOCALE_STORAGE_KEY = 'livo_admin_locale';

export function normalizeLocale(value?: string | null): Locale {
  return value === 'es' ? 'es' : 'en';
}

export function getIntlLocale(locale: Locale): string {
  return locale === 'es' ? 'es-ES' : 'en-US';
}
