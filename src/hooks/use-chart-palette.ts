"use client";

import { useTheme } from "next-themes";
import { CHART_PALETTE_LIGHT, CHART_PALETTE_DARK, type ChartPalette } from "@/lib/chart-colors";

export function useChartPalette(): ChartPalette {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? CHART_PALETTE_DARK : CHART_PALETTE_LIGHT;
}
