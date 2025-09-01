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
};

type Props = {
  bookings: Booking[];
};

export default function BookingsTableClient({ bookings }: Props) {
  const [show, setShow] = useState<'all' | 'upcoming' | 'past'>('all');
  const [sortBy, setSortBy] = useState<'asset' | 'start' | 'end'>('start');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');

  const now = new Date();

  const filtered = useMemo(() => {
    let list = bookings.slice();
    if (show === 'upcoming') {
      list = list.filter((b) => new Date(b.endDate) >= now);
    } else if (show === 'past') {
      list = list.filter((b) => new Date(b.endDate) < now);
    }
    return list;
  }, [bookings, show, now]);

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
        va = new Date(a.startDate).getTime();
        vb = new Date(b.startDate).getTime();
      } else {
        va = new Date(a.endDate).getTime();
        vb = new Date(b.endDate).getTime();
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return dir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortBy, dir]);

  function toggleSort(key: 'asset' | 'start' | 'end') {
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
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => (
              <tr key={b._id} className="border-b last:border-0">
                <td className="p-3">
                  {b.asset && typeof b.asset === 'object' && 'name' in (b.asset as any) ? (b.asset as any).name : (b.asset ? String(b.asset) : '—')}
                </td>
                <td className="p-3">{new Date(b.startDate).toLocaleDateString()}</td>
                <td className="p-3">{new Date(b.endDate).toLocaleDateString()}</td>
                <td className="p-3">{b.status}</td>
                <td className="p-3">{b.isShortTerm ? 'Yes' : 'No'}</td>
                <td className="p-3">
                  {b.status !== 'cancelled' ? (
                    <CancelBookingButton bookingId={b._id} />
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">No bookings</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


