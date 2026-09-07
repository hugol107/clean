"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useChartPalette } from "@/hooks/use-chart-palette";
import { ChartTooltip } from "@/components/charts/chart-tooltip";

/**
 * Single-series vertical bar chart (cleaning hours by day, busiest hours,
 * duration distribution…). `unit` is a plain string suffix, not a formatter
 * function — see line-metric-chart.tsx for why.
 */
export function BarMetricChart({
  data,
  dataKey,
  xKey = "date",
  color,
  unit = "",
  height = 220,
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  xKey?: string;
  color?: string;
  unit?: string;
  height?: number;
}) {
  const palette = useChartPalette();
  const fill = color ?? palette.categorical[0];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }} barCategoryGap="20%">
        <CartesianGrid stroke={palette.grid} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: palette.mutedText, fontSize: 11 }} axisLine={{ stroke: palette.axis }} tickLine={false} />
        <YAxis
          tick={{ fill: palette.mutedText, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v: number) => `${v}${unit}`}
        />
        <Tooltip cursor={{ fill: palette.grid, opacity: 0.4 }} content={<ChartTooltip unit={unit} />} />
        <Bar dataKey={dataKey} fill={fill} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
