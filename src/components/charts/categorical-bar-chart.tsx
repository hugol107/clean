"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useChartPalette } from "@/hooks/use-chart-palette";
import { ChartTooltip } from "@/components/charts/chart-tooltip";

/** Horizontal bar chart, one bar per category (cleanings by location type, issues by category…). The axis label already carries identity, so no separate legend is needed. */
export function CategoricalBarChart({
  data,
  height,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const palette = useChartPalette();
  const rowHeight = 34;

  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(140, data.length * rowHeight)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }} barCategoryGap="24%">
        <CartesianGrid stroke={palette.grid} horizontal={false} />
        <XAxis type="number" tick={{ fill: palette.mutedText, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: "var(--foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip cursor={{ fill: palette.grid, opacity: 0.4 }} content={<ChartTooltip />} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((_, i) => (
            <Cell key={i} fill={palette.categorical[i % palette.categorical.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
