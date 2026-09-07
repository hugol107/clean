"use client";

import { useChartPalette } from "@/hooks/use-chart-palette";

export interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: { value?: number | string; name?: string; color?: string }[];
  /**
   * A plain, serializable unit suffix (never a formatter function — this
   * component, and its callers, cross the server/client boundary, and
   * functions can't be passed as props across that boundary).
   */
  unit?: string;
}

/** Shared tooltip content for every chart — consistent card, hairline border, muted label. */
export function ChartTooltip({ active, label, payload, unit = "" }: ChartTooltipProps) {
  const palette = useChartPalette();
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-md"
      style={{ background: palette.surface, borderColor: palette.grid, color: palette.mutedText }}
    >
      {label !== undefined && <div className="mb-1 font-medium" style={{ color: "var(--foreground)" }}>{label}</div>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {entry.color && <span className="inline-block size-2 rounded-full" style={{ background: entry.color }} />}
          <span>{entry.name}:</span>
          <span className="font-medium" style={{ color: "var(--foreground)" }}>
            {typeof entry.value === "number" ? `${entry.value}${unit}` : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}
