// src/app/(admin)/admin/users/page.tsx
import { serverFetchJson } from '@/lib/api.server';
import UsersTableClient from './UsersTableClient';
import { getServerI18n } from '@/lib/i18n/server';

type User = {
  _id: string;
  name?: string;
  lastName?: string;
  email: string;
  role?: string;
  isActive?: boolean;
};

type UsersResp = { success: boolean; data: User[] };

export const dynamic = 'force-dynamic'; // no cache

export default async function UsersPage() {
  const { t } = await getServerI18n();
  const res = await serverFetchJson<UsersResp>('/users');
  const users = res.data || [];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">{t('Users')}</h1>
      <UsersTableClient users={users} />
    </div>
  );
}
