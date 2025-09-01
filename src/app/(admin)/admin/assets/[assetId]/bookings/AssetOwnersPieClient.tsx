'use client';
import { useMemo } from 'react';
import { OWNER_COLOR_PALETTE } from '@/lib/colors';

type Owner = { userId: string; label: string; sharePercentage: number };

export default function AssetOwnersPieClient({ owners }: { owners: Owner[] }) {
  const total = useMemo(() => owners.reduce((s, o) => s + (o.sharePercentage || 0), 0), [owners]);
  const segments = useMemo(() => {
    // Build conic-gradient segments by cumulative percentages
    let acc = 0;
    const segs = owners.map((o, idx) => {
      const pct = total > 0 ? (o.sharePercentage / total) * 100 : 0;
      const start = acc;
      const end = acc + pct;
      acc = end;
      // Gray for unallocated / pending
      const isGray = o.userId === 'unallocated';
      const isPending = o.userId === 'new';
      const color = isGray ? '#cbd5e1' : (isPending ? '#94a3b8' : OWNER_COLOR_PALETTE[idx % OWNER_COLOR_PALETTE.length]);
      return { color, start, end, owner: o };
    });
    return segs;
  }, [owners, total]);

  const gradient = useMemo(() => {
    if (segments.length === 0) return 'transparent';
    const stops = segments.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ');
    return `conic-gradient(${stops})`;
  }, [segments]);

  return (
    <div className="mt-6 flex flex-col md:flex-row gap-6 items-center">
      <div className="w-48 h-48 rounded-full border shadow-sm" style={{ background: gradient }} aria-label="Ownership distribution" />
      <div className="flex-1">
        <div className="font-semibold mb-2">Owners by share</div>
        <ul className="space-y-1">
          {segments.map((s, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm text-slate-700">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: s.color }} />
              <span className="min-w-[12ch] truncate">{s.owner.label}</span>
              <span className="ml-auto tabular-nums">{(s.owner.sharePercentage || 0).toFixed(2)}%</span>
            </li>
          ))}
          {segments.length === 0 && (
            <li className="text-sm text-slate-500">No owners found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}


