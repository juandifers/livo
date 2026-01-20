'use client';

import { useState, useEffect } from 'react';
import { clientFetchJson } from '@/lib/api.client';

type AllocationData = {
  currentYear?: {
    year: number;
    daysBooked: number;
    daysRemaining: number;
    extraDaysUsed: number;
    extraDaysRemaining: number;
    specialDateUsage: any;
    bookings: any[];
  };
  nextYear?: {
    year: number;
    daysBooked: number;
    daysRemaining: number;
    extraDaysUsed: number;
    extraDaysRemaining: number;
    specialDateUsage: any;
    bookings: any[];
  };
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
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [allocationData, setAllocationData] = useState<AllocationData | undefined>(allocation);
  const [isLoading, setIsLoading] = useState(false);

  const currentYear = new Date().getFullYear();
  
  // Only show years that have data available
  const availableYears: number[] = [];
  if (allocationData?.currentYear?.year) {
    availableYears.push(allocationData.currentYear.year);
  }
  if (allocationData?.nextYear?.year) {
    availableYears.push(allocationData.nextYear.year);
  }
  
  // If no data at all, show current year as fallback
  if (availableYears.length === 0) {
    availableYears.push(currentYear);
  }
  
  // Sort years
  availableYears.sort();
  
  // Auto-select first available year if current selection has no data
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const getCurrentYearData = () => {
    if (selectedYear === allocationData?.currentYear?.year) {
      return allocationData.currentYear;
    } else if (selectedYear === allocationData?.nextYear?.year) {
      return allocationData.nextYear;
    }
    return null;
  };

  const getActiveBookingsData = () => {
    if (selectedYear === allocationData?.currentYear?.year) {
      return {
        used: allocationData.currentYearActiveBookings || 0,
        remaining: allocationData.currentYearActiveBookingsRemaining || 0,
        shortTermCancelled: allocationData.currentYearShortTermCancelled || 0,
        penaltyDays: allocationData.currentYearShortTermPenaltyDays || 0
      };
    } else if (selectedYear === allocationData?.nextYear?.year) {
      return {
        used: allocationData.nextYearActiveBookings || 0,
        remaining: allocationData.nextYearActiveBookingsRemaining || 0,
        shortTermCancelled: allocationData.nextYearShortTermCancelled || 0,
        penaltyDays: allocationData.nextYearShortTermPenaltyDays || 0
      };
    }
    return { used: 0, remaining: 0, shortTermCancelled: 0, penaltyDays: 0 };
  };

  const yearData = getCurrentYearData();
  const activeBookingsData = getActiveBookingsData();

  // If no data for selected year, show a message but keep year selector accessible
  if (!yearData) {
    return (
      <div>
        {/* Year Selector - Always visible */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedYear === year
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* No Data Message */}
        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
          <div className="text-lg font-medium mb-2">No allocation data available</div>
          <div className="text-sm">for {selectedYear}</div>
          {availableYears.length > 0 && (
            <div className="text-xs mt-2 text-slate-400">
              Available years: {availableYears.join(', ')}
            </div>
          )}
        </div>
      </div>
    );
  }

  const allowedDays = yearData.daysBooked + yearData.daysRemaining;
  const usagePercentage = allowedDays > 0 ? Math.min(100, Math.round((yearData.daysBooked / allowedDays) * 100)) : 0;

  return (
    <div>
      {/* Year Selector */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedYear === year
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Allocation Summary */}
      <div className="bg-slate-50 rounded-lg p-4 mb-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">{selectedYear} Allocation</h3>
        </div>
        
        <div className="flex items-center gap-6 flex-wrap justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{yearData.daysBooked}</div>
            <div className="text-sm text-slate-600">Days Used</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{yearData.daysRemaining}</div>
            <div className="text-sm text-slate-600">Days Remaining</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{allowedDays}</div>
            <div className="text-sm text-slate-600">Total Allocation</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex-1 min-w-[300px] mx-auto">
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-slate-900 transition-all duration-300" style={{ width: `${usagePercentage}%` }} />
            </div>
            <div className="mt-1 text-xs text-slate-600 text-center">{usagePercentage}% of annual allocation used</div>
          </div>
        </div>
      </div>

      {/* Active Bookings and Special Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border p-3 bg-white">
          <div className="font-medium mb-2">Active Booking Slots</div>
          <div className="text-sm text-slate-700 mb-1">
            {activeBookingsData.used} of {activeBookingsData.used + activeBookingsData.remaining} used
          </div>
          {activeBookingsData.shortTermCancelled > 0 && (
            <div className="text-xs text-amber-600 mt-1">
              ⚠️ {activeBookingsData.shortTermCancelled} short-term cancellation{activeBookingsData.shortTermCancelled > 1 ? 's' : ''} 
              ({activeBookingsData.penaltyDays} penalty days)
            </div>
          )}
        </div>
        
        <div className="rounded-lg border p-3 bg-white">
          <div className="font-medium mb-2">Special Dates</div>
          <div className="text-sm text-slate-700">
            Type 1: {allocationData?.specialDates?.type1?.used || 0} / {allocationData?.specialDates?.type1?.total || 0}
          </div>
          <div className="text-sm text-slate-700">
            Type 2: {allocationData?.specialDates?.type2?.used || 0} / {allocationData?.specialDates?.type2?.total || 0}
          </div>
        </div>
      </div>

      {/* Extra Days */}
      {(yearData.extraDaysUsed > 0 || yearData.extraDaysRemaining > 0) && (
        <div className="mt-4 rounded-lg border p-3 bg-white">
          <div className="font-medium mb-2">Extra Days</div>
          <div className="text-sm text-slate-700">
            Used: {yearData.extraDaysUsed} | Remaining: {yearData.extraDaysRemaining}
          </div>
        </div>
      )}
    </div>
  );
}
