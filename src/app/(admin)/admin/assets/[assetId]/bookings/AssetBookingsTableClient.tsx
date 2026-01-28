'use client';
import { useMemo, useState } from 'react';
import CancelBookingButton from '../../../users/[userId]/bookings/CancelBookingButton';

type Booking = {
  _id: string;
  user: { _id: string; name?: string; lastName?: string; email?: string } | string | null;
  startDate: string;
  endDate: string;
  status: string;
  isShortTerm?: boolean;
};

export default function AssetBookingsTableClient({ bookings }: { bookings: Booking[] }) {
  const [show, setShow] = useState<'all' | 'upcoming' | 'past'>('all');
  const [sortBy, setSortBy] = useState<'user' | 'start' | 'end'>('start');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
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
    return list;
  }, [bookings, show, now]);

  const sorted = useMemo(() => {
    const list = filtered.slice();
    list.sort((a, b) => {
      let va: any, vb: any;
      if (sortBy === 'user') {
        const an = a.user && typeof a.user === 'object' ?
          [ (a.user as any).name, (a.user as any).lastName ].filter(Boolean).join(' ') || (a.user as any).email || '' :
          String(a.user || '');
        const bn = b.user && typeof b.user === 'object' ?
          [ (b.user as any).name, (b.user as any).lastName ].filter(Boolean).join(' ') || (b.user as any).email || '' :
          String(b.user || '');
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

  function toggleSort(key: 'user' | 'start' | 'end') {
    if (sortBy === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setDir('asc');
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm">Show</label>
        <select value={show} onChange={(e) => setShow(e.target.value as any)} className="border rounded-lg px-2 py-1 bg-white shadow-sm">
          <option value="all">All</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
        </select>
        <div className="ml-auto text-sm text-slate-500">{sorted.length} bookings</div>
      </div>

      <div className="overflow-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-[960px] w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-3 cursor-pointer" onClick={() => toggleSort('user')}>
                User {sortBy === 'user' ? (dir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th className="text-left p-3 cursor-pointer" onClick={() => toggleSort('start')}>
                Start {sortBy === 'start' ? (dir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th className="text-left p-3 cursor-pointer" onClick={() => toggleSort('end')}>
                End {sortBy === 'end' ? (dir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Short-term</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((b) => {
              let userLabel = '—';
              if (b.user && typeof b.user === 'object') {
                const u = b.user as any;
                const full = [u.name, u.lastName].filter(Boolean).join(' ');
                userLabel = full || u.email || '—';
              } else if (b.user) {
                userLabel = String(b.user);
              }
              return (
                <tr key={b._id} className="border-b last:border-0">
                  <td className="p-3 font-medium text-slate-800">{userLabel}</td>
                  <td className="p-3">{parseDateOnly(b.startDate).toLocaleDateString()}</td>
                  <td className="p-3">{parseDateOnly(b.endDate).toLocaleDateString()}</td>
                  <td className="p-3">{b.status}</td>
                  <td className="p-3">{b.isShortTerm ? 'Yes' : 'No'}</td>
                  <td className="p-3">{b.status !== 'cancelled' ? (<CancelBookingButton bookingId={b._id} />) : (<span className="text-gray-500">—</span>)}</td>
                </tr>
              );
            })}
            {displayed.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">No bookings found</td>
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


