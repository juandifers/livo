'use client';
import { useState } from 'react';
import { clientFetchJson } from '@/lib/api.client';
import { useRouter } from 'next/navigation';

type Asset = {
  _id: string;
  name: string;
  type: 'boat' | 'home';
  description?: string;
  location: string;
  capacity?: number;
  amenities?: string[];
};

export default function AssetEditForm({ asset }: { asset: Asset }) {
  const router = useRouter();
  const [name, setName] = useState(asset.name || '');
  const [description, setDescription] = useState(asset.description || '');
  const [location, setLocation] = useState(asset.location || '');
  const [capacity, setCapacity] = useState(String(asset.capacity || ''));
  const [amenities, setAmenities] = useState(
    Array.isArray(asset.amenities) ? asset.amenities.join(', ') : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSave = async () => {
    if (!name || !location) {
      setError('Name and location are required');
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      const amenitiesArray = amenities
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);

      await clientFetchJson(`/assets/${asset._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          description: description || undefined,
          location,
          capacity: capacity ? parseInt(capacity) : undefined,
          amenities: amenitiesArray.length > 0 ? amenitiesArray : undefined
        })
      });
      
      alert('Asset updated successfully');
      router.push('/admin/assets');
    } catch (err: any) {
      setError(err.message || 'Failed to update asset');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1 text-slate-700">Asset Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 bg-white shadow-sm"
          placeholder="e.g., Luxury Villa Marbella"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-slate-700">Location *</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 bg-white shadow-sm"
          placeholder="e.g., Marbella, Spain"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-slate-700">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 bg-white shadow-sm"
          rows={4}
          placeholder="Brief description of the asset..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-slate-700">Capacity (guests)</label>
        <input
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 bg-white shadow-sm"
          placeholder="e.g., 8"
          min="1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-slate-700">Amenities (comma-separated)</label>
        <input
          type="text"
          value={amenities}
          onChange={(e) => setAmenities(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 bg-white shadow-sm"
          placeholder="e.g., Pool, WiFi, Parking"
        />
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
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name || !location}
          className="flex-1 px-4 py-2 text-sm rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
