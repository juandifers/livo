import Link from 'next/link';
import { serverFetchJson } from '@/lib/api.server';
import BookingsTableClient from './BookingsTableClient';
import CreateBookingForm from './CreateBookingForm';
import AssetCalendarClient from '@/app/(admin)/admin/assets/[assetId]/bookings/AssetCalendarClient';

type Booking = {
  _id: string;
  asset: { _id: string; name: string } | string | null;
  startDate: string;
  endDate: string;
  status: string;
  isShortTerm?: boolean;
};

type BookingsResp = { success: boolean; data: Booking[] };
type UserResp = { success: boolean; data?: { _id: string; name?: string; lastName?: string; email?: string } };
type AssetsResp = { success: boolean; data?: { _id: string; name?: string; owners?: { user: { _id: string } | string; sharePercentage: number; since?: string }[] }[] };
type AllocationResp = { success: boolean; data: { allowedDaysPerYear: number; daysBooked: number; specialDates?: { type1: { used: number; total: number }; type2: { used: number; total: number } }; activeBookings?: number; maxActiveBookings?: number; allocationWindow?: { start: string; end: string } } };

export const dynamic = 'force-dynamic';

export default async function UserBookingsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  // Use GET /api/bookings?user=<id>
  const res = await serverFetchJson<BookingsResp>(`/bookings?user=${encodeURIComponent(userId)}`);
  const bookings = res.data || [];

  // Fetch user for header label
  let userLabel = 'User';
  try {
    const ures = await serverFetchJson<UserResp>(`/users/${encodeURIComponent(userId)}`);
    const u = ures?.data;
    const full = [u?.name, u?.lastName].filter(Boolean).join(' ');
    userLabel = full || u?.email || userLabel;
  } catch {}

  // Per-asset allocation summaries
  let perAssetAllocations: { asset: NonNullable<AssetsResp['data']>[number]; allocation: AllocationResp['data'] | undefined }[] = [];
  try {
    const assetsRes = await serverFetchJson<AssetsResp>(`/assets`);
    const assets = assetsRes?.data || [];
    const owned = assets.filter((a) => (a.owners || []).some((o) => {
      const id = typeof o.user === 'object' ? (o.user as any)._id : String(o.user);
      return id === userId;
    }));
    const allocations = await Promise.all(
      owned.map((a) => serverFetchJson<AllocationResp>(`/bookings/allocation/${encodeURIComponent(userId)}/${encodeURIComponent(a._id)}`))
    );
    // Build per-asset allocation list for rendering below
    perAssetAllocations = owned.map((a, idx) => ({ asset: a, allocation: allocations[idx]?.data }));
  } catch {}

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">{userLabel} Bookings</h1>
      <div className="mb-4">
        <Link href="/admin/users" className="text-blue-600 hover:underline">← Back to Users</Link>
      </div>
      <BookingsTableClient bookings={bookings} />
      <CreateBookingForm userId={userId} />

      {/* Allocation by Asset (full-size cards) */}
      <div className="mt-6 space-y-6">
        {(perAssetAllocations || []).map(({ asset, allocation }) => {
          const allowed = allocation?.allowedDaysPerYear || 0;
          const booked = allocation?.daysBooked || 0;
          const pct = allowed > 0 ? Math.min(100, Math.round((booked / allowed) * 100)) : 0;
          const type1Used = allocation?.specialDates?.type1?.used || 0;
          const type1Total = allocation?.specialDates?.type1?.total || 0;
          const type2Used = allocation?.specialDates?.type2?.used || 0;
          const type2Total = allocation?.specialDates?.type2?.total || 0;
          const activeUsed = allocation?.activeBookings || 0;
          const activeMax = allocation?.maxActiveBookings || 0;
          const windowStart = allocation?.allocationWindow?.start ? new Date(allocation.allocationWindow.start) : null;
          const windowEnd = allocation?.allocationWindow?.end ? new Date(allocation.allocationWindow.end) : null;
          const fmt = (d: Date | null) => d ? d.toISOString().split('T')[0] : '';
          return (
            <div key={asset._id} className="rounded-xl border bg-white shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{asset.name || 'Asset'} Allocation Summary</div>
                {(windowStart && windowEnd) ? (
                  <div className="text-xs text-slate-600">
                    Anniversary window: {fmt(windowStart)} → {fmt(windowEnd)}
                  </div>
                ) : null}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4 w-full">
                  <div className="rounded-lg border p-3">
                    <div className="font-medium mb-1">Special Dates</div>
                    <div className="text-sm text-slate-700">Type 1: {type1Used} / {type1Total}</div>
                    <div className="text-sm text-slate-700">Type 2: {type2Used} / {type2Total}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="font-medium mb-1">Active Booking Slots</div>
                    <div className="text-sm text-slate-700">{activeUsed} of {activeMax} used</div>
                  </div>
                </div>
              </div>

              {/* Calendar (user's point of view for this asset) */}
              <div className="mt-6">
                <div className="font-medium mb-2">Calendar</div>
                <AssetCalendarClient assetId={asset._id} viewUserId={userId} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


