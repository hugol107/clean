// Validated categorical/status/chrome palette for charts (see the dataviz
// skill's references/palette.md — these exact hex values are the
// pre-validated reference instance: worst adjacent CVD ΔE 9.1 light / 8.4
// dark, worst adjacent normal-vision ΔE 19.6 light / 19.3 dark).
//
// Kept separate from the app's UI badge colors (src/app/globals.css
// --status-*): those are small, always paired with text/icons, and tuned to
// the brand; these are for chart marks, which need the harder CVD/contrast
// guarantees a data encoding relies on.

export interface ChartPalette {
  surface: string;
  grid: string;
  axis: string;
  mutedText: string;
  /** Fixed-order categorical slots — assign by entity identity, never by rank/value. */
  categorical: string[];
  good: string;
  warning: string;
  serious: string;
  critical: string;
}

export const CHART_PALETTE_LIGHT: ChartPalette = {
  surface: "#fcfcfb",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  mutedText: "#898781",
  categorical: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

export const CHART_PALETTE_DARK: ChartPalette = {
  surface: "#1a1a19",
  grid: "#2c2c2a",
  axis: "#383835",
  mutedText: "#898781",
  categorical: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
  // Status hexes are mode-invariant by design (see palette.md).
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};
