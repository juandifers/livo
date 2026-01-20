// src/app/(admin)/admin/page.tsx
import { serverFetchJson } from '@/lib/api.server';

export const dynamic = 'force-dynamic'; // no cache

type Booking = {
  _id: string;
  user: { _id: string; name?: string; lastName?: string; email?: string } | string | null;
  asset: { _id: string; name?: string } | string | null;
  startDate: string;
  endDate: string;
  status: string;
};
type BookingsResp = { success: boolean; data: Booking[] };

export default async function AdminHomePage() {
  // Fetch upcoming bookings (server-side) and show the next 5
  let upcoming: Booking[] = [];
  try {
    const res = await serverFetchJson<BookingsResp>('/bookings');
    const all = res?.data || [];
    const now = new Date();
    const parseDateOnly = (dateStr: string) => {
      if (!dateStr) return new Date(''); // invalid
      // API returns YYYY-MM-DD (date-only). Parse as local midnight for consistent UI.
      return dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T00:00:00`);
    };
    upcoming = all
      .filter((b) => parseDateOnly(b.endDate) >= now && b.status !== 'cancelled')
      .sort((a, b) => parseDateOnly(a.startDate).getTime() - parseDateOnly(b.startDate).getTime())
      .slice(0, 5);
  } catch {}

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <p className="text-gray-600">Welcome to the admin panel. Use the sidebar to navigate.</p>

      <div className="mt-6 rounded-xl border bg-white shadow-sm p-4">
        <div className="font-semibold mb-2">Top upcoming bookings</div>
        <div className="overflow-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-2">Start</th>
                <th className="text-left p-2">End</th>
                <th className="text-left p-2">Asset</th>
                <th className="text-left p-2">User</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((b) => {
                const assetLabel = b.asset && typeof b.asset === 'object' ? ((b.asset as any).name || String((b.asset as any)._id)) : String(b.asset || '—');
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
                    <td className="p-2">{(b.startDate?.includes('T') ? new Date(b.startDate) : new Date(`${b.startDate}T00:00:00`)).toLocaleDateString()}</td>
                    <td className="p-2">{(b.endDate?.includes('T') ? new Date(b.endDate) : new Date(`${b.endDate}T00:00:00`)).toLocaleDateString()}</td>
                    <td className="p-2">{assetLabel}</td>
                    <td className="p-2">{userLabel}</td>
                    <td className="p-2">{b.status}</td>
                  </tr>
                );
              })}
              {upcoming.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">No upcoming bookings</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}