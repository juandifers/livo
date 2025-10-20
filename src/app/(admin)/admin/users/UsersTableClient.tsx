'use client';
import { useMemo, useState } from 'react';

type User = {
  _id: string;
  name?: string;
  lastName?: string;
  email: string;
  role?: string;
};

export default function UsersTableClient({ users }: { users: User[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const fullName = [u.name, u.lastName].filter(Boolean).join(' ').toLowerCase();
      return fullName.includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, query]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="w-full max-w-md border rounded-lg px-3 py-2 bg-white shadow-sm"
        />
        <span className="text-sm text-slate-500">{filtered.length} / {users.length}</span>
      </div>
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


