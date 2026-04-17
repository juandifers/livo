// src/app/(admin)/admin/page.tsx
import { serverFetchJson } from '@/lib/api.server';
import { getServerI18n } from '@/lib/i18n/server';

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
type CountResp = { success: boolean; data: unknown[] };

const parseDateOnly = (dateStr: string) => {
  if (!dateStr) return new Date('');
  return dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T00:00:00`);
};

export default async function AdminHomePage() {
  const { t, formatDate } = await getServerI18n();

  const [bookingsRes, usersRes, assetsRes, specialDatesRes] = await Promise.all([
    serverFetchJson<BookingsResp>('/bookings').catch(() => null),
    serverFetchJson<CountResp>('/users').catch(() => null),
    serverFetchJson<CountResp>('/assets').catch(() => null),
    serverFetchJson<CountResp>('/bookings/special-dates/all').catch(() => null),
  ]);

  const allBookings = bookingsRes?.data || [];
  const now = new Date();
  const upcomingAll = allBookings.filter(
    (b) => parseDateOnly(b.endDate) >= now && b.status !== 'cancelled',
  );
  const upcoming = [...upcomingAll]
    .sort((a, b) => parseDateOnly(a.startDate).getTime() - parseDateOnly(b.startDate).getTime())
    .slice(0, 5);

  const fmtCount = (n: number | null) => (n === null ? '—' : String(n));
  const tiles: { label: string; value: string }[] = [
    { label: t('Users'), value: fmtCount(usersRes?.data?.length ?? null) },
    { label: t('Assets'), value: fmtCount(assetsRes?.data?.length ?? null) },
    { label: t('Upcoming bookings'), value: fmtCount(bookingsRes ? upcomingAll.length : null) },
    { label: t('Special dates'), value: fmtCount(specialDatesRes?.data?.length ?? null) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">{t('Dashboard')}</h1>
      <p className="text-gray-600">{t('Welcome to the admin panel. Use the sidebar to navigate.')}</p>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border bg-white shadow-sm p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">{tile.label}</div>
            <div className="text-2xl font-semibold text-slate-900 mt-1">{tile.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border bg-white shadow-sm p-4">
        <div className="font-semibold mb-2">{t('Top upcoming bookings')}</div>
        <div className="overflow-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-2">{t('Start')}</th>
                <th className="text-left p-2">{t('End')}</th>
                <th className="text-left p-2">{t('Asset')}</th>
                <th className="text-left p-2">{t('User')}</th>
                <th className="text-left p-2">{t('Status')}</th>
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
                    <td className="p-2">{formatDate(b.startDate?.includes('T') ? new Date(b.startDate) : new Date(`${b.startDate}T00:00:00`))}</td>
                    <td className="p-2">{formatDate(b.endDate?.includes('T') ? new Date(b.endDate) : new Date(`${b.endDate}T00:00:00`))}</td>
                    <td className="p-2">{assetLabel}</td>
                    <td className="p-2">{userLabel}</td>
                    <td className="p-2">{b.status}</td>
                  </tr>
                );
              })}
              {upcoming.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">{t('No upcoming bookings')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
