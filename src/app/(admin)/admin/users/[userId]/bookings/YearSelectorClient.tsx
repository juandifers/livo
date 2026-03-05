'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { clientFetchJson } from '@/lib/api.client';
import { useI18n } from '@/lib/i18n/I18nProvider';

type AllocationData = {
  currentWindow?: { start: string; end: string };
  nextWindow?: { start: string; end: string };
  currentYear?: {
    year: number;
    windowStart?: string;
    windowEnd?: string;
    daysBooked: number;
    daysRemaining: number;
    extraDaysUsed: number;
    extraDaysRemaining: number;
    specialDateUsage: any;
    penaltyDays?: number;
    penaltyBookings?: any[];
    bookings: any[];
  };
  nextYear?: {
    year: number;
    windowStart?: string;
    windowEnd?: string;
    daysBooked: number;
    daysRemaining: number;
    extraDaysUsed: number;
    extraDaysRemaining: number;
    specialDateUsage: any;
    penaltyDays?: number;
    penaltyBookings?: any[];
    bookings: any[];
  };
  // FEAT-ACTIVE-001: Universal active bookings counter (primary fields)
  activeBookingsUsed?: number;
  activeBookingsRemaining?: number;
  // Legacy year-specific fields (deprecated, kept for backward compatibility)
  currentYearActiveBookings?: number;
  currentYearActiveBookingsRemaining?: number;
  nextYearActiveBookings?: number;
  nextYearActiveBookingsRemaining?: number;
  currentYearShortTermCancelled?: number;
  nextYearShortTermCancelled?: number;
  currentYearShortTermPenaltyDays?: number;
  nextYearShortTermPenaltyDays?: number;
  specialDates?: {
    type1: { used: number; total: number };
    type2: { used: number; total: number };
  };
};

interface YearSelectorClientProps {
  userId: string;
  assetId: string;
  allocation: AllocationData | undefined;
}

export default function YearSelectorClient({ userId, assetId, allocation }: YearSelectorClientProps) {
  const { t } = useI18n();
  const [selectedKey, setSelectedKey] = useState<'current' | 'next'>('current');
  const [allocationData, setAllocationData] = useState<AllocationData | undefined>(allocation);

  useEffect(() => {
    setAllocationData(allocation);
  }, [allocation]);

  const refreshAllocation = useCallback(async () => {
    try {
      const res = await clientFetchJson<{ success: boolean; data: AllocationData }>(
        `/bookings/allocation/${encodeURIComponent(userId)}/${encodeURIComponent(assetId)}`
      );
      setAllocationData(res?.data);
    } catch {
      // Keep current values if refresh fails.
    }
  }, [userId, assetId]);

  useEffect(() => {
    const onBookingUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ assetId?: string; userId?: string }>).detail || {};
      if (detail.assetId && detail.assetId !== assetId) return;
      if (detail.userId && detail.userId !== userId) return;
      void refreshAllocation();
    };

    window.addEventListener('livo:booking-updated', onBookingUpdated);
    return () => window.removeEventListener('livo:booking-updated', onBookingUpdated);
  }, [assetId, userId, refreshAllocation]);

  const windowOptions = useMemo(() => {
    const opts: { key: 'current' | 'next'; label: string; data: any }[] = [];
    const cur = allocationData?.currentYear;
    const nxt = allocationData?.nextYear;
    if (cur) {
      const label =
        (allocationData?.currentWindow?.start && allocationData?.currentWindow?.end)
          ? `${allocationData.currentWindow.start} → ${allocationData.currentWindow.end}`
          : (cur.windowStart && cur.windowEnd ? `${cur.windowStart} → ${cur.windowEnd}` : t('Loading...'));
      opts.push({ key: 'current', label, data: cur });
    }
    if (nxt) {
      const label =
        (allocationData?.nextWindow?.start && allocationData?.nextWindow?.end)
          ? `${allocationData.nextWindow.start} → ${allocationData.nextWindow.end}`
          : (nxt.windowStart && nxt.windowEnd ? `${nxt.windowStart} → ${nxt.windowEnd}` : t('Loading...'));
      opts.push({ key: 'next', label, data: nxt });
    }
    // If allocation hasn't arrived yet, still render two options (both as Loading...)
    return opts.length > 0
      ? opts
      : [
          { key: 'current' as const, label: t('Loading...'), data: null },
          { key: 'next' as const, label: t('Loading...'), data: null },
        ];
  }, [allocationData, t]);

  useEffect(() => {
    // Auto-select first available window if selection is not available
    if (windowOptions.length > 0 && !windowOptions.some((o) => o.key === selectedKey)) {
      setSelectedKey(windowOptions[0].key);
    }
  }, [windowOptions, selectedKey]);

  const selected = useMemo(() => windowOptions.find((o) => o.key === selectedKey) || windowOptions[0], [windowOptions, selectedKey]);
  const yearData = selected?.data || null;

  // FEAT-USAGE-BAR-001: Calculate used vs. booked breakdown
  const usageBreakdown = useMemo(() => {
    if (!yearData || !yearData.bookings) {
      return { usedDays: 0, bookedDays: 0, remainingDays: 0, allowedDays: 0 };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight for comparison
    
    let usedDays = 0;
    let bookedDays = 0;
    
    yearData.bookings.forEach((b: any) => {
      // Extra-day bookings do not consume the standard allocation bucket.
      if (b.isExtraDays) {
        return;
      }

      // Skip cancelled bookings (unless penalty)
      if (b.status === 'cancelled' && !b.shortTermCancelled) {
        return;
      }
      
      // For penalty bookings, use remainingPenaltyDays
      if (b.status === 'cancelled' && b.shortTermCancelled) {
        // Penalty days are "used" (already consumed)
        usedDays += b.remainingPenaltyDays || 0;
        return;
      }
      
      const endDate = new Date(b.endDate);
      endDate.setHours(0, 0, 0, 0);
      
      if (endDate < today) {
        // Booking has ended → used
        usedDays += b.days || 0;
      } else {
        // Booking is current or future → booked
        bookedDays += b.days || 0;
      }
    });
    
    const allowedDays = yearData.daysBooked + yearData.daysRemaining;
    const remainingDays = yearData.daysRemaining;
    
    return { usedDays, bookedDays, remainingDays, allowedDays };
  }, [yearData]);

  const getActiveBookingsData = () => {
    // FEAT-ACTIVE-001: Display universal active bookings counter (does not change with year selection)
    const a = allocationData;
    if (!a) return { used: 0, remaining: 0, shortTermCancelled: 0, penaltyDays: 0 };

    // Use universal counter fields if available (FEAT-ACTIVE-001)
    // Fall back to year-specific fields for backward compatibility
    const universalUsed = a.activeBookingsUsed;
    const universalRemaining = a.activeBookingsRemaining;
    
    if (universalUsed !== undefined && universalRemaining !== undefined) {
      // Use universal counter (doesn't change based on selected year/window)
      return {
        used: universalUsed,
        remaining: universalRemaining,
        // Short-term cancelled stats are still aggregated across all years
        shortTermCancelled: (a.currentYearShortTermCancelled || 0) + (a.nextYearShortTermCancelled || 0),
        penaltyDays: (a.currentYearShortTermPenaltyDays || 0) + (a.nextYearShortTermPenaltyDays || 0)
      };
    }

    // Legacy fallback: year-specific counters (deprecated)
    if (selectedKey === 'current') {
      return {
        used: a.currentYearActiveBookings || 0,
        remaining: a.currentYearActiveBookingsRemaining || 0,
        shortTermCancelled: a.currentYearShortTermCancelled || 0,
        penaltyDays: a.currentYearShortTermPenaltyDays || 0
      };
    } else if (selectedKey === 'next') {
      return {
        used: a.nextYearActiveBookings || 0,
        remaining: a.nextYearActiveBookingsRemaining || 0,
        shortTermCancelled: a.nextYearShortTermCancelled || 0,
        penaltyDays: a.nextYearShortTermPenaltyDays || 0
      };
    }
    return { used: 0, remaining: 0, shortTermCancelled: 0, penaltyDays: 0 };
  };

  const activeBookingsData = getActiveBookingsData();

  // If no data for selected year, show a message but keep year selector accessible
  if (!yearData) {
    return (
      <div>
        {/* Window Selector - Always visible */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            {windowOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSelectedKey(opt.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedKey === opt.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* No Data Message */}
        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
          <div className="text-lg font-medium mb-2">{t('No allocation data available')}</div>
          <div className="text-sm">{t('for selected window')}</div>
          {windowOptions.length > 0 && (
            <div className="text-xs mt-2 text-slate-400">
              {t('Available windows: {{value}}', { value: windowOptions.map((o) => o.label).join(', ') })}
            </div>
          )}
        </div>
      </div>
    );
  }

  const allowedDays = yearData.daysBooked + yearData.daysRemaining;
  const usagePercentage = allowedDays > 0 ? Math.min(100, Math.round((yearData.daysBooked / allowedDays) * 100)) : 0;
  const windowLabel =
    yearData.windowStart && yearData.windowEnd
      ? `${yearData.windowStart} → ${yearData.windowEnd}`
      : selected?.label || t('Allocation window');

  return (
    <div>
      {/* Window Selector */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
          {windowOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSelectedKey(opt.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedKey === opt.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Allocation Summary */}
      <div className="bg-slate-50 rounded-lg p-4 mb-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">{t('Allocation Window')}</h3>
          <div className="text-xs text-slate-600 mt-1">{windowLabel}</div>
        </div>
        
        <div className="flex items-center gap-6 flex-wrap justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-700">{usageBreakdown.usedDays}</div>
            <div className="text-sm text-slate-600">{t('Used (past)')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-sky-600">{usageBreakdown.bookedDays}</div>
            <div className="text-sm text-slate-600">{t('Booked (future)')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-500">{usageBreakdown.remainingDays}</div>
            <div className="text-sm text-slate-600">{t('Remaining')}</div>
          </div>
          <div className="text-center border-l border-slate-300 pl-6">
            <div className="text-2xl font-bold text-slate-900">{usageBreakdown.allowedDays}</div>
            <div className="text-sm text-slate-600">{t('Total Allocation')}</div>
          </div>
        </div>

        {/* Segmented Progress Bar */}
        <div className="mt-4">
          <div className="flex-1 min-w-[300px] mx-auto">
            <div className="h-4 bg-slate-200 rounded-full overflow-hidden flex">
              {/* Used segment (dark green) */}
              <div 
                className="h-full bg-green-700 transition-all duration-300"
                style={{ 
                  width: usageBreakdown.allowedDays > 0 
                    ? `${(usageBreakdown.usedDays / usageBreakdown.allowedDays) * 100}%` 
                    : '0%' 
                }}
                title={t('Used: {{days}} days', { days: usageBreakdown.usedDays })}
              />
              {/* Booked segment (light blue) */}
              <div 
                className="h-full bg-sky-400 transition-all duration-300"
                style={{ 
                  width: usageBreakdown.allowedDays > 0 
                    ? `${(usageBreakdown.bookedDays / usageBreakdown.allowedDays) * 100}%` 
                    : '0%' 
                }}
                title={t('Booked: {{days}} days', { days: usageBreakdown.bookedDays })}
              />
              {/* Remaining is implicit (bg-slate-200 background) */}
            </div>
            
            {/* Color legend */}
            <div className="mt-2 flex items-center justify-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-700 rounded" />
                {t('Used (completed)')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-sky-400 rounded" />
                {t('Booked (upcoming)')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-slate-200 rounded border border-slate-300" />
                {t('Remaining')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Bookings and Special Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border p-3 bg-white">
          <div className="font-medium mb-2">{t('Active Booking Slots')}</div>
          <div className="text-sm text-slate-700 mb-1">
            {t('{{used}} of {{total}} used', {
              used: activeBookingsData.used,
              total: activeBookingsData.used + activeBookingsData.remaining,
            })}
          </div>
          {activeBookingsData.shortTermCancelled > 0 && (
            <div className="text-xs text-amber-600 mt-1">
              {t(
                '{{count}} short-term cancellation{{suffix}} ({{days}} penalty days)',
                {
                  count: activeBookingsData.shortTermCancelled,
                  suffix: activeBookingsData.shortTermCancelled > 1 ? 's' : '',
                  days: activeBookingsData.penaltyDays,
                },
              )}
            </div>
          )}
        </div>
        
        <div className="rounded-lg border p-3 bg-white">
          <div className="font-medium mb-2">{t('Special Dates')}</div>
          <div className="text-sm text-slate-700">
            {t('Type 1')}: {allocationData?.specialDates?.type1?.used || 0} / {allocationData?.specialDates?.type1?.total || 0}
          </div>
          <div className="text-sm text-slate-700">
            {t('Type 2')}: {allocationData?.specialDates?.type2?.used || 0} / {allocationData?.specialDates?.type2?.total || 0}
          </div>
        </div>
      </div>

      {/* Cancellation Penalties - Detailed Breakdown */}
      {yearData.penaltyDays > 0 && yearData.penaltyBookings && yearData.penaltyBookings.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 p-4 bg-amber-50">
          <div className="font-medium mb-3 text-amber-900 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {t('Cancellation Penalties')}
          </div>
          <div className="text-sm text-amber-800 mb-3">
            <strong>
              {t('{{days}} penalty day{{suffix}}', {
                days: yearData.penaltyDays,
                suffix: yearData.penaltyDays !== 1 ? 's' : '',
              })}
            </strong>{' '}
            {t('from {{count}} cancelled booking{{suffix}}', {
              count: yearData.penaltyBookings.length,
              suffix: yearData.penaltyBookings.length !== 1 ? 's' : '',
            })}
          </div>
          <div className="text-xs text-amber-700 mb-3">
            {t('These days count as used unless rebooked (showing future penalties only)')}
          </div>
          
          {/* Detailed penalty bookings list */}
          <div className="space-y-2">
            {yearData.penaltyBookings.map((pb: any) => (
              <div key={pb.id} className="bg-white rounded border border-amber-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">
                      {pb.startDate} to {pb.endDate}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {t('Cancelled: {{value}}', { value: pb.cancelledAt })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-amber-900">
                      {t('{{days}} day{{suffix}}', {
                        days: pb.remainingPenaltyDays,
                        suffix: pb.remainingPenaltyDays !== 1 ? 's' : '',
                      })}
                    </div>
                    <div className="text-xs text-slate-600">
                      {t('penalty')}
                    </div>
                  </div>
                </div>
                
                {/* Refund progress */}
                {pb.rebookedDays > 0 && (
                  <div className="mt-2 pt-2 border-t border-amber-100">
                    <div className="text-xs text-green-700">
                      {t('{{rebooked}} of {{original}} day{{suffix}} refunded by other bookings', {
                        rebooked: pb.rebookedDays,
                        original: pb.originalDays,
                        suffix: pb.originalDays !== 1 ? 's' : '',
                      })}
                    </div>
                    <div className="mt-1 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${(pb.rebookedDays / pb.originalDays) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extra Days */}
      {(yearData.extraDaysUsed > 0 || yearData.extraDaysRemaining > 0) && (
        <div className="mt-4 rounded-lg border p-3 bg-white">
          <div className="font-medium mb-2">{t('Extra Days')}</div>
          <div className="text-sm text-slate-700">
            {t('Used: {{used}} | Remaining: {{remaining}}', {
              used: yearData.extraDaysUsed,
              remaining: yearData.extraDaysRemaining,
            })}
          </div>
        </div>
      )}
    </div>
  );
}
