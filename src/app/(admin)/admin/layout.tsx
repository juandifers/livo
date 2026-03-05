// src/app/(admin)/admin/layout.tsx
import Link from 'next/link';
import type { ReactNode } from 'react';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { getServerI18n } from '@/lib/i18n/server';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = await getServerI18n();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white/80 backdrop-blur border-r px-5 py-6">
        <div className="text-xl font-semibold mb-3 text-slate-800">{t('LIVO Admin')}</div>
        <div className="mb-6">
          <LanguageSwitcher />
        </div>
        <nav className="space-y-1">
          <Link href="/admin" className="block rounded px-3 py-2 text-slate-700 hover:bg-slate-100">{t('Dashboard')}</Link>
          <Link href="/admin/users" className="block rounded px-3 py-2 text-slate-700 hover:bg-slate-100">{t('Users')}</Link>
          <Link href="/admin/assets" className="block rounded px-3 py-2 text-slate-700 hover:bg-slate-100">{t('Assets')}</Link>
          <Link href="/admin/special-dates" className="block rounded px-3 py-2 text-slate-700 hover:bg-slate-100">{t('Special Dates')}</Link>
          <Link href="/admin/change-password" className="block rounded px-3 py-2 text-slate-700 hover:bg-slate-100">{t('Change Password')}</Link>
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
