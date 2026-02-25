import type { Metadata } from 'next';
import './globals.css';
import { cookies } from 'next/headers';
import { I18nProvider } from '@/lib/i18n/I18nProvider';
import { normalizeLocale, LOCALE_COOKIE_KEY } from '@/lib/i18n/constants';

export const metadata: Metadata = {
  title: 'LIVO Admin',
  description: 'Administration panel for LIVO',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialLocale = normalizeLocale(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return (
    <html lang={initialLocale}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>
      </body>
    </html>
  );
}

