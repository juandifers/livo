'use client';
import { useEffect, useMemo, useState } from 'react';
import { clientFetchJson } from '@/lib/api.client';

type Asset = { _id: string; name: string };

export default function CreateBookingForm({ userId }: { userId: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetId, setAssetId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [useExtraDays, setUseExtraDays] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load all assets, then filter to only those the user owns
    clientFetchJson<{ success: boolean; data: any[] }>(`/assets`)
      .then((res) => {
        const all = res.data || [];
        const owned = all.filter((asset: any) =>
          Array.isArray(asset?.owners) && asset.owners.some((o: any) => {
            const ownerId = typeof o.user === 'object' && o.user ? o.user._id : o.user;
            return ownerId === userId;
          })
        );
        const list = owned.map((a: any) => ({ _id: a._id, name: a.name }));
        setAssets(list);
      })
      .catch((e) => setError(e?.message || 'Failed to load assets'));
  }, [userId]);

  const canSubmit = useMemo(() => !!assetId && !!startDate && !!endDate, [assetId, startDate, endDate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await clientFetchJson(`/bookings`, {
        method: 'POST',
        body: JSON.stringify({ userId, assetId, startDate, endDate, notes, useExtraDays }),
      });
      setMessage('Booking created');
      // Simple reset
      setAssetId('');
      setStartDate('');
      setEndDate('');
      setNotes('');
      setUseExtraDays(false);
      // Refresh page data
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || 'Failed to create booking');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border bg-white shadow-sm p-4 space-y-4 mb-6">
      <h2 className="font-semibold text-slate-800">Create Booking</h2>
      <div className="flex gap-3 flex-wrap">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Asset</label>
          <select value={assetId} onChange={(e) => setAssetId(e.target.value)} className="border rounded-lg px-3 py-2 min-w-[220px] bg-white shadow-sm">
            <option value="">Select asset</option>
            {assets.map((a) => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Start</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded-lg px-3 py-2 bg-white shadow-sm" />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">End</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded-lg px-3 py-2 bg-white shadow-sm" />
        </div>
        <div className="flex items-center gap-2 mt-6">
          <input id="useExtraDays" type="checkbox" checked={useExtraDays} onChange={(e) => setUseExtraDays(e.target.checked)} />
          <label htmlFor="useExtraDays" className="text-sm">Use extra days if needed</label>
        </div>
      </div>
      <div>
        <label className="text-sm text-gray-600">Notes</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className="border rounded-lg px-3 py-2 w-full bg-white shadow-sm" />
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {message && <div className="text-green-700 text-sm">{message}</div>}
      <button disabled={!canSubmit || busy || assets.length === 0} className="bg-slate-900 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-slate-800 disabled:opacity-60">
        {busy ? 'Creating…' : 'Create'}
      </button>
      {assets.length === 0 && (
        <div className="text-sm text-gray-500">This user has no owned assets.</div>
      )}
    </form>
  );
}


