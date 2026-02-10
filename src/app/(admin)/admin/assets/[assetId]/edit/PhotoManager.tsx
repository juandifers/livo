'use client';
import { useState } from 'react';
import Cookies from 'js-cookie';

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
  const [photos, setPhotos] = useState<Photo[]>(
    initialPhotos.map(url => ({ url }))
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      return isValidType && isValidSize;
    });
    
    if (validFiles.length !== files.length) {
      setError('Some files were rejected. Only images under 5MB are allowed.');
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
      const formData = new FormData();
      filesToUpload.forEach(p => {
        if (p.file) formData.append('photos', p.file);
      });
      
      // Get auth token from cookies
      const token = Cookies.get('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${assetId}/photos`,
        { 
          method: 'POST', 
          body: formData,
          credentials: 'include',
          headers
        }
      );
      
      if (!response.ok) throw new Error('Upload failed');
      
      const result = await response.json();
      const uploadedUrls = result.data.photoUrls || [];
      
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
      
      alert('Photos uploaded successfully');
      
      // Reload page to show updated photos
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };
  
  const handleRemove = (index: number) => {
    const photo = photos[index];
    if (photo.preview) URL.revokeObjectURL(photo.preview);
    setPhotos(photos.filter((_, i) => i !== index));
  };
  
  // Construct full URL for existing photos
  const getPhotoUrl = (photo: Photo) => {
    if (photo.preview) return photo.preview;
    if (photo.url.startsWith('http')) return photo.url;
    // Construct full URL for relative paths
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || '';
    return `${baseUrl}${photo.url}`;
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer">
          Select Photos
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
            {uploading ? 'Uploading...' : `Upload ${photos.filter(p => p.file).length} photo(s)`}
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
              alt={`Asset photo ${idx + 1}`}
              className="w-full h-32 object-cover rounded-lg border"
              onError={(e) => {
                // Fallback to placeholder on error
                e.currentTarget.src = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=300&fit=crop';
              }}
            />
            <button
              onClick={() => handleRemove(idx)}
              className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
            {photo.file && (
              <div className="absolute bottom-1 left-1 bg-amber-500 text-white text-xs px-2 py-1 rounded">
                New
              </div>
            )}
          </div>
        ))}
      </div>
      
      {photos.length === 0 && (
        <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
          No photos yet. Click &quot;Select Photos&quot; to upload.
        </div>
      )}
    </div>
  );
}
