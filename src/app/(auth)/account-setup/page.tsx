'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { clientFetchJson } from '@/lib/api.client';

type VerifyResp = {
  success: boolean;
  data?: { valid: boolean; email?: string; userName?: string; expiresAt?: string };
  error?: string;
};

function AccountSetupContent() {
  const params = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);

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
          setError('Missing token. Ask an admin to resend your setup email.');
          setIsVerifying(false);
        }
        return;
      }

      try {
        const res = await clientFetchJson<VerifyResp>(`/auth/account-setup/${encodeURIComponent(token)}/verify`, {
          method: 'GET',
          skipAuth: true
        });

        if (!active) return;
        if (!res.success) {
          setError(res.error || 'Invalid or expired setup link.');
        } else {
          setVerifiedUser(res.data?.userName || res.data?.email || null);
        }
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || 'Invalid or expired setup link.');
      } finally {
        if (active) setIsVerifying(false);
      }
    }

    verifyToken();
    return () => {
      active = false;
    };
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsBusy(true);
    try {
      await clientFetchJson<{ success: boolean; error?: string }>(`/auth/account-setup/${encodeURIComponent(token)}`, {
        method: 'POST',
        body: JSON.stringify({ password, confirmPassword }),
        skipAuth: true
      });
      setMessage('Account setup complete. You can now log in.');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err?.message || 'Failed to complete account setup.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white p-6 rounded-lg shadow">
        <h1 className="text-xl font-semibold mb-2">Account Setup</h1>
        {verifiedUser && (
          <p className="text-sm text-slate-600 mb-4">Completing setup for {verifiedUser}</p>
        )}
        {isVerifying && <p className="text-sm text-slate-600 mb-4">Verifying setup link...</p>}

        {!isVerifying && !error && (
          <>
            <label className="block text-sm text-gray-700">Password</label>
            <input
              className="mt-1 mb-3 w-full border rounded px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            <label className="block text-sm text-gray-700">Confirm password</label>
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
              {isBusy ? 'Saving...' : 'Complete Setup'}
            </button>
          </>
        )}

        {message && <p className="text-green-700 text-sm mt-3">{message}</p>}
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <Link href="/login" className="block mt-4 text-sm text-slate-600 hover:text-slate-900">
          Back to login
        </Link>
      </form>
    </div>
  );
}

export default function AccountSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <AccountSetupContent />
    </Suspense>
  );
}
