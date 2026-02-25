'use client';
import { useState } from 'react';
import { clientFetchJson } from '@/lib/api.client';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { mapCommonApiError } from '@/lib/i18n/errorMap';

type Asset = {
  _id: string;
  name: string;
  type: 'boat' | 'home';
  description?: string;
  location: string;
  locationAddress?: string;
  propertyManager?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  capacity?: number;
  amenities?: string[];
};

export default function AssetEditForm({ asset }: { asset: Asset }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(asset.name || '');
  const [description, setDescription] = useState(asset.description || '');
  const [location, setLocation] = useState(asset.location || '');
  const [locationAddress, setLocationAddress] = useState(asset.locationAddress || '');
  const [propertyManagerName, setPropertyManagerName] = useState(asset.propertyManager?.name || '');
  const [propertyManagerPhone, setPropertyManagerPhone] = useState(asset.propertyManager?.phone || '');
  const [propertyManagerEmail, setPropertyManagerEmail] = useState(asset.propertyManager?.email || '');
  const [capacity, setCapacity] = useState(String(asset.capacity || ''));
  const [amenities, setAmenities] = useState(
    Array.isArray(asset.amenities) ? asset.amenities.join(', ') : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSave = async () => {
    if (!name || !location) {
      setError(t('Name and location are required'));
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      const amenitiesArray = amenities
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);

      const normalizedPropertyManager = {
        name: propertyManagerName.trim(),
        phone: propertyManagerPhone.trim(),
        email: propertyManagerEmail.trim(),
      };

      await clientFetchJson(`/assets/${asset._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          description: description || undefined,
          location,
          locationAddress: locationAddress || '',
          propertyManager: normalizedPropertyManager,
          capacity: capacity ? parseInt(capacity) : undefined,
          amenities: amenitiesArray.length > 0 ? amenitiesArray : undefined
        })
      });
      
      alert(t('Asset updated successfully'));
      router.push('/admin/assets');
    } catch (err: any) {
      setError(mapCommonApiError(locale, err?.message || '', 'Failed to update asset'));
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1 text-slate-700">{t('Asset Name')} *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 bg-white shadow-sm"
          placeholder={t('e.g., Luxury Villa Marbella')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-slate-700">{t('Location')} *</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 bg-white shadow-sm"
          placeholder={t('e.g., Marbella, Spain')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-slate-700">{t('Location Address')}</label>
        <textarea
          value={locationAddress}
          onChange={(e) => setLocationAddress(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 bg-white shadow-sm"
          rows={2}
          placeholder={t('e.g., 123 Ocean Drive, Marbella, Spain')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-slate-700">{t('Description')}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 bg-white shadow-sm"
          rows={4}
          placeholder={t('Brief description of the asset...')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-slate-700">{t('Capacity (guests)')}</label>
        <input
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 bg-white shadow-sm"
          placeholder={t('e.g., 8')}
          min="1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-slate-700">{t('Amenities (comma-separated)')}</label>
        <input
          type="text"
          value={amenities}
          onChange={(e) => setAmenities(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 bg-white shadow-sm"
          placeholder={t('e.g., Pool, WiFi, Parking')}
        />
      </div>

      <div className="pt-2 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">{t('Property Manager details')}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700">{t('Property Manager Name')}</label>
            <input
              type="text"
              value={propertyManagerName}
              onChange={(e) => setPropertyManagerName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 bg-white shadow-sm"
              placeholder={t('e.g., Andrea Molina')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700">{t('Property Manager Phone')}</label>
            <input
              type="text"
              value={propertyManagerPhone}
              onChange={(e) => setPropertyManagerPhone(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 bg-white shadow-sm"
              placeholder={t('e.g., +57 320 483 6784')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700">{t('Property Manager Email')}</label>
            <input
              type="email"
              value={propertyManagerEmail}
              onChange={(e) => setPropertyManagerEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 bg-white shadow-sm"
              placeholder={t('e.g., manager@example.com')}
            />
          </div>
        </div>
      </div>
      
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push('/admin/assets')}
          disabled={saving}
          className="flex-1 px-4 py-2 text-sm rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          {t('Cancel')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name || !location}
          className="flex-1 px-4 py-2 text-sm rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? t('Saving...') : t('Save Changes')}
        </button>
      </div>
    </div>
  );
}
