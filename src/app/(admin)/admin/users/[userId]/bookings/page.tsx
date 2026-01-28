import Link from 'next/link';
import { serverFetchJson } from '@/lib/api.server';
import BookingsTableClient from './BookingsTableClient';
import AssetCalendarClient from '@/app/(admin)/admin/assets/[assetId]/bookings/AssetCalendarClient';
import YearSelectorClient from './YearSelectorClient';
import AnniversaryEditorClient from './AnniversaryEditorClient';

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

      {/* Allocation by Asset (full-size cards) */}
      <div className="mt-6 space-y-6">
        {(perAssetAllocations || []).map(({ asset, allocation }) => {
          return (
            <div key={asset._id} className="rounded-xl border bg-white shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold">{asset.name || 'Asset'} Allocation Summary</div>
                <div className="text-xs text-slate-600">
                  Rolling anniversary allocation window (12 months)
                </div>
              </div>
              
              {/* Year Selector */}
              <div className="mb-4">
                <AnniversaryEditorClient
                  userId={userId}
                  assetId={asset._id}
                  currentWindowLabel={
                    (allocation as any)?.currentWindow?.start && (allocation as any)?.currentWindow?.end
                      ? `${(allocation as any).currentWindow.start} → ${(allocation as any).currentWindow.end}`
                      : (allocation as any)?.currentYear?.windowStart && (allocation as any)?.currentYear?.windowEnd
                        ? `${(allocation as any).currentYear.windowStart} → ${(allocation as any).currentYear.windowEnd}`
                        : undefined
                  }
                />
                <YearSelectorClient 
                  userId={userId} 
                  assetId={asset._id} 
                  allocation={allocation}
                />
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


