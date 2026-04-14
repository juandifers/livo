'use client';

import { useState } from 'react';
import Link from 'next/link';
import { clientFetchJson } from '@/lib/api.client';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { mapCommonApiError } from '@/lib/i18n/errorMap';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';

export default function ForgotPasswordPage() {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsBusy(true);
    setMessage(null);
    setError(null);

    try {
      const res = await clientFetchJson<{ success: boolean; data?: string; error?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
        skipAuth: true
      });

      setMessage(res.data || t('If an account with that email exists, a password reset email has been sent.'));
    } catch (err: any) {
      setError(mapCommonApiError(locale, err?.message || 'Failed to send password reset email', 'Failed to send password reset email'));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white p-6 rounded-lg shadow">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <h1 className="text-xl font-semibold mb-2">{t('Forgot Password')}</h1>
        <p className="text-sm text-slate-600 mb-4">
          {t('Enter your email and we will send you a password reset link.')}
        </p>

        <label className="block text-sm text-gray-700">{t('Email')}</label>
        <input
          className="mt-1 mb-4 w-full border rounded px-3 py-2"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {message && <p className="text-green-700 text-sm mb-3">{message}</p>}
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <button
          type="submit"
          disabled={isBusy}
          className="w-full bg-black text-white rounded py-2 disabled:opacity-60"
        >
          {isBusy ? t('Sending...') : t('Send Reset Link')}
        </button>

        <Link href="/login" className="block mt-4 text-sm text-slate-600 hover:text-slate-900">
          {t('Back to login')}
        </Link>
      </form>
    </div>
  );
}
