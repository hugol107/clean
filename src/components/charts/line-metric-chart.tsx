"use client";

import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useChartPalette } from "@/hooks/use-chart-palette";
import { ChartTooltip } from "@/components/charts/chart-tooltip";

/**
 * Single-series line chart (cleanings over time, avg duration, SLA compliance…).
 * A single series needs no legend — the card title already names it.
 *
 * `unit` is a plain string suffix (e.g. "m", "%") rather than a formatter
 * function: this component is a Client Component rendered from Server
 * Component pages, and functions cannot be passed as props across that
 * boundary — only plain serializable data can.
 */
export function LineMetricChart({
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
  const stroke = color ?? palette.categorical[0];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={palette.grid} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: palette.mutedText, fontSize: 11 }} axisLine={{ stroke: palette.axis }} tickLine={false} />
        <YAxis
          tick={{ fill: palette.mutedText, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v: number) => `${v}${unit}`}
        />
        <Tooltip cursor={{ stroke: palette.axis, strokeWidth: 1 }} content={<ChartTooltip unit={unit} />} />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={stroke}
          strokeWidth={2}
          dot={{ r: 3, fill: stroke, stroke: palette.surface, strokeWidth: 2 }}
          activeDot={{ r: 4, fill: stroke, stroke: palette.surface, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
