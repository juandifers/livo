'use client';
import { useMemo, useState } from 'react';
import CancelBookingButton from './CancelBookingButton';

type Booking = {
  _id: string;
  asset: { _id: string; name: string } | string | null;
  startDate: string;
  endDate: string;
  status: string;
  isShortTerm?: boolean;
  // FEAT-ADMIN-OVR-001: Admin override fields
  adminOverride?: boolean;
  overrideByAdminId?: { name?: string; email?: string } | string | null;
  overrideAt?: string;
  overrideReasons?: string[];
  overrideNote?: string | null;
};

type Props = {
  bookings: Booking[];
};

export default function BookingsTableClient({ bookings }: Props) {
  const [show, setShow] = useState<'all' | 'upcoming' | 'past'>('all');
  const [sortBy, setSortBy] = useState<'asset' | 'start' | 'end'>('start');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  // FEAT-ADMIN-OVR-001: Filter for override bookings
  const [showOnlyOverrides, setShowOnlyOverrides] = useState(false);
  // Show more/less bookings
  const [showAll, setShowAll] = useState(false);

  const now = new Date();

  function parseDateOnly(dateStr: string) {
    if (!dateStr) return new Date(''); // invalid date
    // API returns YYYY-MM-DD (date-only). Parse as local midnight to avoid timezone shifting in UI.
    return dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T00:00:00`);
  }

  const filtered = useMemo(() => {
    let list = bookings.slice();
    if (show === 'upcoming') {
      list = list.filter((b) => parseDateOnly(b.endDate) >= now);
    } else if (show === 'past') {
      list = list.filter((b) => parseDateOnly(b.endDate) < now);
    }
    // FEAT-ADMIN-OVR-001: Filter for override bookings
    if (showOnlyOverrides) {
      list = list.filter((b) => b.adminOverride);
    }
    return list;
  }, [bookings, show, showOnlyOverrides, now]);

  const sorted = useMemo(() => {
    const list = filtered.slice();
    list.sort((a, b) => {
      let va: any, vb: any;
      if (sortBy === 'asset') {
        const an = a.asset && typeof a.asset === 'object' && 'name' in (a.asset as any) ? (a.asset as any).name : String(a.asset || '');
        const bn = b.asset && typeof b.asset === 'object' && 'name' in (b.asset as any) ? (b.asset as any).name : String(b.asset || '');
        va = an.toLowerCase();
        vb = bn.toLowerCase();
      } else if (sortBy === 'start') {
        va = parseDateOnly(a.startDate).getTime();
        vb = parseDateOnly(b.startDate).getTime();
      } else {
        va = parseDateOnly(a.endDate).getTime();
        vb = parseDateOnly(b.endDate).getTime();
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return dir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortBy, dir]);

  const displayed = useMemo(() => {
    return showAll ? sorted : sorted.slice(0, 8);
  }, [sorted, showAll]);

  function toggleSort(key: 'asset' | 'start' | 'end') {
    if (sortBy === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setDir('asc');
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm">Show</label>
          <select value={show} onChange={(e) => setShow(e.target.value as any)} className="border rounded-lg px-2 py-1 bg-white shadow-sm">
            <option value="all">All</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
        </div>
        
        {/* FEAT-ADMIN-OVR-001: Override filter */}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyOverrides}
            onChange={(e) => setShowOnlyOverrides(e.target.checked)}
            className="rounded"
          />
          <span>Show only overridden bookings</span>
        </label>
        
        <div className="ml-auto text-sm text-slate-500">{sorted.length} bookings</div>
      </div>

      <div className="overflow-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-[960px] w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-3 cursor-pointer" onClick={() => toggleSort('asset')}>
                Asset {sortBy === 'asset' ? (dir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th className="text-left p-3 cursor-pointer" onClick={() => toggleSort('start')}>
                Start {sortBy === 'start' ? (dir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th className="text-left p-3 cursor-pointer" onClick={() => toggleSort('end')}>
                End {sortBy === 'end' ? (dir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Short-term</th>
              <th className="text-left p-3">Override</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((b) => (
              <tr key={b._id} className="border-b last:border-0">
                <td className="p-3">
                  {b.asset && typeof b.asset === 'object' && 'name' in (b.asset as any) ? (b.asset as any).name : (b.asset ? String(b.asset) : '—')}
                </td>
                <td className="p-3">{parseDateOnly(b.startDate).toLocaleDateString()}</td>
                <td className="p-3">{parseDateOnly(b.endDate).toLocaleDateString()}</td>
                <td className="p-3">{b.status}</td>
                <td className="p-3">{b.isShortTerm ? 'Yes' : 'No'}</td>
                <td className="p-3">
                  {/* FEAT-ADMIN-OVR-001: Override indicator */}
                  {b.adminOverride ? (
                    <div className="space-y-1">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Admin Override
                      </span>
                      {b.overrideReasons && b.overrideReasons.length > 0 && (
                        <details className="text-xs text-gray-600">
                          <summary className="cursor-pointer hover:text-orange-600">
                            View violations ({b.overrideReasons.length})
                          </summary>
                          <ul className="ml-4 mt-1 space-y-0.5">
                            {b.overrideReasons.map((r, i) => (
                              <li key={i} className="text-gray-700">• {r}</li>
                            ))}
                          </ul>
                          {b.overrideNote && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-gray-700">
                              <strong>Note:</strong> {b.overrideNote}
                            </div>
                          )}
                        </details>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="p-3">
                  {b.status !== 'cancelled' ? (
                    <CancelBookingButton bookingId={b._id} />
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">No bookings</td>
              </tr>
            )}
          </tbody>
        </table>
        {sorted.length > 8 && (
          <div className="border-t bg-slate-50 p-3 flex justify-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium underline"
            >
              {showAll ? `Show less (viewing all ${sorted.length})` : `Show more (${sorted.length - 8} hidden)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


