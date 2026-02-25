import Link from 'next/link';
import { serverFetchJson } from '@/lib/api.server';
import { getServerI18n } from '@/lib/i18n/server';
import PhotoManager from './PhotoManager';
import AssetEditForm from './AssetEditForm';

export const dynamic = 'force-dynamic';

type Asset = {
  _id: string;
  name: string;
  type: 'boat' | 'home';
  description?: string;
  location: string;
  capacity?: number;
  photos?: string[];
  amenities?: string[];
};

export default async function AssetEditPage({ 
  params 
}: { 
  params: Promise<{ assetId: string }> 
}) {
  const { assetId } = await params;
  const { t } = await getServerI18n();
  
  let asset: Asset | null = null;
  try {
    const res = await serverFetchJson<{ success: boolean; data: Asset }>(
      `/assets/${assetId}`
    );
    asset = res.data;
  } catch (error) {
    return (
      <div className="p-4">
        <div className="text-red-600 mb-4">{t('Asset not found')}</div>
        <Link href="/admin/assets" className="text-sm text-slate-600 hover:text-slate-900">
          {t('← Back to Assets')}
        </Link>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{t('Edit Asset: {{name}}', { name: asset.name })}</h1>
        <Link href="/admin/assets" className="text-sm text-slate-600 hover:text-slate-900">
          {t('← Back to Assets')}
        </Link>
      </div>
      
      <div className="space-y-6">
        <div className="rounded-xl border bg-white shadow-sm p-4">
          <h2 className="font-semibold mb-3">{t('Photos')}</h2>
          <PhotoManager assetId={assetId} initialPhotos={asset.photos || []} />
        </div>
        
        <div className="rounded-xl border bg-white shadow-sm p-4">
          <h2 className="font-semibold mb-3">{t('Asset Details')}</h2>
          <AssetEditForm asset={asset} />
        </div>
      </div>
    </div>
  );
}
