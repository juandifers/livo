import Link from 'next/link';
import { serverFetchJson } from '@/lib/api.server';
import CancelBookingButton from '../../../users/[userId]/bookings/CancelBookingButton';
import AssetCalendarClient from './AssetCalendarClient';
import AssetOwnersPieClient from './AssetOwnersPieClient';
import AssetBookingsTableClient from './AssetBookingsTableClient';
import YearSelectorClient from '../../../users/[userId]/bookings/YearSelectorClient';

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
        <AssetOwnersPieClient owners={pieOwners} assetId={assetId} />
      </div>

      {/* Allocation by Owner */}
      <div className="rounded-xl border bg-white shadow-sm p-4 mt-6">
        <div className="font-semibold mb-3">Allocation by Owner</div>
        <div className="text-xs text-slate-600 mb-4">Yearly allocation (January 1st - December 31st)</div>
        <div className="space-y-6">
          {ownerAllocations.map((o) => (
            <div key={o.userId} className="rounded-lg border p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Link 
                    href={`/admin/users/${o.userId}/bookings`}
                    className="font-medium hover:text-slate-900 hover:underline"
                  >
                    {o.label}
                  </Link>
                  <div className="text-xs text-slate-600">Share: {o.sharePercentage}%</div>
                </div>
              </div>
              
              <YearSelectorClient 
                userId={o.userId} 
                assetId={assetId} 
                allocation={o.allocation}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


