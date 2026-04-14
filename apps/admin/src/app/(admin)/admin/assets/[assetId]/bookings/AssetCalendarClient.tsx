'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientFetchJson } from '@/lib/api.client';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { mapCommonApiError } from '@/lib/i18n/errorMap';
import TwoStepConfirmModal from '@/components/admin/TwoStepConfirmModal';

type AvailabilityDay = {
  available: boolean;
  bookings: { bookingId: string; userId: string }[];
  blocks?: { blockId: string; blockType: string; reason: string }[];
};

type AvailabilityResp = {
  success: boolean;
  data: {
    calendar: Record<string, AvailabilityDay>;
    specialDates: { type1: string[]; type2: string[] };
  };
};

type BookingDetail = {
  _id: string;
  user: { name?: string; lastName?: string; email?: string } | string;
  startDate: string;
  endDate: string;
  status: string;
};

type BlockedDate = {
  _id: string;
  asset: string;
  startDate: string;
  endDate: string;
  blockType: 'maintenance' | 'rental' | 'other';
  reason: string;
  createdByAdminId: string;
  createdAt: string;
};

export default function AssetCalendarClient({ assetId, viewUserId }: { assetId: string; viewUserId?: string }) {
  const { t, formatDate, locale } = useI18n();
  const today = new Date();
  const router = useRouter();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth()); // 0-based
  const [calendar, setCalendar] = useState<Record<string, AvailabilityDay>>({});
  const [specialType1, setSpecialType1] = useState<string[]>([]);
  const [specialType2, setSpecialType2] = useState<string[]>([]);
  const [userLabels, setUserLabels] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<BookingDetail[] | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showAllOwners, setShowAllOwners] = useState(false);
  const [owners, setOwners] = useState<{ userId: string; label: string }[]>([]);
  const [assetType, setAssetType] = useState<'boat' | 'home' | string>('home');
  const [createStart, setCreateStart] = useState<string | null>(null);
  const [createEnd, setCreateEnd] = useState<string | null>(null);
  const [createUserId, setCreateUserId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [ownerBookings, setOwnerBookings] = useState<Record<string, { startDate: string; endDate: string; status: string }[]>>({});
  
  // FEAT-ADMIN-BLOCK-001: Blocked dates state
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [showBlockUI, setShowBlockUI] = useState(false);
  const [blockStart, setBlockStart] = useState<string | null>(null);
  const [blockEnd, setBlockEnd] = useState<string | null>(null);
  const [blockType, setBlockType] = useState<'maintenance' | 'rental' | 'other'>('maintenance');
  const [blockReason, setBlockReason] = useState('');
  const [isCreatingBlock, setIsCreatingBlock] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<any>(null);
  const [showCreateBookingConfirmModal, setShowCreateBookingConfirmModal] = useState(false);
  const [showCreateBlockConfirmModal, setShowCreateBlockConfirmModal] = useState(false);
  const [showForceCreateBlockConfirmModal, setShowForceCreateBlockConfirmModal] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<BlockedDate | null>(null);
  const [isDeletingBlock, setIsDeletingBlock] = useState(false);
  const [deleteBlockError, setDeleteBlockError] = useState<string | null>(null);
  const weekdays = useMemo(
    () => (locale === 'es' ? ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']),
    [locale]
  );

  // Stable color palette and mapping for consistent owner colors
  const colorPalette = useMemo(
    () => [
      '#0ea5e9', // sky-500
      '#10b981', // emerald-500
      '#f59e0b', // amber-500
      '#6366f1', // indigo-500
      '#ef4444', // red-500
      '#14b8a6', // teal-500
      '#a855f7', // violet-500
      '#22c55e', // green-500
      '#eab308', // yellow-500
      '#3b82f6', // blue-500
      '#f97316', // orange-500
      '#06b6d4', // cyan-500
      '#d946ef', // fuchsia-500
      '#84cc16', // lime-500
      '#fb7185'  // rose-400
    ],
    []
  );
  const userColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    owners.forEach((o, idx) => {
      map[o.userId] = colorPalette[idx % colorPalette.length];
    });
    return map;
  }, [owners, colorPalette]);

  const firstDay = useMemo(() => new Date(year, month, 1), [year, month]);
  const lastDay = useMemo(() => new Date(year, month + 1, 0), [year, month]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setErr(null);
      // Don't clear selection when navigating months - preserve selection state
      try {
        const startStr = formatDateString(firstDay);
        const endStr = formatDateString(lastDay);
        const res = await clientFetchJson<AvailabilityResp>(
          `/bookings/availability/${assetId}?startDate=${startStr}&endDate=${endStr}`
        );
        setCalendar(res.data.calendar || {});
        setSpecialType1(res.data.specialDates?.type1 || []);
        setSpecialType2(res.data.specialDates?.type2 || []);
      } catch (e: any) {
        setErr(mapCommonApiError(locale, e?.message || '', 'Failed to load availability'));
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [assetId, firstDay, lastDay]);

  // Load owners for the asset (for create form)
  useEffect(() => {
    (async () => {
      try {
        const res = await clientFetchJson<{ success: boolean; data: any }>(`/assets/${assetId}`);
        const list: { userId: string; label: string }[] = [];
        (res?.data?.owners || []).forEach((o: any) => {
          const u = o?.user;
          if (!u) return;
          const id = typeof u === 'object' ? u._id : u;
          const full = typeof u === 'object' ? [u.name, u.lastName].filter(Boolean).join(' ') : '';
          const label = full || (typeof u === 'object' ? u.email : id);
          list.push({ userId: id, label });
        });
        setOwners(list);
        if (res?.data?.type) setAssetType(res.data.type);
      } catch (e) {
        setOwners([]);
      }
    })();
  }, [assetId]);

  // FEAT-ADMIN-BLOCK-001: Load blocked dates for the asset
  useEffect(() => {
    if (viewUserId) return; // Don't show blocks in user view
    (async () => {
      try {
        const res = await clientFetchJson<{ success: boolean; data: BlockedDate[] }>(`/bookings/blocked-dates/${assetId}`);
        setBlockedDates(res?.data || []);
      } catch (e) {
        setBlockedDates([]);
      }
    })();
  }, [assetId, viewUserId]);

  // Auto-set createUserId when viewing specific user
  useEffect(() => {
    if (viewUserId) {
      setCreateUserId(viewUserId);
    }
  }, [viewUserId]);

  // Load selected owner's bookings for gap-rule validation
  useEffect(() => {
    if (!createUserId) return;
    (async () => {
      try {
        const res = await clientFetchJson<{ success: boolean; data: { startDate: string; endDate: string; status: string }[] }>(
          `/bookings?user=${encodeURIComponent(createUserId)}&asset=${encodeURIComponent(assetId)}`
        );
        const simplified = (res?.data || []).map((b) => ({ startDate: b.startDate, endDate: b.endDate, status: b.status }));
        setOwnerBookings((prev) => ({ ...prev, [createUserId]: simplified }));
      } catch {
        // ignore
      }
    })();
  }, [createUserId, assetId]);

  function parseDateOnly(dateStr: string) {
    if (!dateStr) return new Date(''); // invalid date
    // API returns YYYY-MM-DD (date-only). Parse as local midnight for consistent UI.
    return dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T00:00:00`);
  }

  function eachDateBetween(startStr: string, endStr: string): string[] {
    const a = parseDateOnly(startStr);
    const b = parseDateOnly(endStr);
    const out: string[] = [];
    const step = new Date(a);
    while (step <= b) {
      out.push(formatDateString(step));
      step.setDate(step.getDate() + 1);
    }
    return out;
  }

  const createValidation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!createStart || !createEnd) return { errors, warnings, days: 0, segments: [] as { start: string; end: string }[] };
    const start = parseDateOnly(createStart);
    const end = parseDateOnly(createEnd);
    if (end < start) errors.push(t('End must be after start'));
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    const minStay = assetType === 'boat' ? 1 : 2;
    const maxStay = 14;
    if (days < minStay) {
      errors.push(t('Minimum stay is {{days}} day{{suffix}}', { days: minStay, suffix: minStay > 1 ? 's' : '' }));
    }
    if (days > maxStay) errors.push(t('Maximum stay is 14 days'));
    // conflicts with other bookings (any owner)
    const range = eachDateBetween(createStart, createEnd);
    const conflictDate = range.find((d) => calendar[d]?.bookings?.length > 0);
    if (conflictDate) errors.push(t('Selected dates overlap an existing booking'));
    // split preview for > 7 days
    const segments: { start: string; end: string }[] = [];
    if (days > 7) {
      let cur = parseDateOnly(createStart);
      const last = parseDateOnly(createEnd);
      while (cur <= last) {
        const segStart = new Date(cur);
        const segEnd = new Date(cur);
        segEnd.setDate(segEnd.getDate() + 6);
        if (segEnd > last) segEnd.setTime(last.getTime());
        segments.push({
          start: formatDateString(segStart),
          end: formatDateString(segEnd),
        });
        cur.setDate(cur.getDate() + 7);
      }
      warnings.push(t('This booking will be split into {{count}} segments of up to 7 days.', { count: segments.length }));
    }
    // Gap rule
    if (createUserId && ownerBookings[createUserId]) {
      const list = ownerBookings[createUserId];
      const past = list
        .filter((b) => parseDateOnly(b.endDate) < start && b.status !== 'cancelled')
        .sort((a, b) => parseDateOnly(b.endDate).getTime() - parseDateOnly(a.endDate).getTime());
      if (past.length > 0) {
        const last = past[0];
        const lastLen = Math.floor((parseDateOnly(last.endDate).getTime() - parseDateOnly(last.startDate).getTime()) / 86400000) + 1;
        const rest = Math.max(0, Math.floor((start.getTime() - parseDateOnly(last.endDate).getTime()) / 86400000) - 1);
        if (rest < lastLen) {
          errors.push(
            t(
              'Gap rule: must rest at least {{days}} day{{suffix}} after your last stay ending {{date}}. You only have {{rest}}.',
              {
                days: lastLen,
                suffix: lastLen > 1 ? 's' : '',
                date: formatDate(parseDateOnly(last.endDate)),
                rest,
              },
            ),
          );
        }
      }
    }
    return { errors, warnings, days, segments };
  }, [createStart, createEnd, calendar, assetType, createUserId, ownerBookings, formatDate, t]);

  // Prefetch owner labels for all userIds present in the current calendar
  useEffect(() => {
    const ids = new Set<string>();
    // Always include viewUserId if present (for user view)
    if (viewUserId) ids.add(viewUserId);
    // Add all user IDs from bookings (for asset view)
    Object.values(calendar).forEach((d) => {
      d?.bookings?.forEach((b) => {
        if (b.userId) ids.add(b.userId);
      });
    });
    const missing = Array.from(ids).filter((id) => !userLabels[id]);
    if (missing.length === 0) return;
    (async () => {
      const entries: [string, string][] = [];
      for (const id of missing) {
        try {
          const res = await clientFetchJson<{ success: boolean; data: any }>(`/users/${id}`);
          const u = res?.data;
          const full = [u?.name, u?.lastName].filter(Boolean).join(' ');
          const label = full || u?.email || id;
          entries.push([id, label]);
        } catch {
          entries.push([id, id]);
        }
      }
      setUserLabels((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [calendar, userLabels, viewUserId]);

  function prevMonth() {
    const d = new Date(year, month, 1);
    d.setMonth(d.getMonth() - 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }
  function nextMonth() {
    const d = new Date(year, month, 1);
    d.setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const weeks = useMemo(() => {
    const startWeekday = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    const w: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7));
    return w;
  }, [year, month]);

  function addDays(dateStr: string, delta: number) {
    const d = parseDateOnly(dateStr);
    d.setDate(d.getDate() + delta);
    return formatDateString(d);
  }

  function formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function colorForUser(userId: string | undefined) {
    if (!userId) return '#94a3b8'; // slate-400 fallback
    if (userColorMap[userId]) return userColorMap[userId];
    // Fallback to hash if owner isn't in owners list
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
    const idx = Math.abs(hash) % colorPalette.length;
    return colorPalette[idx];
  }

  const ownersInMonth = useMemo(() => {
    if (viewUserId) return [] as string[];
    const ids = new Set<string>();
    Object.values(calendar).forEach((d) => d?.bookings?.forEach((b) => b.userId && ids.add(b.userId)));
    const arr = Array.from(ids);
    arr.sort((a, b) => {
      const la = userLabels[a] || a;
      const lb = userLabels[b] || b;
      return la.localeCompare(lb);
    });
    return arr;
  }, [calendar, userLabels, viewUserId]);

  async function openDetails(dateStr: string) {
    setSelectedDate(dateStr);
    setSelectedDetails(null);
    // Do not prefill create dates when clicking a booked day to avoid implying creation
    setCreateStart(null);
    setCreateEnd(null);
    const day = calendar[dateStr];
    if (!day || day.bookings.length === 0) return;
    if (viewUserId && !day.bookings.some((b) => b.userId === viewUserId)) return; // hide other owners in user view
    setLoadingDetails(true);
    try {
      const details: BookingDetail[] = [];
      for (const b of day.bookings) {
        if (viewUserId && b.userId !== viewUserId) continue;
        const res = await clientFetchJson<{ success: boolean; data: BookingDetail }>(`/bookings/${b.bookingId}`);
        if (res?.data) details.push(res.data);
      }
      setSelectedDetails(details);
    } catch (e) {
      // ignore per booking errors
    } finally {
      setLoadingDetails(false);
    }
  }

  function isSpecial(dateStr: string, type: 'type1' | 'type2') {
    return type === 'type1' ? specialType1.includes(dateStr) : specialType2.includes(dateStr);
  }

  // Helper function to determine text color based on background brightness
  function getTextColor(bgColor: string): string {
    const color = bgColor.replace('#', '');
    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? 'text-slate-900' : 'text-white';
  }

  // Memoize text color map for performance
  const textColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(userColorMap).forEach(([userId, bgColor]) => {
      map[userId] = getTextColor(bgColor);
    });
    return map;
  }, [userColorMap]);

  // Clear selection handler
  const handleClearSelection = () => {
    setCreateStart(null);
    setCreateEnd(null);
    setSelectedDate(null);
    setSelectedDetails(null);
    setCreateError(null);
    // Only clear userId if not in user view (viewUserId should persist)
    if (!viewUserId) {
      setCreateUserId('');
    }
  };

  const selectedOwnerLabel =
    owners.find((o) => o.userId === createUserId)?.label || userLabels[createUserId] || createUserId || t('—');
  const selectedBlockTypeLabel =
    blockType === 'maintenance' ? t('Maintenance') : blockType === 'rental' ? t('Rental') : t('Other');

  function clearBlockRangeForm() {
    setBlockStart(null);
    setBlockEnd(null);
    setBlockReason('');
    setBlockError(null);
    setOverlapWarning(null);
  }

  async function refreshCalendarData() {
    const startStr = formatDateString(firstDay);
    const endStr = formatDateString(lastDay);
    const availabilityRes = await clientFetchJson<AvailabilityResp>(
      `/bookings/availability/${assetId}?startDate=${startStr}&endDate=${endStr}`
    );
    setCalendar(availabilityRes.data.calendar || {});
    setSpecialType1(availabilityRes.data.specialDates?.type1 || []);
    setSpecialType2(availabilityRes.data.specialDates?.type2 || []);
  }

  async function refreshBlockedDatesData() {
    if (viewUserId) return;
    const blocksRes = await clientFetchJson<{ success: boolean; data: BlockedDate[] }>(`/bookings/blocked-dates/${assetId}`);
    setBlockedDates(blocksRes?.data || []);
  }

  async function createBookingFromSelection() {
    if (!createUserId || !createStart || !createEnd) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      // Admin override: send with adminOverride flag if there are validation errors
      const hasErrors = createValidation.errors.length > 0;
      await clientFetchJson('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          userId: createUserId,
          assetId,
          startDate: createStart,
          endDate: createEnd,
          adminOverride: hasErrors,
          overrideNote: hasErrors ? `Admin override: ${createValidation.errors.join('; ')}` : undefined,
        }),
      });
      handleClearSelection();
      await refreshCalendarData();
      window.dispatchEvent(new CustomEvent('livo:booking-updated', { detail: { assetId, userId: createUserId } }));
      router.refresh();
    } catch (e: any) {
      setCreateError(mapCommonApiError(locale, e?.message || '', 'Failed to create booking'));
    } finally {
      setIsCreating(false);
    }
  }

  async function createBlockDateRange(force: boolean) {
    if (!blockStart || !blockEnd) return;
    setIsCreatingBlock(true);
    setBlockError(null);
    if (!force) setOverlapWarning(null);
    try {
      await clientFetchJson('/bookings/blocked-dates', {
        method: 'POST',
        body: JSON.stringify({
          assetId,
          startDate: blockStart,
          endDate: blockEnd,
          blockType,
          reason: blockReason,
          force,
        }),
      });
      await refreshCalendarData();
      await refreshBlockedDatesData();
      clearBlockRangeForm();
      router.refresh();
    } catch (e: any) {
      if (!force && e?.requiresConfirmation) {
        setOverlapWarning(e);
      } else {
        setBlockError(e?.error || e?.message || t('Failed to create block'));
      }
    } finally {
      setIsCreatingBlock(false);
    }
  }

  async function onConfirmCreateBooking() {
    setShowCreateBookingConfirmModal(false);
    await createBookingFromSelection();
  }

  async function onConfirmCreateBlock() {
    setShowCreateBlockConfirmModal(false);
    await createBlockDateRange(false);
  }

  async function onConfirmForceCreateBlock() {
    setShowForceCreateBlockConfirmModal(false);
    await createBlockDateRange(true);
  }

  async function onConfirmDeleteBlock() {
    if (!blockToDelete) return;
    setIsDeletingBlock(true);
    setDeleteBlockError(null);
    try {
      await clientFetchJson(`/bookings/blocked-dates/${blockToDelete._id}`, { method: 'DELETE' });
      await refreshCalendarData();
      await refreshBlockedDatesData();
      setBlockToDelete(null);
      router.refresh();
    } catch (e: any) {
      setDeleteBlockError(e?.error || e?.message || t('Failed to delete block'));
    } finally {
      setIsDeletingBlock(false);
    }
  }

  return (
    <div className="mb-8 rounded-xl border bg-white shadow-sm p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={prevMonth} className="px-3 py-1.5 border rounded-lg bg-white shadow-sm">{t('Prev')}</button>
        <div className="font-semibold text-slate-800">
          {formatDate(firstDay, { month: 'long' })} {year}
        </div>
        <button onClick={nextMonth} className="px-3 py-1.5 border rounded-lg bg-white shadow-sm">{t('Next')}</button>
        <div className="ml-auto flex items-center gap-4 text-sm text-slate-700 flex-wrap">
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block bg-gray-200 border" /> {t('Available')}</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block bg-gray-400 border" /> {t('Booked')}</span>
          {!viewUserId && <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block bg-red-100 border-2 border-red-500" /> {t('Blocked')}</span>}
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block bg-[#ff6b6b]" /> {t('Type 1')}</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block bg-[#6200ee]" /> {t('Type 2')}</span>
        </div>
      </div>

      {/* Color Legend - Enhanced and prominent */}
      {!viewUserId && ownersInMonth.length > 0 && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg border">
          <div className="text-sm font-semibold mb-2 text-slate-800">{t('Bookings by Owner')}</div>
          <div className="flex flex-wrap gap-3">
            {(showAllOwners ? ownersInMonth : ownersInMonth.slice(0, 6)).map((id) => (
              <div key={id} className="inline-flex items-center gap-2">
                <span 
                  className="w-6 h-6 rounded border-2 border-white shadow-sm" 
                  style={{ backgroundColor: colorForUser(id) }} 
                />
                <span className="text-sm text-slate-700">{userLabels[id] || id}</span>
              </div>
            ))}
            {ownersInMonth.length > 6 && (
              <button 
                onClick={() => setShowAllOwners(v => !v)} 
                className="text-sm text-slate-600 underline hover:text-slate-900"
              >
                {showAllOwners ? t('Show less') : t('Show all {{count}}', { count: ownersInMonth.length })}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selection Summary Bar - Create Booking */}
      {createStart && !showBlockUI && (
        <div className="mb-4 p-3 bg-sky-50 border border-sky-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span>{t('Start')}: <span className="font-semibold">{createStart}</span></span>
              {createEnd && (
                <>
                  <span>{t('End')}: <span className="font-semibold">{createEnd}</span></span>
                  <span>{t('Duration')}: <span className="font-semibold">{createValidation.days} {t('day')}{createValidation.days !== 1 ? 's' : ''}</span></span>
                </>
              )}
              {!createEnd && <span className="text-slate-500 italic">{t('Click end date on calendar...')}</span>}
            </div>
            <button 
              onClick={handleClearSelection}
              className="text-sm text-slate-600 hover:text-slate-900 underline"
            >
              {t('Clear selection')}
            </button>
          </div>
        </div>
      )}

      {/* Selection Summary Bar - Block Date Range */}
      {showBlockUI && (blockStart || blockEnd) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span>{t('Block start')}: <span className="font-semibold">{blockStart || '—'}</span></span>
              {blockEnd ? (
                <>
                  <span>{t('End')}: <span className="font-semibold">{blockEnd}</span></span>
                  <span>{t('Duration')}: <span className="font-semibold">{blockStart && blockEnd ? Math.floor((parseDateOnly(blockEnd).getTime() - parseDateOnly(blockStart).getTime()) / 86400000) + 1 : 0} {t('day(s)')}</span></span>
                </>
              ) : (
                <span className="text-slate-500 italic">{t('Click end date on calendar...')}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setBlockStart(null); setBlockEnd(null); setBlockError(null); setOverlapWarning(null); }}
              className="text-sm text-slate-600 hover:text-slate-900 underline"
            >
              {t('Clear selection')}
            </button>
          </div>
        </div>
      )}

      {err && <div className="text-red-600 text-sm mb-2">{err}</div>}
      <div className={`rounded-lg overflow-hidden border ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="grid grid-cols-7 bg-slate-50 border-b text-xs font-semibold">
            {weekdays.map((d) => (
              <div key={d} className="p-2 text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {weeks.flat().map((d, idx) => {
              if (!d) return <div key={idx} className="h-20 border-t border-r bg-white"/>;
              const dateStr = formatDateString(d);
              const day = calendar[dateStr];
              const booked = !!(day && day.bookings.length > 0);
              const blocked = !viewUserId && !!(day && day.blocks && day.blocks.length > 0);
              const special1 = isSpecial(dateStr, 'type1');
              const special2 = isSpecial(dateStr, 'type2');
              
              // Determine user-specific background color and label
              let cellBg = 'bg-white';
              let cellUserLabel = '';
              let cellStyle: React.CSSProperties = {};
              let textColorClass = 'text-slate-800';
              let entry: { bookingId: string; userId: string } | null = null;
              
              if (booked && !blocked) {
                entry = viewUserId ? (day.bookings.find(b => b.userId === viewUserId) || null) : day.bookings[0];
                if (entry) {
                  const userColor = colorForUser(entry.userId);
                  cellStyle = { backgroundColor: userColor };
                  cellBg = ''; // Clear Tailwind class when using inline style
                  cellUserLabel = userLabels[entry.userId] || entry.userId;
                  textColorClass = textColorMap[entry.userId] || getTextColor(userColor);
                }
              }
              if (blocked) cellBg = 'bg-red-50';
              if (!booked && !blocked) cellBg = 'bg-white';
              
              // Selection state visualization (booking vs block mode)
              const isSelectionStart = !showBlockUI && createStart === dateStr;
              const isSelectionEnd = !showBlockUI && createEnd === dateStr;
              const isInSelection = !showBlockUI && !!createStart && !!createEnd && dateStr >= createStart && dateStr <= createEnd;
              const isBlockSelectionStart = showBlockUI && blockStart === dateStr;
              const isBlockSelectionEnd = showBlockUI && blockEnd === dateStr;
              const isInBlockSelection = showBlockUI && !!blockStart && !!blockEnd && dateStr >= blockStart && dateStr <= blockEnd;
              
              // Build selection classes
              const selectionClasses = [];
              if (showBlockUI) {
                if (isInBlockSelection) selectionClasses.push('ring-2 ring-red-500');
                if (isBlockSelectionStart) selectionClasses.push('ring-4 ring-red-600');
                if (isBlockSelectionEnd && blockEnd !== blockStart) selectionClasses.push('ring-4 ring-red-600');
              } else {
                if (isInSelection) selectionClasses.push('ring-2 ring-sky-500');
                if (isSelectionStart) selectionClasses.push('ring-4 ring-sky-600');
                if (isSelectionEnd && createEnd !== createStart) selectionClasses.push('ring-4 ring-sky-600');
              }
              
              // If a start is selected, visualize whether using this cell as the end would be invalid
              let invalidAsEnd = false;
              if (createStart && dateStr >= createStart && !createEnd) {
                const candidate = { start: createStart, end: dateStr };
                const minStay = assetType === 'boat' ? 1 : 2;
                const days = Math.floor((parseDateOnly(candidate.end).getTime() - parseDateOnly(candidate.start).getTime()) / 86400000) + 1;
                if (days < minStay || days > 14) invalidAsEnd = true;
                const range = eachDateBetween(candidate.start, candidate.end);
                if (range.some((d0) => calendar[d0]?.bookings?.length > 0)) invalidAsEnd = true;
                // If gap rule is violated at the selected start for the chosen owner, mark all ends invalid
                if (createUserId && ownerBookings[createUserId]) {
                  const list = ownerBookings[createUserId];
                  const past = list
                    .filter((b) => parseDateOnly(b.endDate) < parseDateOnly(createStart) && b.status !== 'cancelled')
                    .sort((a, b) => parseDateOnly(b.endDate).getTime() - parseDateOnly(a.endDate).getTime());
                  if (past.length > 0) {
                    const last = past[0];
                    const lastLen = Math.floor((parseDateOnly(last.endDate).getTime() - parseDateOnly(last.startDate).getTime()) / 86400000) + 1;
                    const rest = Math.max(0, Math.floor((parseDateOnly(createStart).getTime() - parseDateOnly(last.endDate).getTime()) / 86400000) - 1);
                    if (rest < lastLen) invalidAsEnd = true;
                  }
                }
              }
              
              return (
                <button
                  key={idx}
                  onClick={() => {
                    // --- BLOCK DATE RANGE MODE: calendar selection populates blockStart/blockEnd ---
                    if (showBlockUI) {
                      if (!blockStart || (blockStart && blockEnd)) {
                        setBlockStart(dateStr);
                        setBlockEnd(null);
                        setBlockError(null);
                        setOverlapWarning(null);
                        return;
                      }
                      if (blockStart && !blockEnd) {
                        if (dateStr < blockStart) {
                          setBlockStart(dateStr);
                          return;
                        }
                        setBlockEnd(dateStr);
                        setBlockError(null);
                      }
                      return;
                    }
                    
                    // --- CREATE BOOKING MODE ---
                    // Case 1: Blocked day - do nothing
                    if (blocked) return;
                    
                    // Case 2: Booked day - show details (don't initiate selection)
                    if (booked) {
                      openDetails(dateStr);
                      return;
                    }
                    
                    // Case 3: No selection yet OR selection complete - start new selection
                    if (!createStart || (createStart && createEnd)) {
                      setCreateStart(dateStr);
                      setCreateEnd(null);
                      setSelectedDate(dateStr);
                      setSelectedDetails(null);
                      setCreateError(null);
                      return;
                    }
                    
                    // Case 4: Start selected, now selecting end
                    if (createStart && !createEnd) {
                      // Allow changing start if clicking before current start
                      if (dateStr < createStart) {
                        setCreateStart(dateStr);
                        return;
                      }
                      
                      // Validate end selection
                      const minStay = assetType === 'boat' ? 1 : 2;
                      const days = Math.floor((parseDateOnly(dateStr).getTime() - parseDateOnly(createStart).getTime()) / 86400000) + 1;
                      
                      // Reject if violates constraints
                      if (days < minStay || days > 14) {
                        setCreateError(t('Selection must be {{min}}-14 days', { min: minStay }));
                        return;
                      }
                      
                      // Check for conflicts in range
                      const range = eachDateBetween(createStart, dateStr);
                      if (range.some((d) => calendar[d]?.bookings?.length > 0)) {
                        setCreateError(t('Selection overlaps existing booking'));
                        return;
                      }
                      
                      // Check gap rule at start if owner chosen
                      if (createUserId && ownerBookings[createUserId]) {
                        const list = ownerBookings[createUserId];
                        const past = list
                          .filter((b) => parseDateOnly(b.endDate) < parseDateOnly(createStart) && b.status !== 'cancelled')
                          .sort((a, b) => parseDateOnly(b.endDate).getTime() - parseDateOnly(a.endDate).getTime());
                        if (past.length > 0) {
                          const last = past[0];
                          const lastLen = Math.floor((parseDateOnly(last.endDate).getTime() - parseDateOnly(last.startDate).getTime()) / 86400000) + 1;
                          const rest = Math.max(0, Math.floor((parseDateOnly(createStart).getTime() - parseDateOnly(last.endDate).getTime()) / 86400000) - 1);
                          if (rest < lastLen) {
                            setCreateError(
                              t('Gap rule: must rest at least {{days}} day{{suffix}} after last stay', {
                                days: lastLen,
                                suffix: lastLen > 1 ? 's' : '',
                              }),
                            );
                            return;
                          }
                        }
                      }
                      
                      // Valid selection
                      setCreateEnd(dateStr);
                      setSelectedDate(dateStr);
                      setCreateError(null);
                    }
                  }}
                  style={cellStyle}
                  className={`h-20 border-t border-r p-1 text-left ${cellBg} relative hover:opacity-90 ${invalidAsEnd ? 'ring-1 ring-red-300' : ''} ${selectionClasses.join(' ')} ${blocked ? 'border-2 border-red-400' : ''}`}
                  title={blocked
                    ? t('Blocked: {{type}}', { type: day.blocks?.[0]?.blockType || t('N/A') })
                    : (booked ? (cellUserLabel || t('Booking')) : t('Available'))}
                >
                  <div className={`text-xs font-semibold ${textColorClass}`}>{d.getDate()}</div>
                  {booked && !blocked && cellUserLabel && (
                    <div 
                      className={`text-[10px] font-medium truncate px-1 mt-0.5 ${textColorClass}`}
                      title={`${cellUserLabel} (${entry?.userId || ''})`}
                    >
                      {cellUserLabel.length > 12 ? cellUserLabel.slice(0, 10) + '...' : cellUserLabel}
                    </div>
                  )}
                  {blocked && (
                    <span
                      className="absolute top-1 left-1 text-red-600 text-xs font-bold"
                      title={day.blocks?.[0]?.reason || t('Blocked')}
                    >
                      🚫
                    </span>
                  )}
                  {special1 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: '#ff6b6b' }} />}
                  {special2 && <span className="absolute top-1 right-3 w-2 h-2 rounded-full" style={{ backgroundColor: '#6200ee' }} />}
                </button>
              );
            })}
          </div>
        </div>

      {/* Mode toggle + form area: always below calendar, above Active Blocks */}
      {!viewUserId && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              setShowBlockUI(false);
              clearBlockRangeForm();
              setShowCreateBlockConfirmModal(false);
              setShowForceCreateBlockConfirmModal(false);
            }}
            className={`px-4 py-2 rounded-lg ${!showBlockUI ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border'}`}
          >
            {t('Create Booking')}
          </button>
          <button
            onClick={() => {
              setShowBlockUI(true);
              setCreateStart(null);
              setCreateEnd(null);
              setSelectedDate(null);
              setSelectedDetails(null);
              setCreateError(null);
              setShowCreateBookingConfirmModal(false);
            }}
            className={`px-4 py-2 rounded-lg ${showBlockUI ? 'bg-red-600 text-white' : 'bg-white text-slate-700 border'}`}
          >
            {t('Block Date Range')}
          </button>
        </div>
      )}

      {/* Block Date Range form - below toggle, above Active Blocks */}
      {showBlockUI && !viewUserId && (
        <div className="mt-4 rounded-xl border bg-red-50 shadow-sm p-4">
          <div className="font-semibold mb-3 text-red-900">{t('Block Date Range')}</div>
          {(blockStart || blockEnd) && (
            <div className="mb-3 text-sm text-red-800">
              {t('Selected on calendar:')} <span className="font-medium">{blockStart ?? t('—')}</span>
              {blockEnd ? t(' to {{value}}', { value: blockEnd }) : t(' (click end date on calendar)')}
            </div>
          )}
          <div className="mb-3 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="flex flex-col">
              <label className="text-sm text-slate-600">{t('Start Date')}</label>
              <input
                type="date"
                className="border rounded-lg px-3 py-2 bg-white shadow-sm"
                value={blockStart ?? ''}
                onChange={(e) => setBlockStart(e.target.value || null)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-slate-600">{t('End Date')}</label>
              <input
                type="date"
                className="border rounded-lg px-3 py-2 bg-white shadow-sm"
                value={blockEnd ?? ''}
                onChange={(e) => setBlockEnd(e.target.value || null)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-slate-600">{t('Block Type')}</label>
              <select
                className="border rounded-lg px-3 py-2 bg-white shadow-sm"
                value={blockType}
                onChange={(e) => setBlockType(e.target.value as 'maintenance' | 'rental' | 'other')}
              >
                <option value="maintenance">{t('Maintenance')}</option>
                <option value="rental">{t('Rental')}</option>
                <option value="other">{t('Other')}</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-slate-600">{t('Reason (optional)')}</label>
              <input
                type="text"
                className="border rounded-lg px-3 py-2 bg-white shadow-sm"
                placeholder={t('Brief description')}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-red-700 disabled:opacity-60"
              disabled={!blockStart || !blockEnd || isCreatingBlock}
              onClick={() => {
                if (!blockStart || !blockEnd) return;
                setShowCreateBlockConfirmModal(true);
              }}
            >
              {isCreatingBlock ? t('Creating...') : t('Create Block')}
            </button>
            <button
              onClick={clearBlockRangeForm}
              className="px-4 py-2 border rounded-lg bg-white shadow-sm text-slate-700 hover:bg-slate-50"
            >
              {t('Clear')}
            </button>
          </div>
          {blockError && <div className="text-sm text-red-600 mt-2">{blockError}</div>}
          {overlapWarning && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-lg">
              <div className="font-semibold text-amber-900 mb-2">{t('Overlapping Bookings')}</div>
              <p className="text-sm text-amber-800 mb-2">{overlapWarning.error}</p>
              <div className="text-xs text-amber-700 mb-2">
                {t('{{count}} booking(s) overlap with this date range:', {
                  count: overlapWarning.overlappingBookings?.length || 0,
                })}
                <ul className="list-disc ml-5 mt-1">
                  {(overlapWarning.overlappingBookings || []).map((b: any, i: number) => (
                    <li key={i}>
                      {b.startDate}
                      {t(' to ')}
                      {b.endDate}
                      {' - '}
                      {b.user?.name} {b.user?.lastName}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                className="bg-amber-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-amber-700 text-sm"
                onClick={() => {
                  if (!blockStart || !blockEnd) return;
                  setShowForceCreateBlockConfirmModal(true);
                }}
              >
                {t('Force Create Block Anyway')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Booking form - below toggle, above Active Blocks (when Create Booking mode + dates selected) */}
      {createStart && !showBlockUI && (
        <div className="mt-4 rounded-xl border-2 border-sky-300 bg-sky-50 shadow-sm p-4">
          <div className="font-semibold mb-3 text-sky-900">{t('Create Booking')}</div>
          <div className="mb-3 text-sm text-sky-800">
            <span className="font-medium">{t('Selected:')}</span> {createStart}
            {createEnd
              ? t(' to {{end}} ({{days}} day{{suffix}})', {
                  end: createEnd,
                  days: createValidation.days,
                  suffix: createValidation.days !== 1 ? 's' : '',
                })
              : t(' (select end date on calendar)')}
          </div>
          <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            {!viewUserId && (
              <div className="flex flex-col">
                <label className="text-sm text-slate-700 font-medium">{t('Owner')}</label>
                <select 
                  className="border rounded-lg px-3 py-2 bg-white shadow-sm" 
                  value={createUserId} 
                  onChange={(e) => setCreateUserId(e.target.value)}
                >
                  <option value="">{t('Select owner')}</option>
                  {owners.map((o) => (
                    <option key={o.userId} value={o.userId}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col">
              <label className="text-sm text-slate-700 font-medium">{t('Start Date')}</label>
              <input 
                type="date" 
                className="border rounded-lg px-3 py-2 bg-white shadow-sm" 
                value={createStart || ''} 
                onChange={(e) => setCreateStart(e.target.value || null)} 
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-slate-700 font-medium">{t('End Date')}</label>
              <input 
                type="date" 
                className="border rounded-lg px-3 py-2 bg-white shadow-sm" 
                value={createEnd || ''} 
                onChange={(e) => setCreateEnd(e.target.value || null)} 
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="bg-sky-700 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-sky-800 disabled:opacity-60"
              disabled={!createUserId || !createStart || !createEnd || isCreating}
              onClick={() => {
                if (!createUserId || !createStart || !createEnd) return;
                setShowCreateBookingConfirmModal(true);
              }}
            >
              {isCreating ? t('Creating...') : (createValidation.errors.length > 0 ? t('Create Anyway (Override)') : t('Create Booking'))}
            </button>
          </div>
          {createError && <div className="text-sm text-red-600 mt-2">{createError}</div>}
          {createValidation.errors.length > 0 && (
            <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">⚠️</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-orange-900 mb-1">{t('Rule Violations')}</div>
                  <ul className="text-sm text-orange-800 list-disc ml-4 space-y-0.5">
                    {createValidation.errors.map((e, i) => (<li key={i}>{e}</li>))}
                  </ul>
                  <div className="text-xs text-orange-700 mt-2 italic">
                    {t('As an admin, you can override these rules by clicking "Create Anyway"')}
                  </div>
                </div>
              </div>
            </div>
          )}
          {createValidation.warnings.length > 0 && (
            <ul className="text-sm text-amber-600 mt-2 list-disc ml-5">
              {createValidation.warnings.map((w, i) => (<li key={i}>{w}</li>))}
            </ul>
          )}
          {createValidation.segments.length > 0 && (
            <div className="mt-2 text-xs text-slate-600">
              {t('Segments:')}
              <ul className="list-disc ml-5">
                {createValidation.segments.map((s, i) => (
                  <li key={i}>{s.start} → {s.end}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Active Blocks - always below Create Booking / Block Date Range form */}
      {!viewUserId && blockedDates.length > 0 && (
        <div className="mt-4 rounded-xl border bg-white shadow-sm p-4">
          <div className="font-semibold mb-3">{t('Active Blocks ({{count}})', { count: blockedDates.length })}</div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-2">{t('Start')}</th>
                  <th className="text-left p-2">{t('End')}</th>
                  <th className="text-left p-2">{t('Type')}</th>
                  <th className="text-left p-2">{t('Reason')}</th>
                  <th className="text-left p-2">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {blockedDates.map((block) => (
                  <tr key={block._id} className="border-b">
                    <td className="p-2">{block.startDate}</td>
                    <td className="p-2">{block.endDate}</td>
                    <td className="p-2 capitalize">{block.blockType}</td>
                    <td className="p-2">{block.reason || '—'}</td>
                    <td className="p-2">
                      <button
                        onClick={() => {
                          setDeleteBlockError(null);
                          setBlockToDelete(block);
                        }}
                        className="text-red-600 hover:text-red-800 text-xs underline"
                      >
                        {t('Delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {deleteBlockError && <div className="text-sm text-red-600 mt-2">{deleteBlockError}</div>}
        </div>
      )}

      <TwoStepConfirmModal
        open={showCreateBookingConfirmModal}
        title={t('Create this booking?')}
        description={t('This booking will be created with the selected owner and date range.')}
        details={[
          { label: t('Owner'), value: selectedOwnerLabel },
          { label: t('Start Date'), value: createStart || t('—') },
          { label: t('End Date'), value: createEnd || t('—') },
          {
            label: t('Mode'),
            value: createValidation.errors.length > 0 ? t('Admin override') : t('Standard'),
          },
        ]}
        keywordPrompt={t('Please review this action, then confirm booking creation.')}
        cancelLabel={t('Cancel')}
        continueLabel={t('Continue')}
        backLabel={t('Back')}
        confirmLabel={t('Confirm booking')}
        pendingLabel={t('Creating...')}
        pending={isCreating}
        onCancel={() => {
          if (!isCreating) setShowCreateBookingConfirmModal(false);
        }}
        onConfirm={onConfirmCreateBooking}
      />

      <TwoStepConfirmModal
        open={showCreateBlockConfirmModal}
        title={t('Block these dates?')}
        description={t('Blocked dates will prevent new bookings across this range.')}
        details={[
          { label: t('Start Date'), value: blockStart || t('—') },
          { label: t('End Date'), value: blockEnd || t('—') },
          { label: t('Block Type'), value: selectedBlockTypeLabel },
          { label: t('Reason'), value: blockReason || t('No reason provided') },
        ]}
        keywordPrompt={t('Please review this action, then confirm date blocking.')}
        cancelLabel={t('Cancel')}
        continueLabel={t('Continue')}
        backLabel={t('Back')}
        confirmLabel={t('Confirm block')}
        pendingLabel={t('Creating...')}
        pending={isCreatingBlock}
        danger
        onCancel={() => {
          if (!isCreatingBlock) setShowCreateBlockConfirmModal(false);
        }}
        onConfirm={onConfirmCreateBlock}
      />

      <TwoStepConfirmModal
        open={showForceCreateBlockConfirmModal}
        title={t('Force block overlapping bookings?')}
        description={t('This will block dates even when existing bookings overlap.')}
        details={[
          { label: t('Start Date'), value: blockStart || t('—') },
          { label: t('End Date'), value: blockEnd || t('—') },
          { label: t('Block Type'), value: selectedBlockTypeLabel },
        ]}
        keywordPrompt={t('Please review this action, then confirm the force block.')}
        cancelLabel={t('Cancel')}
        continueLabel={t('Continue')}
        backLabel={t('Back')}
        confirmLabel={t('Force block')}
        pendingLabel={t('Creating...')}
        pending={isCreatingBlock}
        danger
        onCancel={() => {
          if (!isCreatingBlock) setShowForceCreateBlockConfirmModal(false);
        }}
        onConfirm={onConfirmForceCreateBlock}
      />

      <TwoStepConfirmModal
        open={!!blockToDelete}
        title={t('Delete this block?')}
        description={t('This block will be removed and these dates can be booked again.')}
        details={
          blockToDelete
            ? [
                { label: t('Start Date'), value: blockToDelete.startDate },
                { label: t('End Date'), value: blockToDelete.endDate },
                { label: t('Block Type'), value: blockToDelete.blockType },
                { label: t('Reason'), value: blockToDelete.reason || t('No reason provided') },
              ]
            : []
        }
        keywordPrompt={t('Please review this action, then confirm block deletion.')}
        cancelLabel={t('Keep block')}
        continueLabel={t('Continue')}
        backLabel={t('Back')}
        confirmLabel={t('Delete block')}
        pendingLabel={t('Deleting...')}
        pending={isDeletingBlock}
        danger
        onCancel={() => {
          if (!isDeletingBlock) setBlockToDelete(null);
        }}
        onConfirm={onConfirmDeleteBlock}
      />

      {/* Booking Details - Show when clicked on booked day */}
      {selectedDate && selectedDetails && !createStart && !showBlockUI && (
        <div className="mt-4 rounded-xl border bg-white shadow-sm p-4">
          <div className="font-semibold mb-2">{t('Bookings on {{date}}', { date: selectedDate })}</div>
          {loadingDetails && <div className="text-sm text-gray-500">{t('Loading details...')}</div>}
          {!loadingDetails && selectedDetails.length === 0 && (
            <div className="text-sm text-gray-500">{t('No bookings')}</div>
          )}
          {!loadingDetails && selectedDetails.length > 0 && (
            <div className="overflow-auto">
              <table className="min-w-[640px] w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-2">{t('User')}</th>
                    <th className="text-left p-2">{t('Start')}</th>
                    <th className="text-left p-2">{t('End')}</th>
                    <th className="text-left p-2">{t('Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDetails.map((b) => {
                    let userLabel = t('—');
                    if (b.user && typeof b.user === 'object') {
                      const u = b.user as any;
                      const full = [u.name, u.lastName].filter(Boolean).join(' ');
                      userLabel = full || u.email || t('—');
                    } else if (b.user) {
                      userLabel = String(b.user);
                    }
                    return (
                      <tr key={b._id} className="border-b">
                        <td className="p-2">{userLabel}</td>
                        <td className="p-2">{formatDate(parseDateOnly(b.startDate))}</td>
                        <td className="p-2">{formatDate(parseDateOnly(b.endDate))}</td>
                        <td className="p-2">{b.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
