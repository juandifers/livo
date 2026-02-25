// src/app/(auth)/login/page.tsx
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { clientFetchJson } from '@/lib/api.client';
import { setToken } from '@/lib/auth';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { mapCommonApiError } from '@/lib/i18n/errorMap';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirect = sp.get('redirect') || '/admin';
  const { t, locale } = useI18n();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsBusy(true);
    setError(null);
    try {
      const res = await clientFetchJson<{ success: boolean; data?: { token: string } | null; token?: string; error?: string }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
          skipAuth: true,
        }
      );

      const token = res.data?.token || res.token;
      if (!res.success || !token) {
        throw new Error(res.error || t('Login failed'));
      }

      setToken(token);
      router.replace(redirect);
      router.refresh();
    } catch (err: any) {
      setError(mapCommonApiError(locale, err?.message || 'Login failed', 'Login failed'));
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
        <h1 className="text-xl font-semibold mb-4">{t('Admin Login')}</h1>
        <label className="block text-sm text-gray-700">{t('Email')}</label>
        <input
          className="mt-1 mb-3 w-full border rounded px-3 py-2"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label className="block text-sm text-gray-700">{t('Password')}</label>
        <input
          className="mt-1 mb-4 w-full border rounded px-3 py-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={isBusy}
          className="w-full bg-black text-white rounded py-2 disabled:opacity-60"
        >
          {isBusy ? t('Signing in…') : t('Sign In')}
        </button>
        <Link href="/forgot-password" className="block mt-4 text-sm text-slate-600 hover:text-slate-900">
          {t('Forgot password?')}
        </Link>
      </form>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useI18n();
  return (
    <Suspense fallback={<div>{t('Loading...')}</div>}>
      <LoginForm />
    </Suspense>
  );
}
