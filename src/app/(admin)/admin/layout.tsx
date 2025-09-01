// src/app/(admin)/admin/layout.tsx
import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white/80 backdrop-blur border-r px-5 py-6">
        <div className="text-xl font-semibold mb-6 text-slate-800">LIVO Admin</div>
        <nav className="space-y-1">
          <Link href="/admin" className="block rounded px-3 py-2 text-slate-700 hover:bg-slate-100">Dashboard</Link>
          <Link href="/admin/users" className="block rounded px-3 py-2 text-slate-700 hover:bg-slate-100">Users</Link>
          <Link href="/admin/assets" className="block rounded px-3 py-2 text-slate-700 hover:bg-slate-100">Assets</Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}