'use client';

import { useI18n } from '@/lib/i18n/I18nProvider';

type LanguageSwitcherProps = {
  className?: string;
  refreshOnChange?: boolean;
};

export default function LanguageSwitcher({ className = '', refreshOnChange = true }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  const buttonClass =
    'px-2 py-1 text-xs rounded border transition-colors';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <span className="text-xs text-slate-500">{t('Language')}</span>
      <button
        type="button"
        className={`${buttonClass} ${locale === 'en' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
        onClick={() => setLocale('en', { refresh: refreshOnChange })}
      >
        EN
      </button>
      <button
        type="button"
        className={`${buttonClass} ${locale === 'es' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
        onClick={() => setLocale('es', { refresh: refreshOnChange })}
      >
        ES
      </button>
    </div>
  );
}
