'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientFetchJson } from '@/lib/api.client';

type AvailabilityDay = {
  available: boolean;
  bookings: { bookingId: string; userId: string }[];
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

export default function AssetCalendarClient({ assetId, viewUserId }: { assetId: string; viewUserId?: string }) {
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
      setSelectedDate(null);
      setSelectedDetails(null);
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
        setErr(e?.message || 'Failed to load availability');
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
    if (end < start) errors.push('End must be after start');
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    const minStay = assetType === 'boat' ? 1 : 2;
    const maxStay = 14;
    if (days < minStay) errors.push(`Minimum stay is ${minStay} day${minStay > 1 ? 's' : ''}`);
    if (days > maxStay) errors.push('Maximum stay is 14 days');
    // conflicts with other bookings (any owner)
    const range = eachDateBetween(createStart, createEnd);
    const conflictDate = range.find((d) => calendar[d]?.bookings?.length > 0);
    if (conflictDate) errors.push('Selected dates overlap an existing booking');
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
      warnings.push(`This booking will be split into ${segments.length} segments of up to 7 days.`);
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
          errors.push(`Gap rule: must rest at least ${lastLen} day${lastLen>1?'s':''} after your last stay ending ${parseDateOnly(last.endDate).toLocaleDateString()}. You only have ${rest}.`);
        }
      }
    }
    return { errors, warnings, days, segments };
  }, [createStart, createEnd, calendar, assetType, createUserId, ownerBookings]);

  // Prefetch owner labels for all userIds present in the current calendar (skip in user view)
  useEffect(() => {
    if (viewUserId) return;
    const ids = new Set<string>();
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

  return (
    <div className="mb-8 rounded-xl border bg-white shadow-sm p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={prevMonth} className="px-3 py-1.5 border rounded-lg bg-white shadow-sm">Prev</button>
        <div className="font-semibold text-slate-800">
          {firstDay.toLocaleString(undefined, { month: 'long' })} {year}
        </div>
        <button onClick={nextMonth} className="px-3 py-1.5 border rounded-lg bg-white shadow-sm">Next</button>
        {/* Clear selection moved next to Create booking */}
        <div className="ml-auto flex items-center gap-4 text-sm text-slate-700 flex-wrap">
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block bg-gray-200 border" /> Available</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block bg-gray-400 border" /> Booked</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block bg-[#ff6b6b]" /> Type 1</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block bg-[#6200ee]" /> Type 2</span>
          {!viewUserId && ownersInMonth.length > 0 && (
            <span className="inline-flex items-center gap-2 ml-2">
              {(showAllOwners ? ownersInMonth : ownersInMonth.slice(0, 6)).map((id) => (
                <span key={id} className="inline-flex items-center gap-1" title={userLabels[id] || id}>
                  <span className="w-3 h-3 inline-block rounded" style={{ backgroundColor: colorForUser(id) }} />
                  <span className="max-w-[12ch] truncate">{userLabels[id] || id}</span>
                </span>
              ))}
              {ownersInMonth.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllOwners((v) => !v)}
                  className="text-slate-700 underline decoration-dotted"
                >
                  {showAllOwners ? 'Show less' : `Show all (${ownersInMonth.length})`}
                </button>
              )}
            </span>
          )}
        </div>
      </div>

      {err && <div className="text-red-600 text-sm mb-2">{err}</div>}
      {isLoading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : (
        <div className="rounded-lg overflow-hidden border">
          <div className="grid grid-cols-7 bg-slate-50 border-b text-xs font-semibold">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
              <div key={d} className="p-2 text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {weeks.flat().map((d, idx) => {
              if (!d) return <div key={idx} className="h-20 border-t border-r bg-white"/>;
              const dateStr = formatDateString(d);
              const day = calendar[dateStr];
              const booked = !!(day && day.bookings.length > 0);
              const bg = booked ? 'bg-slate-200' : 'bg-white';
              const special1 = isSpecial(dateStr, 'type1');
              const special2 = isSpecial(dateStr, 'type2');
              // If a start is selected, visualize whether using this cell as the end would be invalid
              let invalidAsEnd = false;
              if (createStart && dateStr >= createStart) {
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
              const isSelected = !!createStart && !!createEnd && dateStr >= createStart && dateStr <= createEnd;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (!createStart || (createStart && createEnd)) {
                      if (booked) { openDetails(dateStr); return; }
                      setSelectedDate(dateStr);
                      setSelectedDetails(null);
                      setCreateStart(dateStr);
                      setCreateEnd(null);
                      return;
                    }
                    if (createStart && !createEnd) {
                      if (dateStr < createStart) { setCreateStart(dateStr); return; }
                      const minStay = assetType === 'boat' ? 1 : 2;
                      const days = Math.floor((parseDateOnly(dateStr).getTime() - parseDateOnly(createStart).getTime()) / 86400000) + 1;
                      if (days < minStay || days > 14) return;
                      const range = eachDateBetween(createStart, dateStr);
                      if (range.some((d0) => calendar[d0]?.bookings?.length > 0)) return;
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
                          if (rest < lastLen) return; // block setting end due to gap rule
                        }
                      }
                      setCreateEnd(dateStr);
                      setSelectedDate(dateStr);
                      setSelectedDetails(null);
                      return;
                    }
                  }}
                  className={`h-20 border-t border-r p-1 text-left ${bg} relative hover:bg-slate-100 ${invalidAsEnd ? 'ring-1 ring-red-300' : ''} ${isSelected ? 'outline outline-2 outline-sky-300' : ''}`}
                  title={booked ? (viewUserId ? (day.bookings.some(b=>b.userId===viewUserId) ? 'Your booking' : 'Unavailable') : `${day.bookings.length} booking(s)`) : 'Available'}
                >
                  <div className="text-xs font-semibold">{d.getDate()}</div>
                  {special1 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: '#ff6b6b' }} />}
                  {special2 && <span className="absolute top-1 right-3 w-2 h-2 rounded-full" style={{ backgroundColor: '#6200ee' }} />}
                  {booked && (() => {
                    const entry = viewUserId ? (day.bookings.find(b => b.userId === viewUserId) || null) : day.bookings[0];
                    if (viewUserId && !entry) return null; // don't show other owners' bars
                    const prevStr = addDays(dateStr, -1);
                    const nextStr = addDays(dateStr, 1);
                    const prev = calendar[prevStr];
                    const next = calendar[nextStr];
                    const prevSame = !!prev && entry && prev.bookings.some(b => b.bookingId === entry.bookingId);
                    const nextSame = !!next && entry && next.bookings.some(b => b.bookingId === entry.bookingId);
                    const isStart = !prevSame;
                    const isEnd = !nextSame;
                    const barColor = colorForUser(entry ? entry.userId : undefined);
                    const radiusLeft = isStart ? '8px' : '0px';
                    const radiusRight = isEnd ? '8px' : '0px';
                    const title = entry ? (userLabels[entry.userId] || entry.userId || 'Booking') : 'Booking';
                    return (
                      <div
                        className="absolute left-1 right-1 bottom-1 h-2"
                        style={{
                          backgroundColor: barColor,
                          borderTopLeftRadius: radiusLeft,
                          borderBottomLeftRadius: radiusLeft,
                          borderTopRightRadius: radiusRight,
                          borderBottomRightRadius: radiusRight,
                          // separators on boundaries
                          boxShadow: `${isStart ? 'inset 2px 0 0 0 #fff' : ''}${isStart && isEnd ? ', ' : ''}${isEnd ? 'inset -2px 0 0 0 #fff' : ''}`,
                        }}
                        title={title}
                        aria-label={title}
                      />
                    );
                  })()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedDate && !viewUserId && (
        <div className="mt-4 rounded-xl border bg-white shadow-sm p-4">
          <div className="font-semibold mb-2">Bookings on {selectedDate}</div>
          <div className="mb-3 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="flex flex-col">
              <label className="text-sm text-slate-600">Owner</label>
              <select className="border rounded-lg px-3 py-2 bg-white shadow-sm" value={createUserId} onChange={(e) => setCreateUserId(e.target.value)}>
                <option value="">Select owner</option>
                {owners.map((o) => (
                  <option key={o.userId} value={o.userId}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-slate-600">Start</label>
              <input type="date" className="border rounded-lg px-3 py-2 bg-white shadow-sm" value={createStart || ''} onChange={(e) => setCreateStart(e.target.value || null)} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-slate-600">End</label>
              <input type="date" className="border rounded-lg px-3 py-2 bg-white shadow-sm" value={createEnd || ''} onChange={(e) => setCreateEnd(e.target.value || null)} />
            </div>
            <div className="flex flex-col md:col-span-2">
              <button
                className="mt-6 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-slate-800 disabled:opacity-60 w-fit"
                disabled={!createUserId || !createStart || !createEnd || isCreating || createValidation.errors.length > 0}
                onClick={async () => {
                  if (!createUserId || !createStart || !createEnd) return;
                  setIsCreating(true);
                  setCreateError(null);
                  try {
                    await clientFetchJson('/bookings', {
                      method: 'POST',
                      body: JSON.stringify({ userId: createUserId, assetId, startDate: createStart, endDate: createEnd }),
                    });
                    // Refresh current month data
                    const startStr = formatDateString(firstDay);
                    const endStr = formatDateString(lastDay);
                    const res = await clientFetchJson<AvailabilityResp>(`/bookings/availability/${assetId}?startDate=${startStr}&endDate=${endStr}`);
                    setCalendar(res.data.calendar || {});
                    setSpecialType1(res.data.specialDates?.type1 || []);
                    setSpecialType2(res.data.specialDates?.type2 || []);
                    // Refresh server-rendered bookings table below
                    router.refresh();
                  } catch (e: any) {
                    setCreateError(e?.message || 'Failed to create booking');
                  } finally {
                    setIsCreating(false);
                  }
                }}
              >
                {isCreating ? 'Creating…' : 'Create booking'}
              </button>
              <button
                type="button"
                onClick={() => { setCreateStart(null); setCreateEnd(null); setSelectedDate(null); setSelectedDetails(null); setCreateError(null); }}
                className="mt-6 ml-3 px-4 py-2 border rounded-lg bg-white shadow-sm text-slate-700 hover:bg-slate-50"
              >
                Clear selection
              </button>
              {createError && <div className="text-sm text-red-600 mt-2">{createError}</div>}
              {createValidation.errors.length > 0 && (
                <ul className="text-sm text-red-600 mt-2 list-disc ml-5">
                  {createValidation.errors.map((e, i) => (<li key={i}>{e}</li>))}
                </ul>
              )}
              {createValidation.warnings.length > 0 && (
                <ul className="text-sm text-amber-600 mt-2 list-disc ml-5">
                  {createValidation.warnings.map((w, i) => (<li key={i}>{w}</li>))}
                </ul>
              )}
            </div>
          </div>
          {createValidation.segments.length > 0 && (
            <div className="mt-2 text-xs text-slate-600">
              Segments:
              <ul className="list-disc ml-5">
                {createValidation.segments.map((s, i) => (
                  <li key={i}>{s.start} → {s.end}</li>
                ))}
              </ul>
            </div>
          )}
          {loadingDetails && <div className="text-sm text-gray-500">Loading details…</div>}
          {!loadingDetails && (!selectedDetails || selectedDetails.length === 0) && (
            <div className="text-sm text-gray-500">No bookings</div>
          )}
          {selectedDetails && selectedDetails.length > 0 && (
            <div className="overflow-auto">
              <table className="min-w-[640px] w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-2">User</th>
                    <th className="text-left p-2">Start</th>
                    <th className="text-left p-2">End</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDetails.map((b) => {
                    let userLabel = '—';
                    if (b.user && typeof b.user === 'object') {
                      const u = b.user as any;
                      const full = [u.name, u.lastName].filter(Boolean).join(' ');
                      userLabel = full || u.email || '—';
                    } else if (b.user) {
                      userLabel = String(b.user);
                    }
                    return (
                      <tr key={b._id} className="border-b">
                        <td className="p-2">{userLabel}</td>
                        <td className="p-2">{parseDateOnly(b.startDate).toLocaleDateString()}</td>
                        <td className="p-2">{parseDateOnly(b.endDate).toLocaleDateString()}</td>
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


