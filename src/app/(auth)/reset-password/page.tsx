'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { clientFetchJson } from '@/lib/api.client';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { mapCommonApiError } from '@/lib/i18n/errorMap';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';

type VerifyResp = {
  success: boolean;
  data?: { valid: boolean; email?: string; userName?: string; expiresAt?: string };
  error?: string;
};

function ResetPasswordContent() {
  const params = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const { t, locale } = useI18n();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function verifyToken() {
      if (!token) {
        if (active) {
          setError(t('Missing token. Request a new password reset email.'));
          setIsVerifying(false);
        }
        return;
      }

      try {
        const res = await clientFetchJson<VerifyResp>(`/auth/reset-password/${encodeURIComponent(token)}/verify`, {
          method: 'GET',
          skipAuth: true
        });

        if (!active) return;
        if (!res.success) {
          setError(mapCommonApiError(locale, res.error || t('Invalid or expired reset link.'), 'Invalid or expired reset link.'));
        } else {
          setVerifiedUser(res.data?.userName || res.data?.email || null);
        }
      } catch (err: any) {
        if (!active) return;
        setError(mapCommonApiError(locale, err?.message || t('Invalid or expired reset link.'), 'Invalid or expired reset link.'));
      } finally {
        if (active) setIsVerifying(false);
      }
    }

    verifyToken();
    return () => {
      active = false;
    };
  }, [token, locale, t]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError(t('Password must be at least 6 characters long.'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('Passwords do not match.'));
      return;
    }

    setIsBusy(true);
    try {
      await clientFetchJson<{ success: boolean; error?: string }>(`/auth/reset-password/${encodeURIComponent(token)}`, {
        method: 'PUT',
        body: JSON.stringify({ password, confirmPassword }),
        skipAuth: true
      });
      setMessage(t('Password reset complete. You can now log in with your new password.'));
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(mapCommonApiError(locale, err?.message || t('Failed to reset password.'), 'Failed to reset password.'));
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
        <h1 className="text-xl font-semibold mb-2">{t('Reset Password')}</h1>
        {verifiedUser && (
          <p className="text-sm text-slate-600 mb-4">{t('Updating password for {{user}}', { user: verifiedUser })}</p>
        )}
        {isVerifying && <p className="text-sm text-slate-600 mb-4">{t('Verifying reset link...')}</p>}

        {!isVerifying && !error && (
          <>
            <label className="block text-sm text-gray-700">{t('New password')}</label>
            <input
              className="mt-1 mb-3 w-full border rounded px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            <label className="block text-sm text-gray-700">{t('Confirm new password')}</label>
            <input
              className="mt-1 mb-4 w-full border rounded px-3 py-2"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
            <button
              type="submit"
              disabled={isBusy}
              className="w-full bg-black text-white rounded py-2 disabled:opacity-60"
            >
              {isBusy ? t('Resetting...') : t('Reset Password')}
            </button>
          </>
        )}

        {message && <p className="text-green-700 text-sm mt-3">{message}</p>}
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <Link href="/login" className="block mt-4 text-sm text-slate-600 hover:text-slate-900">
          {t('Back to login')}
        </Link>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  const { t } = useI18n();
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-slate-600">{t('Loading...')}</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
