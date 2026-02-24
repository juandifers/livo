'use client';

import { useState } from 'react';
import Link from 'next/link';
import { clientFetchJson } from '@/lib/api.client';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await clientFetchJson<{ success: boolean; data?: { message: string }; error?: string }>(
        '/auth/change-password',
        {
          method: 'PUT',
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmNewPassword,
          }),
        }
      );
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change password';
      setError(typeof message === 'string' ? message : 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin" className="text-slate-600 hover:text-slate-900">
          ← Dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-4">Change Password</h1>
      <p className="text-slate-600 mb-6">
        Enter your current password and choose a new one. New password must be at least 6 characters.
      </p>

      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            Password updated successfully.
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Current password"
            required
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="At least 6 characters"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Confirm new password"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? 'Updating...' : 'Update Password'}
          </button>
          <Link
            href="/admin"
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
