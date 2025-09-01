// Shared color palette for mapping owners consistently across components
export const OWNER_COLOR_PALETTE: string[] = [
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
];

export function buildOwnerColorMap(owners: { userId: string }[]): Record<string, string> {
  const map: Record<string, string> = {};
  owners.forEach((o, idx) => {
    map[o.userId] = OWNER_COLOR_PALETTE[idx % OWNER_COLOR_PALETTE.length];
  });
  return map;
}


