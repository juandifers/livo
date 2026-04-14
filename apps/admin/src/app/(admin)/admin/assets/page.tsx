// src/app/(admin)/admin/assets/page.tsx
import { serverFetchJson } from '@/lib/api.server';
import AssetsTableClient from './AssetsTableClient';

type Owner = { user?: { _id: string; name?: string; lastName?: string; email: string } | string; sharePercentage: number };
type Asset = { _id: string; name: string; type?: string; location?: string; owners?: Owner[] };
type AssetsResp = { success: boolean; data: Asset[] };

export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
  const res = await serverFetchJson<AssetsResp>('/assets');
  const assets = res.data || [];

  return <AssetsTableClient assets={assets} />;
}


