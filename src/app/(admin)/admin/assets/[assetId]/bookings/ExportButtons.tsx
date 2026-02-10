'use client';
import { useState } from 'react';
import { arrayToCSV, downloadCSV, generateFilename } from '@/lib/csvExport';

type Booking = {
  _id: string;
  user: { _id: string; name?: string; lastName?: string; email?: string } | string | null;
  startDate: string;
  endDate: string;
  status: string;
  isShortTerm?: boolean;
  specialDateType?: string;
  createdAt?: string;
};

type OwnerAllocation = {
  userId: string;
  label: string;
  sharePercentage: number;
  allocation?: any;
};

export default function ExportButtons({ 
  bookings, 
  owners, 
  assetName 
}: { 
  bookings: Booking[]; 
  owners: OwnerAllocation[];
  assetName: string;
}) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  
  const handleExportBookings = () => {
    setExporting('bookings');
    try {
      // Transform bookings for CSV
      const csvData = bookings.map(b => ({
        user_name: typeof b.user === 'object' && b.user ? [b.user?.name, b.user?.lastName].filter(Boolean).join(' ') : '',
        user_email: typeof b.user === 'object' && b.user ? b.user?.email || '' : '',
        asset_name: assetName,
        start_date: b.startDate,
        end_date: b.endDate,
        status: b.status,
        booking_type: b.isShortTerm ? 'Short-term' : 'Standard',
        special_date: b.specialDateType || 'None',
        created_at: b.createdAt || ''
      }));
      
      const columns = [
        { key: 'user_name' as const, header: 'User Name' },
        { key: 'user_email' as const, header: 'User Email' },
        { key: 'asset_name' as const, header: 'Asset' },
        { key: 'start_date' as const, header: 'Start Date' },
        { key: 'end_date' as const, header: 'End Date' },
        { key: 'status' as const, header: 'Status' },
        { key: 'booking_type' as const, header: 'Type' },
        { key: 'special_date' as const, header: 'Special Date' },
        { key: 'created_at' as const, header: 'Created At' }
      ];
      
      const csv = arrayToCSV(csvData, columns);
      const filename = generateFilename(`${assetName.replace(/\s+/g, '-')}-bookings`);
      downloadCSV(csv, filename);
      
      // Show success feedback
      setExportSuccess('Bookings exported successfully');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (error: any) {
      alert(`Export failed: ${error.message}`);
      console.error('CSV export error:', error);
    } finally {
      setExporting(null);
    }
  };
  
  const handleExportUsage = () => {
    setExporting('usage');
    try {
      // Transform owner allocations for CSV
      const csvData = owners.map(o => ({
        user_name: o.label,
        share_percentage: o.sharePercentage,
        allowed_days: o.allocation?.allowedDaysPerYear || 0,
        used_days: o.allocation?.daysBooked || 0,
        remaining_days: o.allocation?.daysRemaining || 0,
        window_start: o.allocation?.allocationWindow?.start || '',
        window_end: o.allocation?.allocationWindow?.end || '',
        active_bookings: o.allocation?.activeBookings || 0,
        penalty_days: o.allocation?.currentYearShortTermPenaltyDays || 0
      }));
      
      const columns = [
        { key: 'user_name' as const, header: 'User' },
        { key: 'share_percentage' as const, header: 'Share %' },
        { key: 'allowed_days' as const, header: 'Allowed Days' },
        { key: 'used_days' as const, header: 'Used Days' },
        { key: 'remaining_days' as const, header: 'Remaining Days' },
        { key: 'window_start' as const, header: 'Window Start' },
        { key: 'window_end' as const, header: 'Window End' },
        { key: 'active_bookings' as const, header: 'Active Bookings' },
        { key: 'penalty_days' as const, header: 'Penalty Days' }
      ];
      
      const csv = arrayToCSV(csvData, columns);
      const filename = generateFilename(`${assetName.replace(/\s+/g, '-')}-usage-summary`);
      downloadCSV(csv, filename);
      
      // Show success feedback
      setExportSuccess('Usage summary exported successfully');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (error: any) {
      alert(`Export failed: ${error.message}`);
      console.error('CSV export error:', error);
    } finally {
      setExporting(null);
    }
  };
  
  return (
    <>
      <div className="flex items-center gap-3">
        <button
          onClick={handleExportBookings}
          disabled={!!exporting || bookings.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
          title={bookings.length === 0 ? 'No bookings to export' : 'Export all bookings'}
        >
          {exporting === 'bookings' ? '⏳ Exporting...' : `📥 Export Bookings${bookings.length > 0 ? ` (${bookings.length})` : ''}`}
        </button>
        <button
          onClick={handleExportUsage}
          disabled={!!exporting || owners.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
          title={owners.length === 0 ? 'No owners to export' : 'Export usage summary'}
        >
          {exporting === 'usage' ? '⏳ Exporting...' : `📥 Export Usage Summary${owners.length > 0 ? ` (${owners.length})` : ''}`}
        </button>
      </div>
      
      {exportSuccess && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg z-50">
          ✓ {exportSuccess}
        </div>
      )}
    </>
  );
}
