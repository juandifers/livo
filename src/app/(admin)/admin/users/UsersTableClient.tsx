'use client';
import { useMemo, useState } from 'react';
import { clientFetchJson } from '@/lib/api.client';

type User = {
  _id: string;
  name?: string;
  lastName?: string;
  email: string;
  role?: string;
  isActive?: boolean;
};

export default function UsersTableClient({ users }: { users: User[] }) {
  const [query, setQuery] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resendingSetupUserId, setResendingSetupUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const fullName = [u.name, u.lastName].filter(Boolean).join(' ').toLowerCase();
      return fullName.includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, query]);

  const handleCreateUser = async () => {
    if (!newUserName || !newUserLastName || !newUserEmail || !newUserPhone) {
      setError('All fields are required');
      return;
    }

    setCreatingUser(true);
    setError(null);

    try {
      await clientFetchJson<{ success: boolean; data: { user: { _id: string }, message: string } }>('/auth/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newUserName,
          lastName: newUserLastName,
          email: newUserEmail,
          phoneNumber: newUserPhone,
          role: 'user'
        })
      });

      alert(`User created. An email has been sent to ${newUserEmail} so they can set their password.`);
      
      // Reset form
      setNewUserName('');
      setNewUserLastName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setShowCreateUser(false);
      
      // Reload page to show new user
      window.location.reload();
    } catch (err: any) {
      setError(err?.message || 'Failed to create user');
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

  const handleAdminResetPassword = async (user: User) => {
    if (!confirm(`Send a password reset email to ${user.email}? They will receive a link to set a new password.`)) {
      return;
    }
    setResettingUserId(user._id);
    setError(null);
    try {
      await clientFetchJson<{ success: boolean; data?: { message: string; email: string }; error?: string }>(
        `/auth/users/${user._id}/reset-password`,
        { method: 'POST' }
      );
      alert(`An email has been sent to ${user.email} so they can set a new password.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(message);
    } finally {
      setResettingUserId(null);
    }
  };

  const handleResendSetupEmail = async (user: User) => {
    if (!confirm(`Resend account setup email to ${user.email}?`)) {
      return;
    }
    setResendingSetupUserId(user._id);
    setError(null);
    try {
      await clientFetchJson<{ success: boolean; data?: { message: string; email: string }; error?: string }>(
        `/auth/users/${user._id}/resend-account-setup`,
        { method: 'POST' }
      );
      alert(`A new account setup email has been sent to ${user.email}.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend setup email';
      setError(message);
    } finally {
      setResendingSetupUserId(null);
    }
  };

  return (
    <div>
      {error && !showCreateUser && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-600 hover:text-red-800 font-medium">Dismiss</button>
        </div>
      )}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="w-full max-w-md border rounded-lg px-3 py-2 bg-white shadow-sm"
          />
          <span className="text-sm text-slate-500">{filtered.length} / {users.length}</span>
        </div>
        <button
          onClick={() => setShowCreateUser(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
        >
          Create User
        </button>
      </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New User</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Enter first name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={newUserLastName}
                  onChange={(e) => setNewUserLastName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Enter last name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Enter phone number"
                />
              </div>
              <p className="text-xs text-gray-500">An email will be sent to the user so they can set their password.</p>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateUser}
                disabled={creatingUser}
                className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {creatingUser ? 'Creating...' : 'Create User'}
              </button>
              <button
                onClick={handleCancelCreateUser}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="overflow-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-[640px] w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u._id} className="border-b last:border-0">
                <td className="p-3 font-medium text-slate-800">{[u.name, u.lastName].filter(Boolean).join(' ') || '—'}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.role || 'user'}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a className="inline-block rounded bg-slate-900 text-white px-3 py-1.5 text-xs hover:bg-slate-800" href={`/admin/users/${u._id}/bookings`}>
                      View bookings
                    </a>
                    <button
                      type="button"
                      onClick={() => handleAdminResetPassword(u)}
                      disabled={resettingUserId === u._id || !u.isActive}
                      className="inline-block rounded border border-slate-400 text-slate-700 px-3 py-1.5 text-xs hover:bg-slate-100 disabled:opacity-50"
                      title={!u.isActive ? 'User has not completed account setup yet' : undefined}
                    >
                      {resettingUserId === u._id ? 'Sending...' : 'Reset password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResendSetupEmail(u)}
                      disabled={resendingSetupUserId === u._id}
                      className="inline-block rounded border border-slate-300 text-slate-700 px-3 py-1.5 text-xs hover:bg-slate-100 disabled:opacity-50"
                    >
                      {resendingSetupUserId === u._id ? 'Sending...' : 'Resend setup'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-500">No matching users</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
