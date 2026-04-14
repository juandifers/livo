'use client';
import { useState } from 'react';
import { arrayToCSV, downloadCSV, generateFilename } from '@/lib/csvExport';
import { useI18n } from '@/lib/i18n/I18nProvider';

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
  const { t } = useI18n();
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
        booking_type: b.isShortTerm ? t('Short-term') : t('Standard'),
        special_date: b.specialDateType || t('None'),
        created_at: b.createdAt || ''
      }));
      
      const columns = [
        { key: 'user_name' as const, header: t('User Name') },
        { key: 'user_email' as const, header: t('User Email') },
        { key: 'asset_name' as const, header: t('Asset') },
        { key: 'start_date' as const, header: t('Start Date') },
        { key: 'end_date' as const, header: t('End Date') },
        { key: 'status' as const, header: t('Status') },
        { key: 'booking_type' as const, header: t('Type') },
        { key: 'special_date' as const, header: t('Special Date') },
        { key: 'created_at' as const, header: t('Created At') }
      ];
      
      const csv = arrayToCSV(csvData, columns);
      const filename = generateFilename(`${assetName.replace(/\s+/g, '-')}-bookings`);
      downloadCSV(csv, filename);
      
      // Show success feedback
      setExportSuccess(t('Bookings exported successfully'));
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (error: any) {
      alert(t('Export failed: {{message}}', { message: error.message }));
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
        { key: 'user_name' as const, header: t('User') },
        { key: 'share_percentage' as const, header: t('Share %') },
        { key: 'allowed_days' as const, header: t('Allowed Days') },
        { key: 'used_days' as const, header: t('Used Days') },
        { key: 'remaining_days' as const, header: t('Remaining Days') },
        { key: 'window_start' as const, header: t('Window Start') },
        { key: 'window_end' as const, header: t('Window End') },
        { key: 'active_bookings' as const, header: t('Active Bookings') },
        { key: 'penalty_days' as const, header: t('Penalty Days') }
      ];
      
      const csv = arrayToCSV(csvData, columns);
      const filename = generateFilename(`${assetName.replace(/\s+/g, '-')}-usage-summary`);
      downloadCSV(csv, filename);
      
      // Show success feedback
      setExportSuccess(t('Usage summary exported successfully'));
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (error: any) {
      alert(t('Export failed: {{message}}', { message: error.message }));
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
          title={bookings.length === 0 ? t('No bookings to export') : t('Export all bookings')}
        >
          {exporting === 'bookings'
            ? t('Exporting...')
            : t('Export Bookings{{count}}', {
                count: bookings.length > 0 ? ` (${bookings.length})` : '',
              })}
        </button>
        <button
          onClick={handleExportUsage}
          disabled={!!exporting || owners.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
          title={owners.length === 0 ? t('No owners to export') : t('Export usage summary')}
        >
          {exporting === 'usage'
            ? t('Exporting...')
            : t('Export Usage Summary{{count}}', {
                count: owners.length > 0 ? ` (${owners.length})` : '',
              })}
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
