import "server-only";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { computeEfficiencyIndex } from "@/lib/sla";
import { SessionStatus, TaskStatus } from "@/generated/prisma/enums";
import type { LocationType } from "@/generated/prisma/enums";

export interface AnalyticsFilters {
  organizationId: string;
  accessibleSiteIds?: string[] | null;
  siteId?: string;
  areaId?: string;
  locationId?: string;
  locationType?: LocationType;
  employeeId?: string;
  dateFrom: Date;
  dateTo: Date;
}

interface SessionRow {
  id: string;
  startedAt: Date;
  completedAt: Date | null;
  durationSeconds: number | null;
  siteId: string;
  siteName: string;
  locationId: string;
  locationName: string;
  locationType: LocationType;
  targetDurationMinutes: number;
  employeeId: string;
  employeeName: string;
  flagReason: string | null;
}

async function getCompletedSessionsInRange(filters: AnalyticsFilters): Promise<SessionRow[]> {
  const sessions = await prisma.cleaningSession.findMany({
    where: {
      organizationId: filters.organizationId,
      status: SessionStatus.COMPLETED,
      startedAt: { gte: filters.dateFrom, lte: filters.dateTo },
      ...(filters.accessibleSiteIds ? { siteId: { in: filters.accessibleSiteIds } } : {}),
      ...(filters.siteId ? { siteId: filters.siteId } : {}),
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      location: {
        ...(filters.areaId ? { areaId: filters.areaId } : {}),
        ...(filters.locationId ? { id: filters.locationId } : {}),
        ...(filters.locationType ? { type: filters.locationType } : {}),
      },
    },
    include: { location: { include: { site: true } }, employee: { include: { user: true } } },
    orderBy: { startedAt: "asc" },
  });

  return sessions.map((s) => ({
    id: s.id,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    durationSeconds: s.durationSeconds,
    siteId: s.siteId,
    siteName: s.location.site.name,
    locationId: s.locationId,
    locationName: s.location.name,
    locationType: s.location.type,
    targetDurationMinutes: s.location.targetDurationMinutes,
    employeeId: s.employeeId,
    employeeName: s.employee.user.name,
    flagReason: s.flagReason,
  }));
}

async function getIssuesInRange(filters: AnalyticsFilters) {
  return prisma.issue.findMany({
    where: {
      organizationId: filters.organizationId,
      createdAt: { gte: filters.dateFrom, lte: filters.dateTo },
      ...(filters.accessibleSiteIds ? { siteId: { in: filters.accessibleSiteIds } } : {}),
      ...(filters.siteId ? { siteId: filters.siteId } : {}),
      ...(filters.locationId ? { locationId: filters.locationId } : {}),
    },
    select: { id: true, type: true, severity: true, createdAt: true, locationId: true },
  });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export async function getAnalyticsOverview(filters: AnalyticsFilters) {
  const [sessions, issues, tasksOverdue, locations] = await Promise.all([
    getCompletedSessionsInRange(filters),
    getIssuesInRange(filters),
    prisma.cleaningTask.count({
      where: {
        organizationId: filters.organizationId,
        status: TaskStatus.OVERDUE,
        ...(filters.siteId ? { siteId: filters.siteId } : {}),
        ...(filters.accessibleSiteIds ? { siteId: { in: filters.accessibleSiteIds } } : {}),
      },
    }),
    prisma.location.findMany({
      where: {
        organizationId: filters.organizationId,
        isActive: true,
        ...(filters.siteId ? { siteId: filters.siteId } : {}),
        ...(filters.accessibleSiteIds ? { siteId: { in: filters.accessibleSiteIds } } : {}),
      },
      select: { id: true, targetFrequencyMinutes: true },
    }),
  ]);

  const durations = sessions.map((s) => s.durationSeconds ?? 0);
  const totalCleanings = sessions.length;
  const totalCleaningHours = durations.reduce((sum, d) => sum + d, 0) / 3600;
  const averageDurationSeconds = totalCleanings ? durations.reduce((a, b) => a + b, 0) / totalCleanings : 0;
  const medianDurationSeconds = median(durations);

  const withinTarget = sessions.filter((s) => (s.durationSeconds ?? 0) <= s.targetDurationMinutes * 60).length;
  const slaCompliancePercent = totalCleanings ? Math.round((withinTarget / totalCleanings) * 100) : 100;

  const issueRate = totalCleanings ? Math.round((issues.length / totalCleanings) * 1000) / 10 : 0;

  const rangeMinutes = Math.max(1, (filters.dateTo.getTime() - filters.dateFrom.getTime()) / 60000);
  const sessionsByLocation = new Map<string, number>();
  for (const s of sessions) sessionsByLocation.set(s.locationId, (sessionsByLocation.get(s.locationId) ?? 0) + 1);
  const complianceRatios = locations.map((loc) => {
    const expected = Math.max(1, rangeMinutes / loc.targetFrequencyMinutes);
    const actual = sessionsByLocation.get(loc.id) ?? 0;
    return Math.min(1, actual / expected);
  });
  const frequencyCompliancePercent = complianceRatios.length
    ? Math.round((complianceRatios.reduce((a, b) => a + b, 0) / complianceRatios.length) * 100)
    : 100;

  return {
    totalCleanings,
    totalCleaningHours: Math.round(totalCleaningHours * 10) / 10,
    averageDurationSeconds: Math.round(averageDurationSeconds),
    medianDurationSeconds: Math.round(medianDurationSeconds),
    slaCompliancePercent,
    tasksOverdue,
    issueRate,
    frequencyCompliancePercent,
    openIssues: issues.length,
  };
}

export async function getCleaningsOverTime(filters: AnalyticsFilters) {
  const sessions = await getCompletedSessionsInRange(filters);
  const byDay = new Map<string, { count: number; seconds: number }>();
  for (const s of sessions) {
    const key = format(s.startedAt, "yyyy-MM-dd");
    const entry = byDay.get(key) ?? { count: 0, seconds: 0 };
    entry.count += 1;
    entry.seconds += s.durationSeconds ?? 0;
    byDay.set(key, entry);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, cleanings: v.count, hours: Math.round((v.seconds / 3600) * 10) / 10 }));
}

export async function getAvgDurationOverTime(filters: AnalyticsFilters) {
  const sessions = await getCompletedSessionsInRange(filters);
  const byDay = new Map<string, number[]>();
  for (const s of sessions) {
    const key = format(s.startedAt, "yyyy-MM-dd");
    byDay.set(key, [...(byDay.get(key) ?? []), s.durationSeconds ?? 0]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, avgMinutes: Math.round((values.reduce((a, b) => a + b, 0) / values.length / 60) * 10) / 10 }));
}

export async function getSlaComplianceOverTime(filters: AnalyticsFilters) {
  const sessions = await getCompletedSessionsInRange(filters);
  const byDay = new Map<string, { total: number; withinTarget: number }>();
  for (const s of sessions) {
    const key = format(s.startedAt, "yyyy-MM-dd");
    const entry = byDay.get(key) ?? { total: 0, withinTarget: 0 };
    entry.total += 1;
    if ((s.durationSeconds ?? 0) <= s.targetDurationMinutes * 60) entry.withinTarget += 1;
    byDay.set(key, entry);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, compliancePercent: Math.round((v.withinTarget / v.total) * 100) }));
}

export async function getCleaningsByLocationType(filters: AnalyticsFilters) {
  const sessions = await getCompletedSessionsInRange(filters);
  const byType = new Map<string, number>();
  for (const s of sessions) byType.set(s.locationType, (byType.get(s.locationType) ?? 0) + 1);
  return [...byType.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
}

export async function getIssuesByCategory(filters: AnalyticsFilters) {
  const issues = await getIssuesInRange(filters);
  const byType = new Map<string, number>();
  for (const i of issues) byType.set(i.type, (byType.get(i.type) ?? 0) + 1);
  return [...byType.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
}

export async function getBusiestHours(filters: AnalyticsFilters) {
  const sessions = await getCompletedSessionsInRange(filters);
  const byHour = new Array(24).fill(0);
  for (const s of sessions) byHour[s.startedAt.getHours()] += 1;
  return byHour.map((count, hour) => ({ hour, count }));
}

export async function getDurationDistribution(filters: AnalyticsFilters) {
  const sessions = await getCompletedSessionsInRange(filters);
  const buckets = [
    { label: "0-5m", max: 5 * 60 },
    { label: "5-10m", max: 10 * 60 },
    { label: "10-15m", max: 15 * 60 },
    { label: "15-20m", max: 20 * 60 },
    { label: "20-30m", max: 30 * 60 },
    { label: "30m+", max: Infinity },
  ];
  const counts = buckets.map(() => 0);
  for (const s of sessions) {
    const d = s.durationSeconds ?? 0;
    const idx = buckets.findIndex((b) => d <= b.max);
    counts[idx === -1 ? buckets.length - 1 : idx] += 1;
  }
  return buckets.map((b, i) => ({ label: b.label, count: counts[i] }));
}

export async function getLocationPerformance(filters: AnalyticsFilters) {
  const sessions = await getCompletedSessionsInRange(filters);
  const byLocation = new Map<string, { name: string; type: LocationType; siteName: string; durations: number[]; target: number }>();
  for (const s of sessions) {
    const entry = byLocation.get(s.locationId) ?? { name: s.locationName, type: s.locationType, siteName: s.siteName, durations: [], target: s.targetDurationMinutes };
    entry.durations.push(s.durationSeconds ?? 0);
    byLocation.set(s.locationId, entry);
  }
  return [...byLocation.entries()]
    .map(([locationId, v]) => {
      const avgSeconds = v.durations.reduce((a, b) => a + b, 0) / v.durations.length;
      const efficiency = computeEfficiencyIndex(avgSeconds, v.target);
      return {
        locationId,
        name: v.name,
        type: v.type,
        siteName: v.siteName,
        cleanings: v.durations.length,
        avgDurationSeconds: Math.round(avgSeconds),
        targetMinutes: v.target,
        efficiencyRatio: efficiency.ratio,
        variancePercent: efficiency.variancePercent,
      };
    })
    .sort((a, b) => b.cleanings - a.cleanings);
}

export async function getSiteComparison(filters: AnalyticsFilters) {
  const sessions = await getCompletedSessionsInRange(filters);
  const issues = await getIssuesInRange(filters);
  const issuesBySite = new Map<string, number>();
  const locationToSite = new Map(sessions.map((s) => [s.locationId, s.siteId]));
  for (const i of issues) {
    const siteId = locationToSite.get(i.locationId);
    if (siteId) issuesBySite.set(siteId, (issuesBySite.get(siteId) ?? 0) + 1);
  }

  const bySite = new Map<string, { name: string; durations: number[]; withinTarget: number }>();
  for (const s of sessions) {
    const entry = bySite.get(s.siteId) ?? { name: s.siteName, durations: [], withinTarget: 0 };
    entry.durations.push(s.durationSeconds ?? 0);
    if ((s.durationSeconds ?? 0) <= s.targetDurationMinutes * 60) entry.withinTarget += 1;
    bySite.set(s.siteId, entry);
  }

  return [...bySite.entries()].map(([siteId, v]) => ({
    siteId,
    name: v.name,
    cleanings: v.durations.length,
    avgDurationSeconds: Math.round(v.durations.reduce((a, b) => a + b, 0) / v.durations.length),
    slaCompliancePercent: Math.round((v.withinTarget / v.durations.length) * 100),
    issues: issuesBySite.get(siteId) ?? 0,
  }));
}
