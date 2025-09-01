import Link from 'next/link';
import { serverFetchJson } from '@/lib/api.server';
import CancelBookingButton from '../../../users/[userId]/bookings/CancelBookingButton';
import AssetCalendarClient from './AssetCalendarClient';
import AssetOwnersPieClient from './AssetOwnersPieClient';
import AssetBookingsTableClient from './AssetBookingsTableClient';

type Booking = {
  _id: string;
  user: { _id: string; name?: string; lastName?: string; email?: string } | string | null;
  startDate: string;
  endDate: string;
  status: string;
  isShortTerm?: boolean;
};

type BookingsResp = { success: boolean; data: Booking[] };
type AssetResp = { success: boolean; data?: { name?: string; owners?: { user: { _id: string; name?: string; lastName?: string; email?: string } | string; sharePercentage: number }[] } };
type AllocationResp = { success: boolean; data: { allowedDaysPerYear: number; daysBooked: number; specialDates?: { type1: { used: number; total: number }; type2: { used: number; total: number } }; activeBookings?: number; maxActiveBookings?: number; allocationWindow?: { start: string; end: string } } };

export const dynamic = 'force-dynamic';

export default async function AssetBookingsPage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  // Prefer dedicated endpoint for asset bookings
  const res = await serverFetchJson<BookingsResp>(`/bookings/asset/${encodeURIComponent(assetId)}`);
  const bookings = res.data || [];
  // Fetch asset details for display name and owners
  let assetName = 'Asset';
  let pieOwners: { userId: string; label: string; sharePercentage: number }[] = [];
  let ownerAllocations: { userId: string; label: string; sharePercentage: number; allocation?: AllocationResp['data'] }[] = [];
  try {
    const assetRes = await serverFetchJson<AssetResp>(`/assets/${encodeURIComponent(assetId)}`);
    assetName = assetRes?.data?.name || assetName;
    const rawOwners = assetRes?.data?.owners || [];
    pieOwners = rawOwners.map((o) => {
      const u = o.user as any;
      const id = typeof u === 'object' ? u._id : String(u);
      const full = typeof u === 'object' ? [u.name, u.lastName].filter(Boolean).join(' ') : '';
      const label = full || (typeof u === 'object' ? u.email : id);
      return { userId: id, label, sharePercentage: o.sharePercentage };
    });
    const allocs = await Promise.all(
      pieOwners.map((o) => serverFetchJson<AllocationResp>(`/bookings/allocation/${encodeURIComponent(o.userId)}/${encodeURIComponent(assetId)}`))
    );
    ownerAllocations = pieOwners.map((o, i) => ({ ...o, allocation: allocs[i]?.data }));
  } catch {}

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{assetName} Bookings</h1>
        <Link href="/admin/assets" className="text-sm text-slate-600 hover:text-slate-900">← Back to Assets</Link>
      </div>
      <AssetCalendarClient assetId={assetId} />

      <AssetBookingsTableClient bookings={bookings} />

      {/* Owners pie chart */}
      <div className="rounded-xl border bg-white shadow-sm p-4 mt-6">
        <AssetOwnersPieClient owners={pieOwners} />
      </div>

      {/* Allocation by Owner */}
      <div className="rounded-xl border bg-white shadow-sm p-4 mt-6">
        <div className="font-semibold mb-3">Allocation by Owner</div>
        <div className="space-y-4">
          {ownerAllocations.map((o) => {
            const a = o.allocation;
            const allowed = a?.allowedDaysPerYear || 0;
            const booked = a?.daysBooked || 0;
            const pct = allowed > 0 ? Math.min(100, Math.round((booked / allowed) * 100)) : 0;
            const type1Used = a?.specialDates?.type1?.used || 0;
            const type1Total = a?.specialDates?.type1?.total || 0;
            const type2Used = a?.specialDates?.type2?.used || 0;
            const type2Total = a?.specialDates?.type2?.total || 0;
            const activeUsed = a?.activeBookings || 0;
            const activeMax = a?.maxActiveBookings || 0;
            const wStart = a?.allocationWindow?.start ? new Date(a.allocationWindow.start) : null;
            const wEnd = a?.allocationWindow?.end ? new Date(a.allocationWindow.end) : null;
            const fmt = (d: Date | null) => (d ? d.toISOString().split('T')[0] : '');
            return (
              <div key={o.userId} className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">{o.label}</div>
                    <div className="text-xs text-slate-600">Share: {o.sharePercentage}%</div>
                  </div>
                  {(wStart && wEnd) && (
                    <div className="text-xs text-slate-600">Window: {fmt(wStart)} → {fmt(wEnd)}</div>
                  )}
                </div>
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{booked}</div>
                    <div className="text-sm text-slate-600">Days Used</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{allowed}</div>
                    <div className="text-sm text-slate-600">Total Allocation</div>
                  </div>
                  <div className="flex-1 min-w-[240px]">
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-900" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-slate-600">{pct}% of annual allocation used</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="rounded border p-2">
                    <div className="text-xs text-slate-600 mb-1">Special Dates</div>
                    <div className="text-xs">Type 1: {type1Used} / {type1Total}</div>
                    <div className="text-xs">Type 2: {type2Used} / {type2Total}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-xs text-slate-600 mb-1">Active Booking Slots</div>
                    <div className="text-xs">{activeUsed} of {activeMax} used</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


