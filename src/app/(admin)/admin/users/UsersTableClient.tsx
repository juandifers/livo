'use client';

import { useMemo, useState } from 'react';
import { clientFetchJson } from '@/lib/api.client';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { mapCommonApiError } from '@/lib/i18n/errorMap';
import TwoStepConfirmModal from '@/components/admin/TwoStepConfirmModal';

type User = {
  _id: string;
  name?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  role?: string;
  isActive?: boolean;
  communicationPreferences?: {
    phone?: boolean;
    email?: boolean;
  };
};

type CreateUserResp = {
  success: boolean;
  data?: {
    user?: {
      _id?: string;
      id?: string;
      name?: string;
      lastName?: string;
      email?: string;
      phoneNumber?: string;
      role?: string;
      isActive?: boolean;
      communicationPreferences?: {
        phone?: boolean;
        email?: boolean;
      };
    };
    message?: string;
  };
};

function fullName(user: User) {
  return [user.name, user.lastName].filter(Boolean).join(' ') || '—';
}

export default function UsersTableClient({ users }: { users: User[] }) {
  const { t, locale } = useI18n();

  const [query, setQuery] = useState('');
  const [userRows, setUserRows] = useState<User[]>(users || []);

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loadingEditUser, setLoadingEditUser] = useState(false);

  const [confirmResetUser, setConfirmResetUser] = useState<User | null>(null);
  const [confirmResendUser, setConfirmResendUser] = useState<User | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<User | null>(null);

  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resendingSetupUserId, setResendingSetupUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return userRows;
    return userRows.filter((u) => {
      const name = fullName(u).toLowerCase();
      const email = (u.email || '').toLowerCase();
      const phone = (u.phoneNumber || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [userRows, query]);

  const handleCreateUser = async () => {
    if (!newUserName || !newUserLastName || !newUserEmail || !newUserPhone) {
      setError(t('All fields are required'));
      return;
    }

    setCreatingUser(true);
    setError(null);
    setMessage(null);

    try {
      const res = await clientFetchJson<CreateUserResp>('/auth/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newUserName,
          lastName: newUserLastName,
          email: newUserEmail,
          phoneNumber: newUserPhone,
          role: 'user',
        }),
      });

      const createdUser = res?.data?.user;
      const createdId = createdUser?._id || createdUser?.id;
      if (createdUser && createdId) {
        const normalized: User = {
          _id: createdId,
          name: createdUser.name,
          lastName: createdUser.lastName,
          email: createdUser.email || newUserEmail,
          phoneNumber: createdUser.phoneNumber || newUserPhone,
          role: createdUser.role,
          isActive: createdUser.isActive,
          communicationPreferences: createdUser.communicationPreferences,
        };

        setUserRows((prev) => {
          const existingIdx = prev.findIndex((u) => u._id === normalized._id);
          if (existingIdx >= 0) {
            const next = [...prev];
            next[existingIdx] = { ...next[existingIdx], ...normalized };
            return next;
          }
          return [...prev, normalized];
        });
      }

      setMessage(
        res?.data?.message ||
          t('User created. An email has been sent to {{email}} so they can set their password.', {
            email: newUserEmail,
          })
      );

      setNewUserName('');
      setNewUserLastName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setShowCreateUser(false);
    } catch (err: any) {
      setError(mapCommonApiError(locale, err?.message || 'Failed to create user', 'Error'));
    } finally {
      setCreatingUser(false);
    }
  };

  const handleCancelCreateUser = () => {
    setShowCreateUser(false);
    setNewUserName('');
    setNewUserLastName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setError(null);
  };

  const openEditUserModal = async (user: User) => {
    setEditingUser(user);
    setLoadingEditUser(true);
    setError(null);
    setMessage(null);

    try {
      const res = await clientFetchJson<{ success: boolean; data: User }>(`/users/${user._id}`);
      if (res?.data) {
        const refreshed = {
          ...user,
          ...res.data,
          _id: res.data._id || user._id,
        };
        setEditingUser(refreshed);
        setUserRows((prev) => prev.map((u) => (u._id === refreshed._id ? { ...u, ...refreshed } : u)));
      }
    } catch {
      // Keep existing row data if detail fetch fails
    } finally {
      setLoadingEditUser(false);
    }
  };

  const performAdminResetPassword = async (user: User) => {
    setResettingUserId(user._id);
    setError(null);
    setMessage(null);

    try {
      await clientFetchJson<{ success: boolean; data?: { message: string; email: string }; error?: string }>(
        `/auth/users/${user._id}/reset-password`,
        { method: 'POST' }
      );
      setMessage(t('An email has been sent to {{email}} so they can set a new password.', { email: user.email }));
      setConfirmResetUser(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('Failed to send reset email');
      setError(mapCommonApiError(locale, msg, 'Error'));
    } finally {
      setResettingUserId(null);
    }
  };

  const performResendSetupEmail = async (user: User) => {
    setResendingSetupUserId(user._id);
    setError(null);
    setMessage(null);

    try {
      await clientFetchJson<{ success: boolean; data?: { message: string; email: string }; error?: string }>(
        `/auth/users/${user._id}/resend-account-setup`,
        { method: 'POST' }
      );
      setMessage(t('A new account setup email has been sent to {{email}}.', { email: user.email }));
      setConfirmResendUser(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('Failed to resend setup email');
      setError(mapCommonApiError(locale, msg, 'Error'));
    } finally {
      setResendingSetupUserId(null);
    }
  };

  const performDeleteUser = async (user: User) => {
    setDeletingUserId(user._id);
    setError(null);
    setMessage(null);

    try {
      await clientFetchJson<{ success: boolean; data: object }>(`/users/${user._id}`, { method: 'DELETE' });
      setUserRows((prev) => prev.filter((u) => u._id !== user._id));
      setMessage(t('User {{email}} deleted successfully.', { email: user.email }));
      setConfirmDeleteUser(null);
      if (editingUser?._id === user._id) {
        setEditingUser(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('Failed to delete user');
      setError(mapCommonApiError(locale, msg, 'Error'));
    } finally {
      setDeletingUserId(null);
    }
  };

  const resetPending = !!(confirmResetUser && resettingUserId === confirmResetUser._id);
  const resendPending = !!(confirmResendUser && resendingSetupUserId === confirmResendUser._id);
  const deletePending = !!(confirmDeleteUser && deletingUserId === confirmDeleteUser._id);

  return (
    <div>
      {error && !showCreateUser && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 font-medium"
          >
            {t('Dismiss')}
          </button>
        </div>
      )}

      {message && !showCreateUser && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center justify-between">
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-medium"
          >
            {t('Dismiss')}
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Search by name, email, or phone')}
            className="w-full max-w-md border rounded-lg px-3 py-2 bg-white shadow-sm"
          />
          <span className="text-sm text-slate-500">
            {filtered.length} / {userRows.length}
          </span>
        </div>
        <button
          onClick={() => setShowCreateUser(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
        >
          {t('Create User')}
        </button>
      </div>

      {showCreateUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">{t('Create New User')}</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('First Name')}</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder={t('Enter first name')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Last Name')}</label>
                <input
                  type="text"
                  value={newUserLastName}
                  onChange={(e) => setNewUserLastName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder={t('Enter last name')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Email')}</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder={t('Enter email address')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Phone Number')}</label>
                <input
                  type="tel"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder={t('Enter phone number')}
                />
              </div>
              <p className="text-xs text-gray-500">
                {t('An email will be sent to the user so they can set their password.')}
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateUser}
                disabled={creatingUser}
                className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {creatingUser ? t('Creating...') : t('Create User')}
              </button>
              <button
                onClick={handleCancelCreateUser}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                {t('Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-xl shadow-2xl border w-full max-w-2xl p-6">
            <div className="flex items-start justify-between mb-4 gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{t('Edit User')}</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {t('Contact information shown here is managed by the user in the mobile app under Settings > Profile.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setConfirmResetUser(null);
                  setConfirmResendUser(null);
                  setConfirmDeleteUser(null);
                }}
                className="px-3 py-1.5 text-sm rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                {t('Close')}
              </button>
            </div>

            {loadingEditUser ? (
              <div className="text-sm text-slate-600 mb-4">{t('Loading user details...')}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                <div className="rounded-lg border bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">{t('Name')}</div>
                  <div className="text-sm font-medium text-slate-900">{fullName(editingUser)}</div>
                </div>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">{t('Email')}</div>
                  <div className="text-sm font-medium text-slate-900 break-all">{editingUser.email || '—'}</div>
                </div>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">{t('Phone Number')}</div>
                  <div className="text-sm font-medium text-slate-900">{editingUser.phoneNumber || t('Not provided')}</div>
                </div>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">{t('Status')}</div>
                  <div className="text-sm font-medium text-slate-900">
                    {editingUser.isActive ? t('Active') : t('Pending setup')}
                  </div>
                </div>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">{t('Role')}</div>
                  <div className="text-sm font-medium text-slate-900">{editingUser.role || 'user'}</div>
                </div>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">{t('Preferred contact')}</div>
                  <div className="text-sm font-medium text-slate-900">
                    {editingUser.communicationPreferences
                      ? [
                          editingUser.communicationPreferences.phone ? t('Phone') : null,
                          editingUser.communicationPreferences.email ? t('Email') : null,
                        ]
                          .filter(Boolean)
                          .join(', ') || t('Not set')
                      : t('Not set')}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setConfirmResetUser(editingUser)}
                disabled={!editingUser.isActive || resettingUserId === editingUser._id}
                className="rounded border border-slate-400 text-slate-700 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50"
                title={!editingUser.isActive ? t('User has not completed account setup yet') : undefined}
              >
                {resettingUserId === editingUser._id ? t('Sending...') : t('Reset password')}
              </button>

              <button
                type="button"
                onClick={() => setConfirmResendUser(editingUser)}
                disabled={resendingSetupUserId === editingUser._id}
                className="rounded border border-slate-300 text-slate-700 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50"
              >
                {resendingSetupUserId === editingUser._id ? t('Sending...') : t('Resend setup email')}
              </button>

              <button
                type="button"
                onClick={() => setConfirmDeleteUser(editingUser)}
                disabled={deletingUserId === editingUser._id}
                className="rounded border border-red-300 text-red-700 px-3 py-1.5 text-sm hover:bg-red-50 disabled:opacity-50"
              >
                {deletingUserId === editingUser._id ? t('Deleting...') : t('Delete user')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-3">{t('Name')}</th>
              <th className="text-left p-3">{t('Email')}</th>
              <th className="text-left p-3">{t('Role')}</th>
              <th className="text-left p-3">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u._id} className="border-b last:border-0">
                <td className="p-3 font-medium text-slate-800">{fullName(u)}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.role || 'user'}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      className="inline-block rounded bg-slate-900 text-white px-3 py-1.5 text-xs hover:bg-slate-800"
                      href={`/admin/users/${u._id}/bookings`}
                    >
                      {t('View bookings')}
                    </a>
                    <button
                      type="button"
                      onClick={() => openEditUserModal(u)}
                      className="inline-block rounded border border-slate-300 text-slate-700 px-3 py-1.5 text-xs hover:bg-slate-100"
                    >
                      {t('Edit')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-500">
                  {t('No matching users')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TwoStepConfirmModal
        open={!!confirmResetUser}
        title={t('Send password reset email?')}
        description={t('The user will receive a reset link to choose a new password.')}
        details={
          confirmResetUser
            ? [
                { label: t('Name'), value: fullName(confirmResetUser) },
                { label: t('Email'), value: confirmResetUser.email },
              ]
            : []
        }
        keywordPrompt={t('Please review this action, then confirm sending the reset email.')}
        cancelLabel={t('Cancel')}
        continueLabel={t('Continue')}
        backLabel={t('Back')}
        confirmLabel={t('Send reset email')}
        pendingLabel={t('Sending...')}
        pending={resetPending}
        onCancel={() => {
          if (!resetPending) setConfirmResetUser(null);
        }}
        onConfirm={() => {
          if (confirmResetUser) {
            void performAdminResetPassword(confirmResetUser);
          }
        }}
      />

      <TwoStepConfirmModal
        open={!!confirmResendUser}
        title={t('Resend account setup email?')}
        description={t('The user will receive a new account setup link by email.')}
        details={
          confirmResendUser
            ? [
                { label: t('Name'), value: fullName(confirmResendUser) },
                { label: t('Email'), value: confirmResendUser.email },
              ]
            : []
        }
        keywordPrompt={t('Please review this action, then confirm resending setup email.')}
        cancelLabel={t('Cancel')}
        continueLabel={t('Continue')}
        backLabel={t('Back')}
        confirmLabel={t('Resend setup email')}
        pendingLabel={t('Sending...')}
        pending={resendPending}
        onCancel={() => {
          if (!resendPending) setConfirmResendUser(null);
        }}
        onConfirm={() => {
          if (confirmResendUser) {
            void performResendSetupEmail(confirmResendUser);
          }
        }}
      />

      <TwoStepConfirmModal
        open={!!confirmDeleteUser}
        title={t('Delete this user?')}
        description={t('This permanently removes the user account.')}
        details={
          confirmDeleteUser
            ? [
                { label: t('Name'), value: fullName(confirmDeleteUser) },
                { label: t('Email'), value: confirmDeleteUser.email },
                { label: t('Phone Number'), value: confirmDeleteUser.phoneNumber || t('Not provided') },
              ]
            : []
        }
        keyword="DELETE"
        keywordPrompt={t('Type DELETE to permanently delete this user.')}
        cancelLabel={t('Keep user')}
        continueLabel={t('Continue')}
        backLabel={t('Back')}
        confirmLabel={t('Delete user')}
        pendingLabel={t('Deleting...')}
        pending={deletePending}
        danger
        onCancel={() => {
          if (!deletePending) setConfirmDeleteUser(null);
        }}
        onConfirm={() => {
          if (confirmDeleteUser) {
            void performDeleteUser(confirmDeleteUser);
          }
        }}
      />
    </div>
  );
}


