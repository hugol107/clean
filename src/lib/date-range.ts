import { startOfDay, endOfDay, subDays, startOfMonth } from "date-fns";
import type { DateRangePreset } from "@/lib/constants";

export interface ResolvedDateRange {
  dateFrom: Date;
  dateTo: Date;
  label: string;
}

/** Resolves a preset + optional explicit `from`/`to` query params into a concrete date range (spec section 14). */
export function resolveDateRange(preset: string | undefined, from?: string, to?: string): ResolvedDateRange {
  if (from && to) {
    return { dateFrom: startOfDay(new Date(from)), dateTo: endOfDay(new Date(to)), label: `${from} → ${to}` };
  }

  const now = new Date();
  switch (preset as DateRangePreset) {
    case "today":
      return { dateFrom: startOfDay(now), dateTo: endOfDay(now), label: "Today" };
    case "yesterday": {
      const y = subDays(now, 1);
      return { dateFrom: startOfDay(y), dateTo: endOfDay(y), label: "Yesterday" };
    }
    case "7d":
      return { dateFrom: startOfDay(subDays(now, 6)), dateTo: endOfDay(now), label: "Last 7 days" };
    case "month":
      return { dateFrom: startOfMonth(now), dateTo: endOfDay(now), label: "This month" };
    case "30d":
    default:
      return { dateFrom: startOfDay(subDays(now, 29)), dateTo: endOfDay(now), label: "Last 30 days" };
  }
}
