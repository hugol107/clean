import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class lists, resolving conflicting utility classes. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format seconds as `H:MM:SS` or `M:SS` for timers and durations. */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || Number.isNaN(totalSeconds) || totalSeconds < 0) return "—";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`;
}

/** Format seconds as a compact human label, e.g. "12m 42s" or "1h 05m". */
export function formatDurationCompact(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || Number.isNaN(totalSeconds) || totalSeconds < 0) return "—";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  return `${seconds}s`;
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes)) return "—";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Type-safe assertion that a branch is unreachable (exhaustiveness checks). */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

export function percentage(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}
