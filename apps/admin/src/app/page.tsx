import { getServerI18n } from '@/lib/i18n/server';

export default async function Home() {
  const { t } = await getServerI18n();
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">{t('Welcome')}</h1>
      <p className="text-gray-600">{t('Go to /login to sign in, or /admin if already authenticated.')}</p>
    </main>
  );
}

