'use client';
import { useEffect, useMemo, useState } from 'react';
import { clientFetchJson } from '@/lib/api.client';
import AssetOwnersPieClient from '@/app/(admin)/admin/assets/[assetId]/bookings/AssetOwnersPieClient';

type User = {
  _id: string;
  name?: string;
  lastName?: string;
  email: string;
  role?: string;
};

export default function UsersTableClient({ users }: { users: User[] }) {
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [assets, setAssets] = useState<{ _id: string; name: string; owners?: { user: { _id: string; name?: string; lastName?: string; email?: string }|string; sharePercentage: number }[] }[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedShare, setSelectedShare] = useState<number>(12.5);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string|null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const fullName = [u.name, u.lastName].filter(Boolean).join(' ').toLowerCase();
      return fullName.includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, query]);

  useEffect(() => {
    if (!showAdd) return;
    (async () => {
      try {
        const res = await clientFetchJson<{ success: boolean; data: any[] }>('/assets');
        setAssets(res?.data || []);
      } catch {
        setAssets([]);
      }
    })();
  }, [showAdd]);

  const assetOwnersForPie = useMemo(() => {
    const asset = assets.find(a => a._id === selectedAssetId);
    if (!asset) return [] as { userId: string; label: string; sharePercentage: number }[];
    const owners = (asset.owners || []).map(o => {
      const u: any = o.user;
      const id = typeof u === 'object' ? u._id : String(u);
      const full = typeof u === 'object' ? [u.name, u.lastName].filter(Boolean).join(' ') : '';
      const label = full || (typeof u === 'object' ? u.email : id);
      return { userId: id, label, sharePercentage: o.sharePercentage };
    });
    const currentTotal = owners.reduce((s, o) => s + (o.sharePercentage || 0), 0);
    const unallocated = Math.max(0, 100 - currentTotal - (selectedAssetId ? selectedShare : 0));
    const slices = [...owners];
    if (selectedAssetId && selectedShare > 0) {
      slices.push({ userId: 'new', label: 'New owner (pending)', sharePercentage: selectedShare });
    }
    if (unallocated > 0) {
      slices.push({ userId: 'unallocated', label: 'Unallocated', sharePercentage: unallocated });
    }
    return slices;
  }, [assets, selectedAssetId, selectedShare]);

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

      {/* Add user section */}
      <div className="mt-6">
        <button
          onClick={() => setShowAdd(v => !v)}
          className="rounded bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800"
        >
          {showAdd ? 'Hide add user' : 'Add new user'}
        </button>

        {showAdd && (
          <div className="mt-4 rounded-xl border bg-white shadow-sm p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm text-slate-600">First name</label>
                <input className="border rounded-lg px-3 py-2 bg-white shadow-sm" value={name} onChange={e=>setName(e.target.value)} />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-slate-600">Last name</label>
                <input className="border rounded-lg px-3 py-2 bg-white shadow-sm" value={lastName} onChange={e=>setLastName(e.target.value)} />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-slate-600">Email</label>
                <input type="email" className="border rounded-lg px-3 py-2 bg-white shadow-sm" value={email} onChange={e=>setEmail(e.target.value)} />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-slate-600">Phone number</label>
                <input className="border rounded-lg px-3 py-2 bg-white shadow-sm" value={phone} onChange={e=>setPhone(e.target.value)} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="flex flex-col">
                <label className="text-sm text-slate-600">Asset</label>
                <select className="border rounded-lg px-3 py-2 bg-white shadow-sm" value={selectedAssetId} onChange={e=>setSelectedAssetId(e.target.value)}>
                  <option value="">Select asset</option>
                  {assets.map(a => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-slate-600">Share percentage</label>
                <select className="border rounded-lg px-3 py-2 bg-white shadow-sm" value={selectedShare} onChange={e=>setSelectedShare(Number(e.target.value))}>
                  {[12.5,25,37.5,50,62.5,75,87.5].map(v => (
                    <option key={v} value={v}>{v}%</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-1">
                <button
                  className="rounded bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-60"
                  disabled={submitting || !name || !lastName || !email || !phone || !selectedAssetId || !selectedShare}
                  onClick={async () => {
                    try {
                      setSubmitting(true);
                      setSubmitError(null);
                      // Create user
                      const userRes = await clientFetchJson<{ success: boolean; data: { _id: string } }>(`/users`, {
                        method: 'POST',
                        body: JSON.stringify({ name, lastName, email, phoneNumber: phone, role: 'user' })
                      });
                      const newUserId = userRes.data._id;
                      // Add as owner to asset
                      await clientFetchJson(`/assets/${selectedAssetId}/owners`, {
                        method: 'POST',
                        body: JSON.stringify({ userId: newUserId, sharePercentage: selectedShare })
                      });
                      // Reset form
                      setName(''); setLastName(''); setEmail(''); setPhone(''); setSelectedAssetId(''); setSelectedShare(12.5);
                      alert('User created and ownership added');
                      location.reload();
                    } catch (e: any) {
                      setSubmitError(e?.message || 'Failed to create user');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  {submitting ? 'Creating…' : 'Create user'}
                </button>
              </div>
            </div>

            {/* Interactive pie visualization */}
            {selectedAssetId && (
              <div className="mt-4">
                <AssetOwnersPieClient owners={assetOwnersForPie} />
                <div className="text-xs text-slate-600 mt-2">Unallocated shares appear in gray; pending user slice is labeled "New owner (pending)".</div>
              </div>
            )}

            {submitError && <div className="text-sm text-red-600 mt-3">{submitError}</div>}
          </div>
        )}
      </div>
    </div>
  );
}


