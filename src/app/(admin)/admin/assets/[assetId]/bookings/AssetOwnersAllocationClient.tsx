'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import YearSelectorClient from '../../../users/[userId]/bookings/YearSelectorClient';

type OwnerAllocation = {
  userId: string;
  label: string;
  sharePercentage: number;
  allocation?: any; // Type from AllocationResp
};

export default function AssetOwnersAllocationClient({ 
  owners, 
  assetId 
}: { 
  owners: OwnerAllocation[]; 
  assetId: string;
}) {
  const [query, setQuery] = useState('');
  
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return owners;
    
    // Split into terms for multi-word search
    const terms = q.split(/\s+/).filter(Boolean);
    
    return owners.filter((o) => {
      const label = o.label.toLowerCase();
      // All terms must match (AND logic)
      return terms.every(term => label.includes(term));
    });
  }, [owners, query]);
  
  return (
    <div className="rounded-xl border bg-white shadow-sm p-4 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold">Allocation by Owner</div>
        <div className="text-xs text-slate-600">Rolling anniversary allocation window (12 months)</div>
      </div>
      
      {/* Search Input */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="w-full border rounded-lg px-3 py-2 pr-10 bg-white shadow-sm focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
            aria-label="Search owners by name or email"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <span className="text-sm text-slate-500 whitespace-nowrap">
          {filtered.length} / {owners.length} owner{owners.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      {/* Owner Allocation Cards */}
      <div className="space-y-6">
        {filtered.map((o) => (
          <div key={o.userId} className="rounded-lg border p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Link 
                  href={`/admin/users/${o.userId}/bookings`}
                  className="font-medium hover:text-slate-900 hover:underline"
                >
                  {o.label}
                </Link>
                <div className="text-xs text-slate-600">Share: {o.sharePercentage}%</div>
              </div>
            </div>
            
            <YearSelectorClient 
              userId={o.userId} 
              assetId={assetId} 
              allocation={o.allocation}
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-6 text-center text-slate-500">No matching owners</div>
        )}
      </div>
    </div>
  );
}
