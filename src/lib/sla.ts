import { differenceInMinutes } from "date-fns";

/**
 * The SLA / operational-status engine (spec sections 15-16, 25).
 *
 * Location status is intentionally never stored — it's derived here, on
 * read, from the last completed session + the location's target frequency.
 * That keeps a single source of truth (session history) instead of a
 * cached field that can silently drift out of sync.
 */

export type LocationOperationalStatus =
  | "CLEAN"
  | "DUE_SOON"
  | "OVERDUE"
  | "CLEANING"
  | "ISSUE"
  | "UNAVAILABLE"
  | "NEVER_CLEANED";

export interface SlaStatusInput {
  isActive: boolean;
  hasActiveSession: boolean;
  hasOpenHighSeverityIssue: boolean;
  lastCompletedAt: Date | null;
  targetFrequencyMinutes: number;
  /** Org-level default (e.g. 75): status becomes DUE_SOON at this % of the target frequency. */
  dueSoonThresholdPercent: number;
  now?: Date;
}

export interface SlaStatusResult {
  status: LocationOperationalStatus;
  minutesSinceLastClean: number | null;
  isOverdue: boolean;
  overdueByMinutes: number | null;
  dueInMinutes: number | null;
}

export function computeLocationStatus(input: SlaStatusInput): SlaStatusResult {
  if (!input.isActive) {
    return { status: "UNAVAILABLE", minutesSinceLastClean: null, isOverdue: false, overdueByMinutes: null, dueInMinutes: null };
  }
  if (input.hasActiveSession) {
    return { status: "CLEANING", minutesSinceLastClean: null, isOverdue: false, overdueByMinutes: null, dueInMinutes: null };
  }
  if (input.hasOpenHighSeverityIssue) {
    return { status: "ISSUE", minutesSinceLastClean: null, isOverdue: false, overdueByMinutes: null, dueInMinutes: null };
  }
  if (!input.lastCompletedAt) {
    return { status: "NEVER_CLEANED", minutesSinceLastClean: null, isOverdue: false, overdueByMinutes: null, dueInMinutes: 0 };
  }

  const now = input.now ?? new Date();
  const minutesSince = Math.max(0, differenceInMinutes(now, input.lastCompletedAt));
  const target = Math.max(1, input.targetFrequencyMinutes);
  const dueSoonAt = target * (Math.min(99, Math.max(1, input.dueSoonThresholdPercent)) / 100);
  const isOverdue = minutesSince >= target;

  let status: LocationOperationalStatus;
  if (isOverdue) status = "OVERDUE";
  else if (minutesSince >= dueSoonAt) status = "DUE_SOON";
  else status = "CLEAN";

  return {
    status,
    minutesSinceLastClean: minutesSince,
    isOverdue,
    overdueByMinutes: isOverdue ? minutesSince - target : null,
    dueInMinutes: isOverdue ? null : target - minutesSince,
  };
}

export const STATUS_LABELS: Record<LocationOperationalStatus, string> = {
  CLEAN: "Clean",
  DUE_SOON: "Due soon",
  OVERDUE: "Overdue",
  CLEANING: "Cleaning",
  ISSUE: "Issue",
  UNAVAILABLE: "Unavailable",
  NEVER_CLEANED: "Never cleaned",
};

// ---------------------------------------------------------------------------
// Efficiency Index — an operational signal, not a verdict on the worker.
// actual_duration / expected_duration. Presented with context (see spec
// section 15/13: never turn this into a bare ranking of people).
// ---------------------------------------------------------------------------

export interface EfficiencyResult {
  ratio: number; // 1.0 = exactly on target
  variancePercent: number; // +25 => took 25% longer than target
  band: "faster" | "on-target" | "slower";
}

export function computeEfficiencyIndex(actualSeconds: number, targetMinutes: number): EfficiencyResult {
  const targetSeconds = Math.max(1, targetMinutes) * 60;
  const ratio = actualSeconds / targetSeconds;
  const variancePercent = Math.round((ratio - 1) * 100);
  const band = ratio < 0.9 ? "faster" : ratio > 1.15 ? "slower" : "on-target";
  return { ratio: Math.round(ratio * 100) / 100, variancePercent, band };
}

// ---------------------------------------------------------------------------
// Simple, explainable anomaly detection (spec section 25). Rule-based for
// the MVP; flags surface as "review recommended" and never block the
// worker or auto-punish anyone.
// ---------------------------------------------------------------------------

export interface AnomalyFlag {
  type: "TOO_SHORT" | "TOO_LONG";
  message: string;
}

const TOO_SHORT_SECONDS = 30;
const TOO_LONG_MULTIPLIER = 3;

export function detectSessionAnomalies(durationSeconds: number, targetMinutes: number): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];
  if (durationSeconds < TOO_SHORT_SECONDS) {
    flags.push({
      type: "TOO_SHORT",
      message: `Session lasted under ${TOO_SHORT_SECONDS}s — review recommended.`,
    });
  }
  const targetSeconds = Math.max(1, targetMinutes) * 60;
  if (durationSeconds > targetSeconds * TOO_LONG_MULTIPLIER) {
    flags.push({
      type: "TOO_LONG",
      message: `Session lasted over ${TOO_LONG_MULTIPLIER}x the target duration (${targetMinutes}m) — review recommended.`,
    });
  }
  return flags;
}

export function resolveOperatingHours(
  location: { operatingHoursStart: string | null; operatingHoursEnd: string | null },
  site: { operatingHoursStart: string; operatingHoursEnd: string },
) {
  return {
    start: location.operatingHoursStart ?? site.operatingHoursStart,
    end: location.operatingHoursEnd ?? site.operatingHoursEnd,
  };
}
