import "server-only";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { getLocationPerformance, getSiteComparison, type AnalyticsFilters } from "@/server/services/analytics";
import { SessionStatus } from "@/generated/prisma/enums";

export type ReportType = "daily-cleaning" | "employee-activity" | "location-performance" | "sla-compliance" | "issues" | "cleaning-hours";

export const REPORT_LABELS: Record<ReportType, string> = {
  "daily-cleaning": "Daily Cleaning Report",
  "employee-activity": "Employee Activity",
  "location-performance": "Location Performance",
  "sla-compliance": "SLA Compliance",
  issues: "Issues Report",
  "cleaning-hours": "Cleaning Hours",
};

export interface GeneratedReport {
  fileName: string;
  csv: string;
}

async function dailyCleaningReport(filters: AnalyticsFilters): Promise<GeneratedReport> {
  const sessions = await prisma.cleaningSession.findMany({
    where: {
      organizationId: filters.organizationId,
      status: SessionStatus.COMPLETED,
      startedAt: { gte: filters.dateFrom, lte: filters.dateTo },
      ...(filters.siteId ? { siteId: filters.siteId } : {}),
      ...(filters.accessibleSiteIds ? { siteId: { in: filters.accessibleSiteIds } } : {}),
    },
    include: { location: { include: { site: true } }, employee: { include: { user: true } } },
    orderBy: { startedAt: "asc" },
  });

  const csv = toCsv(sessions, [
    { header: "Date", value: (s) => format(s.startedAt, "yyyy-MM-dd") },
    { header: "Site", value: (s) => s.location.site.name },
    { header: "Location", value: (s) => s.location.name },
    { header: "Employee", value: (s) => s.employee.user.name },
    { header: "Started", value: (s) => format(s.startedAt, "HH:mm") },
    { header: "Completed", value: (s) => (s.completedAt ? format(s.completedAt, "HH:mm") : "") },
    { header: "Duration (min)", value: (s) => (s.durationSeconds ? Math.round(s.durationSeconds / 60) : "") },
    { header: "Target (min)", value: (s) => s.location.targetDurationMinutes },
    { header: "Method", value: (s) => s.startMethod },
    { header: "Flagged", value: (s) => (s.flagReason ? "Yes" : "No") },
  ]);

  return { fileName: `daily-cleaning-report_${format(new Date(), "yyyyMMdd-HHmm")}.csv`, csv };
}

async function employeeActivityReport(filters: AnalyticsFilters): Promise<GeneratedReport> {
  const sessions = await prisma.cleaningSession.findMany({
    where: {
      organizationId: filters.organizationId,
      status: SessionStatus.COMPLETED,
      startedAt: { gte: filters.dateFrom, lte: filters.dateTo },
      ...(filters.siteId ? { siteId: filters.siteId } : {}),
      ...(filters.accessibleSiteIds ? { siteId: { in: filters.accessibleSiteIds } } : {}),
    },
    include: { employee: { include: { user: true, site: true } } },
  });

  const byEmployee = new Map<string, { name: string; site: string; cleanings: number; seconds: number }>();
  for (const s of sessions) {
    const entry = byEmployee.get(s.employeeId) ?? { name: s.employee.user.name, site: s.employee.site?.name ?? "—", cleanings: 0, seconds: 0 };
    entry.cleanings += 1;
    entry.seconds += s.durationSeconds ?? 0;
    byEmployee.set(s.employeeId, entry);
  }

  const rows = [...byEmployee.values()];
  const csv = toCsv(rows, [
    { header: "Employee", value: (r) => r.name },
    { header: "Site", value: (r) => r.site },
    { header: "Cleanings", value: (r) => r.cleanings },
    { header: "Total hours", value: (r) => Math.round((r.seconds / 3600) * 10) / 10 },
    { header: "Avg duration (min)", value: (r) => Math.round(r.seconds / r.cleanings / 60) },
  ]);

  return { fileName: `employee-activity_${format(new Date(), "yyyyMMdd-HHmm")}.csv`, csv };
}

async function locationPerformanceReport(filters: AnalyticsFilters): Promise<GeneratedReport> {
  const rows = await getLocationPerformance(filters);
  const csv = toCsv(rows, [
    { header: "Location", value: (r) => r.name },
    { header: "Site", value: (r) => r.siteName },
    { header: "Type", value: (r) => r.type },
    { header: "Cleanings", value: (r) => r.cleanings },
    { header: "Avg duration (min)", value: (r) => Math.round(r.avgDurationSeconds / 60) },
    { header: "Target (min)", value: (r) => r.targetMinutes },
    { header: "Variance %", value: (r) => r.variancePercent },
  ]);
  return { fileName: `location-performance_${format(new Date(), "yyyyMMdd-HHmm")}.csv`, csv };
}

async function slaComplianceReport(filters: AnalyticsFilters): Promise<GeneratedReport> {
  const rows = await getSiteComparison(filters);
  const csv = toCsv(rows, [
    { header: "Site", value: (r) => r.name },
    { header: "Cleanings", value: (r) => r.cleanings },
    { header: "SLA compliance %", value: (r) => r.slaCompliancePercent },
    { header: "Avg duration (min)", value: (r) => Math.round(r.avgDurationSeconds / 60) },
    { header: "Issues", value: (r) => r.issues },
  ]);
  return { fileName: `sla-compliance_${format(new Date(), "yyyyMMdd-HHmm")}.csv`, csv };
}

async function issuesReport(filters: AnalyticsFilters): Promise<GeneratedReport> {
  const issues = await prisma.issue.findMany({
    where: {
      organizationId: filters.organizationId,
      createdAt: { gte: filters.dateFrom, lte: filters.dateTo },
      ...(filters.siteId ? { siteId: filters.siteId } : {}),
      ...(filters.accessibleSiteIds ? { siteId: { in: filters.accessibleSiteIds } } : {}),
    },
    include: { location: { include: { site: true } }, reportedByUser: true },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(issues, [
    { header: "Date", value: (i) => format(i.createdAt, "yyyy-MM-dd HH:mm") },
    { header: "Site", value: (i) => i.location.site.name },
    { header: "Location", value: (i) => i.location.name },
    { header: "Type", value: (i) => i.type },
    { header: "Severity", value: (i) => i.severity },
    { header: "Status", value: (i) => i.status },
    { header: "Reported by", value: (i) => i.reportedByUser?.name ?? "—" },
    { header: "Description", value: (i) => i.description },
  ]);
  return { fileName: `issues-report_${format(new Date(), "yyyyMMdd-HHmm")}.csv`, csv };
}

async function cleaningHoursReport(filters: AnalyticsFilters): Promise<GeneratedReport> {
  const sessions = await prisma.cleaningSession.findMany({
    where: {
      organizationId: filters.organizationId,
      status: SessionStatus.COMPLETED,
      startedAt: { gte: filters.dateFrom, lte: filters.dateTo },
      ...(filters.siteId ? { siteId: filters.siteId } : {}),
      ...(filters.accessibleSiteIds ? { siteId: { in: filters.accessibleSiteIds } } : {}),
    },
    select: { startedAt: true, durationSeconds: true, siteId: true, location: { select: { site: { select: { name: true } } } } },
  });

  const byDaySite = new Map<string, { date: string; site: string; seconds: number }>();
  for (const s of sessions) {
    const date = format(s.startedAt, "yyyy-MM-dd");
    const key = `${date}__${s.siteId}`;
    const entry = byDaySite.get(key) ?? { date, site: s.location.site.name, seconds: 0 };
    entry.seconds += s.durationSeconds ?? 0;
    byDaySite.set(key, entry);
  }

  const rows = [...byDaySite.values()].sort((a, b) => a.date.localeCompare(b.date));
  const csv = toCsv(rows, [
    { header: "Date", value: (r) => r.date },
    { header: "Site", value: (r) => r.site },
    { header: "Cleaning hours", value: (r) => Math.round((r.seconds / 3600) * 100) / 100 },
  ]);
  return { fileName: `cleaning-hours_${format(new Date(), "yyyyMMdd-HHmm")}.csv`, csv };
}

export async function generateReport(type: ReportType, filters: AnalyticsFilters): Promise<GeneratedReport> {
  switch (type) {
    case "daily-cleaning":
      return dailyCleaningReport(filters);
    case "employee-activity":
      return employeeActivityReport(filters);
    case "location-performance":
      return locationPerformanceReport(filters);
    case "sla-compliance":
      return slaComplianceReport(filters);
    case "issues":
      return issuesReport(filters);
    case "cleaning-hours":
      return cleaningHoursReport(filters);
  }
}
