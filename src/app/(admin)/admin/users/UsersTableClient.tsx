'use client';
import { useMemo, useState } from 'react';
import { clientFetchJson } from '@/lib/api.client';

type User = {
  _id: string;
  name?: string;
  lastName?: string;
  email: string;
  role?: string;
};

export default function UsersTableClient({ users }: { users: User[] }) {
  const [query, setQuery] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
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
      const userRes = await clientFetchJson<{ success: boolean; data: { user: { _id: string }, message: string } }>('/auth/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newUserName,
          lastName: newUserLastName,
          email: newUserEmail,
          phoneNumber: newUserPhone,
          role: 'user'
        })
      });

      alert(`User created successfully! Account setup email sent to ${newUserEmail}`);
      
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

  return (
    <div>
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
                  <a className="inline-block rounded bg-slate-900 text-white px-3 py-1.5 text-xs hover:bg-slate-800" href={`/admin/users/${u._id}/bookings`}>
                    View bookings
                  </a>
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


