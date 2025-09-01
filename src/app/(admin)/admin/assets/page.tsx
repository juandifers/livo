// src/app/(admin)/admin/assets/page.tsx
import Link from 'next/link';
import { serverFetchJson } from '@/lib/api.server';

type Owner = { user?: { _id: string; name?: string; lastName?: string; email: string } | string; sharePercentage: number };
type Asset = { _id: string; name: string; type?: string; location?: string; owners?: Owner[] };
type AssetsResp = { success: boolean; data: Asset[] };

export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
  const res = await serverFetchJson<AssetsResp>('/assets');
  const assets = res.data || [];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Assets</h1>
      <div className="overflow-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-[800px] w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Location</th>
              <th className="text-left p-3">Owners</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a._id} className="border-b last:border-0">
                <td className="p-3 font-medium text-slate-800">{a.name}</td>
                <td className="p-3">{a.type || '—'}</td>
                <td className="p-3">{a.location || '—'}</td>
                <td className="p-3">
                  {Array.isArray(a.owners) && a.owners.length > 0
                    ? a.owners
                        .map((o) => {
                          const u = o.user && typeof o.user === 'object' ? (o.user as any) : null;
                          if (u) {
                            const full = [u.name, u.lastName].filter(Boolean).join(' ');
                            return full || u.email;
                          }
                          return '—';
                        })
                        .join(', ')
                    : '—'}
                </td>
                <td className="p-3">
                  <Link href={`/admin/assets/${a._id}/bookings`} className="inline-block rounded bg-slate-900 text-white px-3 py-1.5 text-xs hover:bg-slate-800">
                    View bookings
                  </Link>
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">No assets found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


