import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE_KEY, getIntlLocale, normalizeLocale, type Locale } from './constants';
import { translate } from './index';

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LOCALE_COOKIE_KEY)?.value ?? DEFAULT_LOCALE);
}

export async function getServerI18n() {
  const locale = await getServerLocale();

  const t = (key: string, params?: Record<string, unknown>) => translate(locale, key, params);

  const formatDate = (
    value: Date | string | number,
    options: Intl.DateTimeFormatOptions = {}
  ) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(getIntlLocale(locale), options).format(date);
  };

  return {
    locale,
    t,
    formatDate,
  };
}
