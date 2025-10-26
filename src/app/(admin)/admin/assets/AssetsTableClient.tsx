'use client';
import { useState } from 'react';
import Link from 'next/link';
import { clientFetchJson } from '@/lib/api.client';

type Owner = { user?: { _id: string; name?: string; lastName?: string; email: string } | string; sharePercentage: number };
type Asset = { _id: string; name: string; type?: string; location?: string; owners?: Owner[] };

export default function AssetsTableClient({ assets }: { assets: Asset[] }) {
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'boat' | 'home'>('home');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [amenities, setAmenities] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleCreateAsset = async () => {
    if (!name || !location) {
      setSubmitError('Name and location are required');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const amenitiesArray = amenities
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);

      const assetData: any = {
        name,
        type,
        location,
        description: description || undefined,
        capacity: capacity ? parseInt(capacity) : undefined,
        amenities: amenitiesArray.length > 0 ? amenitiesArray : undefined,
      };

      const response = await clientFetchJson('/assets', {
        method: 'POST',
        body: JSON.stringify(assetData),
      }) as { data: { _id: string } };

      // Upload photos if any
      if (photos.length > 0) {
        try {
          const photoUrls = await uploadPhotos(response.data._id);
          // Update asset with photo URLs
          await clientFetchJson(`/assets/${response.data._id}`, {
            method: 'PUT',
            body: JSON.stringify({ photos: photoUrls }),
          });
        } catch (photoError) {
          console.error('Photo upload failed:', photoError);
          setSubmitError('Asset created but photo upload failed. You can add photos later.');
        }
      }

      // Reset form
      setName('');
      setType('home');
      setDescription('');
      setLocation('');
      setCapacity('');
      setAmenities('');
      setPhotos([]);
      setPhotoPreviews([]);
      setShowAddAsset(false);

      // Reload page to show new asset
      window.location.reload();
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to create asset');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setSubmitError('Some files were rejected. Only images under 5MB are allowed.');
    }

    const newPhotos = [...photos, ...validFiles];
    setPhotos(newPhotos);

    // Create previews
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setPhotoPreviews([...photoPreviews, ...newPreviews]);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = photoPreviews.filter((_, i) => i !== index);
    
    // Revoke the object URL to free memory
    URL.revokeObjectURL(photoPreviews[index]);
    
    setPhotos(newPhotos);
    setPhotoPreviews(newPreviews);
  };

  const uploadPhotos = async (assetId: string) => {
    if (photos.length === 0) return [];

    const formData = new FormData();
    photos.forEach(photo => {
      formData.append('photos', photo);
    });

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${assetId}/photos`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload photos');
    }

    const result = await response.json();
    return result.data.photoUrls;
  };

  const handleCancelAdd = () => {
    setShowAddAsset(false);
    setName('');
    setType('home');
    setDescription('');
    setLocation('');
    setCapacity('');
    setAmenities('');
    setPhotos([]);
    setPhotoPreviews([]);
    setSubmitError(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Assets</h1>
        <button
          onClick={() => setShowAddAsset(v => !v)}
          className="rounded bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800"
        >
          {showAddAsset ? 'Cancel' : 'Add New Asset'}
        </button>
      </div>

      {showAddAsset && (
        <div className="mb-6 rounded-xl border bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Create New Asset</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm text-slate-600 mb-1">Asset Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border rounded-lg px-3 py-2 bg-white shadow-sm"
                placeholder="e.g., Luxury Villa Marbella"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-slate-600 mb-1">Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'boat' | 'home')}
                className="border rounded-lg px-3 py-2 bg-white shadow-sm"
              >
                <option value="home">Home</option>
                <option value="boat">Boat</option>
              </select>
            </div>

            <div className="flex flex-col md:col-span-2">
              <label className="text-sm text-slate-600 mb-1">Location *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="border rounded-lg px-3 py-2 bg-white shadow-sm"
                placeholder="e.g., Marbella, Spain"
              />
            </div>

            <div className="flex flex-col md:col-span-2">
              <label className="text-sm text-slate-600 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border rounded-lg px-3 py-2 bg-white shadow-sm"
                rows={3}
                placeholder="Brief description of the asset..."
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-slate-600 mb-1">Capacity (guests)</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="border rounded-lg px-3 py-2 bg-white shadow-sm"
                placeholder="e.g., 8"
                min="1"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-slate-600 mb-1">Amenities (comma-separated)</label>
              <input
                type="text"
                value={amenities}
                onChange={(e) => setAmenities(e.target.value)}
                className="border rounded-lg px-3 py-2 bg-white shadow-sm"
                placeholder="e.g., Pool, WiFi, Parking"
              />
            </div>

            <div className="flex flex-col md:col-span-2">
              <label className="text-sm text-slate-600 mb-1">Photos</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer flex flex-col items-center justify-center py-4 text-slate-600 hover:text-slate-800"
                >
                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-sm">Click to upload photos</span>
                  <span className="text-xs text-slate-500">Max 5MB per image</span>
                </label>
              </div>
              
              {photoPreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">
              <strong>Note:</strong> The asset will be created with 0% ownership. 
              Ownership shares can be added later as they are sold through the asset's booking page.
            </p>
          </div>

          {submitError && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded">
              {submitError}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleCancelAdd}
              disabled={submitting}
              className="flex-1 px-4 py-2 text-sm rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateAsset}
              disabled={submitting || !name || !location}
              className="flex-1 px-4 py-2 text-sm rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Asset'}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-[800px] w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Location</th>
              <th className="text-left p-3">Ownership</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => {
              const totalOwnership = Array.isArray(a.owners)
                ? a.owners.reduce((sum, o) => sum + (o.sharePercentage || 0), 0)
                : 0;
              const ownerNames = Array.isArray(a.owners) && a.owners.length > 0
                ? a.owners
                    .map((o) => {
                      const u = o.user && typeof o.user === 'object' ? (o.user as any) : null;
                      if (u) {
                        const full = [u.name, u.lastName].filter(Boolean).join(' ');
                        return full || u.email;
                      }
                      return null;
                    })
                    .filter(Boolean)
                    .join(', ')
                : 'No owners';

              return (
                <tr key={a._id} className="border-b last:border-0">
                  <td className="p-3 font-medium text-slate-800">{a.name}</td>
                  <td className="p-3 capitalize">{a.type || '—'}</td>
                  <td className="p-3">{a.location || '—'}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <span className={`text-xs font-medium ${totalOwnership === 100 ? 'text-green-700' : totalOwnership === 0 ? 'text-slate-500' : 'text-amber-700'}`}>
                        {totalOwnership.toFixed(1)}% sold
                      </span>
                      <span className="text-xs text-slate-600 truncate max-w-[200px]" title={ownerNames}>
                        {ownerNames}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/admin/assets/${a._id}/bookings`}
                      className="inline-block rounded bg-slate-900 text-white px-3 py-1.5 text-xs hover:bg-slate-800"
                    >
                      View bookings
                    </Link>
                  </td>
                </tr>
              );
            })}
            {assets.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No assets found. Click "Add New Asset" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

