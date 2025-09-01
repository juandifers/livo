// src/app/(admin)/admin/users/page.tsx
import { serverFetchJson } from '@/lib/api.server';
import UsersTableClient from './UsersTableClient';

type User = {
  _id: string;
  name?: string;
  lastName?: string;
  email: string;
  role?: string;
};

type UsersResp = { success: boolean; data: User[] };

export const dynamic = 'force-dynamic'; // no cache

export default async function UsersPage() {
  const res = await serverFetchJson<UsersResp>('/users');
  const users = res.data || [];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Users</h1>
      <UsersTableClient users={users} />
    </div>
  );
}