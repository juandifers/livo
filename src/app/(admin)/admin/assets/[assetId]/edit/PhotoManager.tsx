'use client';
import { useState } from 'react';
import Cookies from 'js-cookie';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { mapCommonApiError } from '@/lib/i18n/errorMap';

type Photo = {
  url: string; // URL for existing photos
  file?: File; // File object for new uploads
  preview?: string; // Object URL for preview
};

export default function PhotoManager({
  assetId,
  initialPhotos = [],
  onPhotosChange
}: {
  assetId: string;
  initialPhotos?: string[];
  onPhotosChange?: (photos: string[]) => void;
}) {
  const { t, locale } = useI18n();
  const [photos, setPhotos] = useState<Photo[]>(
    initialPhotos.map(url => ({ url }))
  );
  const [uploading, setUploading] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const MAX_FILE_SIZE = 4 * 1024 * 1024; // Keep below Vercel request cap
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= MAX_FILE_SIZE;
      return isValidType && isValidSize;
    });
    
    if (validFiles.length !== files.length) {
      setError(t('Some files were rejected. Only images under 4MB are allowed.'));
    }
    
    const newPhotos = validFiles.map(file => ({
      url: '',
      file,
      preview: URL.createObjectURL(file)
    }));
    
    setPhotos([...photos, ...newPhotos]);
  };
  
  const handleUpload = async () => {
    const filesToUpload = photos.filter(p => p.file);
    if (filesToUpload.length === 0) return;
    
    setUploading(true);
    setError(null);
    
    try {
      // Get auth token from cookies
      const token = Cookies.get('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const uploadedUrls: string[] = [];

      // Upload one photo per request to stay under platform body limits.
      for (const photo of filesToUpload) {
        const formData = new FormData();
        if (photo.file) formData.append('photos', photo.file);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${assetId}/photos`,
          {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers
          }
        );

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new Error(body || t('Upload failed'));
        }

        const result = await response.json();
        uploadedUrls.push(...(result?.data?.photoUrls || []));
      }
      
      // Update photos state with uploaded URLs
      const updated = photos.map(p => {
        if (p.file) {
          const uploaded = uploadedUrls.shift();
          return { url: uploaded || p.url };
        }
        return p;
      });
      
      setPhotos(updated);
      if (onPhotosChange) {
        onPhotosChange(updated.map(p => p.url));
      }
      
      alert(t('Photos uploaded successfully'));
      
      // Reload page to show updated photos
      window.location.reload();
    } catch (err: any) {
      setError(mapCommonApiError(locale, err?.message || '', 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };
  
  const handleRemove = async (index: number) => {
    const photo = photos[index];
    if (!photo) return;

    // New/local files can be removed client-side only.
    if (photo.preview || photo.file || !photo.url) {
      if (photo.preview) URL.revokeObjectURL(photo.preview);
      const updated = photos.filter((_, i) => i !== index);
      setPhotos(updated);
      if (onPhotosChange) onPhotosChange(updated.map(p => p.url).filter(Boolean));
      return;
    }

    setDeletingIndex(index);
    setError(null);
    try {
      const token = Cookies.get('token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${assetId}/photos`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers,
          body: JSON.stringify({ photoUrl: photo.url })
        }
      );

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(body || t('Failed to delete photo'));
      }

      const updated = photos.filter((_, i) => i !== index);
      setPhotos(updated);
      if (onPhotosChange) onPhotosChange(updated.map(p => p.url).filter(Boolean));
    } catch (err: any) {
      setError(mapCommonApiError(locale, err?.message || '', 'Failed to delete photo'));
    } finally {
      setDeletingIndex(null);
    }
  };
  
  // Construct full URL for existing photos
  const getPhotoUrl = (photo: Photo) => {
    if (photo.preview) return photo.preview;
    if (photo.url.startsWith('http')) return photo.url;
    if (photo.url.startsWith('/')) return photo.url;
    return `/${photo.url}`;
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer">
          {t('Select Photos')}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
        {photos.some(p => p.file) && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {uploading
              ? t('Uploading...')
              : t('Upload {{count}} photo(s)', { count: photos.filter(p => p.file).length })}
          </button>
        )}
      </div>
      
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      {/* Photo grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {photos.map((photo, idx) => (
          <div key={idx} className="relative group">
            <img
              src={getPhotoUrl(photo)}
              alt={t('Asset photo {{index}}', { index: idx + 1 })}
              className="w-full h-32 object-cover rounded-lg border"
              onError={(e) => {
                // Fallback to placeholder on error
                e.currentTarget.src = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=300&fit=crop';
              }}
            />
            <button
              onClick={() => handleRemove(idx)}
              disabled={deletingIndex === idx}
              className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {deletingIndex === idx ? '…' : '✕'}
            </button>
            {photo.file && (
              <div className="absolute bottom-1 left-1 bg-amber-500 text-white text-xs px-2 py-1 rounded">
                {t('New')}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {photos.length === 0 && (
        <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
          {t('No photos yet. Click "Select Photos" to upload.')}
        </div>
      )}
    </div>
  );
}
