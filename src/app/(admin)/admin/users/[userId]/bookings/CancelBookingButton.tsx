'use client';
import { useState } from 'react';
import { clientFetchJson } from '@/lib/api.client';

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCancel() {
    if (!confirm('Cancel this booking?')) return;
    setBusy(true);
    setError(null);
    try {
      await clientFetchJson(`/bookings/${bookingId}`, { method: 'DELETE' });
      // Refresh the current route to reflect cancellation
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || 'Failed to cancel');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={onCancel}
        disabled={busy}
        className="px-3 py-1.5 rounded bg-red-600 text-white text-xs shadow-sm hover:bg-red-700 disabled:opacity-60"
      >
        {busy ? 'Cancelling…' : 'Cancel'}
      </button>
      {error && <span className="text-red-600 text-xs">{error}</span>}
    </div>
  );
}


