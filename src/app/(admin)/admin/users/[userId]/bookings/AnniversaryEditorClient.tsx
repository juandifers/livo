'use client';

import { useMemo, useState } from 'react';
import { clientFetchJson } from '@/lib/api.client';

type Props = {
  userId: string;
  assetId: string;
  // Optional: pass allocation window dates for context display
  currentWindowLabel?: string;
};

export default function AnniversaryEditorClient({ userId, assetId, currentWindowLabel }: Props) {
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => !!anniversaryDate && !busy, [anniversaryDate, busy]);

  async function onSave() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await clientFetchJson(`/assets/${encodeURIComponent(assetId)}/owners/${encodeURIComponent(userId)}/anniversary`, {
        method: 'PATCH',
        body: JSON.stringify({ anniversaryDate }),
      });
      setMessage('Anniversary date updated');
      setAnniversaryDate('');
      // Refresh server components data
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || 'Failed to update anniversary date');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border bg-slate-50 p-3 mb-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-medium text-slate-900">Anniversary window</div>
          <div className="text-xs text-slate-600">
            {currentWindowLabel ? `Current: ${currentWindowLabel}` : 'Current: (loading…)'}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            If not set, it defaults to the user&apos;s ownership “since” date on this asset.
          </div>
        </div>

        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex flex-col">
            <label className="text-xs text-slate-600">Set anniversary date</label>
            <input
              type="date"
              value={anniversaryDate}
              onChange={(e) => setAnniversaryDate(e.target.value)}
              className="border rounded-lg px-3 py-2 bg-white shadow-sm"
            />
          </div>
          <button
            onClick={onSave}
            disabled={!canSubmit}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      {message && <div className="text-green-700 text-sm mt-2">{message}</div>}
    </div>
  );
}

