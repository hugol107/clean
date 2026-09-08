import { resolveActiveOrganization } from "@/lib/current-org";
import { getAccessibleSiteIdsForCurrentMembership } from "@/server/services/access";
import { listSites } from "@/server/services/sites";
import { listEmployees } from "@/server/services/employees";
import {
  getAnalyticsOverview,
  getCleaningsOverTime,
  getAvgDurationOverTime,
  getSlaComplianceOverTime,
  getCleaningsByLocationType,
  getIssuesByCategory,
  getBusiestHours,
  getDurationDistribution,
  getLocationPerformance,
  getSiteComparison,
} from "@/server/services/analytics";
import { resolveDateRange } from "@/lib/date-range";
import { PageHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { QuerySelect } from "@/components/dashboard/query-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LineMetricChart } from "@/components/charts/line-metric-chart";
import { BarMetricChart } from "@/components/charts/bar-metric-chart";
import { CategoricalBarChart } from "@/components/charts/categorical-bar-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DATE_RANGE_PRESETS, LOCATION_TYPE_LABELS, LOCATION_TYPE_OPTIONS, ISSUE_TYPE_LABELS } from "@/lib/constants";
import { formatDurationCompact } from "@/lib/utils";
import type { LocationType } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; type?: string; employee?: string; range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const ctx = await resolveActiveOrganization();
  const accessibleSiteIds = await getAccessibleSiteIdsForCurrentMembership(ctx);
  const { dateFrom, dateTo, label } = resolveDateRange(params.range, params.from, params.to);

  const filters = {
    organizationId: ctx.organizationId,
    accessibleSiteIds,
    siteId: params.site,
    locationType: params.type as LocationType | undefined,
    employeeId: params.employee,
    dateFrom,
    dateTo,
  };

  const [sites, employees, overview, cleaningsOverTime, avgDuration, slaOverTime, byType, byIssueCategory, busiestHours, distribution, locationPerf, siteComparison] =
    await Promise.all([
      listSites(ctx.organizationId, accessibleSiteIds),
      listEmployees({ organizationId: ctx.organizationId, siteIds: accessibleSiteIds ?? undefined }),
      getAnalyticsOverview(filters),
      getCleaningsOverTime(filters),
      getAvgDurationOverTime(filters),
      getSlaComplianceOverTime(filters),
      getCleaningsByLocationType(filters),
      getIssuesByCategory(filters),
      getBusiestHours(filters),
      getDurationDistribution(filters),
      getLocationPerformance(filters),
      getSiteComparison(filters),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Analytics" description={`${label} · ${overview.totalCleanings} cleanings`} />

      <div className="flex flex-wrap items-center gap-2">
        <QuerySelect paramKey="range" placeholder="Last 30 days" className="w-40" options={DATE_RANGE_PRESETS.filter((p) => p.value !== "custom").map((p) => ({ value: p.value, label: p.label }))} />
        <QuerySelect paramKey="site" placeholder="All sites" className="w-40" options={sites.map((s) => ({ value: s.id, label: s.name }))} />
        <QuerySelect paramKey="type" placeholder="All location types" className="w-44" options={LOCATION_TYPE_OPTIONS} />
        <QuerySelect paramKey="employee" placeholder="All employees" className="w-44" options={employees.map((e) => ({ value: e.id, label: e.user.name }))} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total cleanings" value={overview.totalCleanings} />
        <KpiCard label="Cleaning hours" value={`${overview.totalCleaningHours}h`} />
        <KpiCard label="Median duration" value={formatDurationCompact(overview.medianDurationSeconds)} />
        <KpiCard label="Average duration" value={formatDurationCompact(overview.averageDurationSeconds)} />
        <KpiCard
          label="SLA compliance"
          value={`${overview.slaCompliancePercent}%`}
          tone={overview.slaCompliancePercent >= 90 ? "success" : overview.slaCompliancePercent >= 75 ? "warning" : "danger"}
        />
        <KpiCard label="Tasks overdue" value={overview.tasksOverdue} tone={overview.tasksOverdue > 0 ? "warning" : "default"} />
        <KpiCard label="Issue rate" value={`${overview.issueRate}%`} hint="issues per cleaning" />
        <KpiCard label="Frequency compliance" value={`${overview.frequencyCompliancePercent}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Cleanings over time">
          {cleaningsOverTime.length === 0 ? <NoData /> : <BarMetricChart data={cleaningsOverTime} dataKey="cleanings" />}
        </ChartCard>
        <ChartCard title="Average cleaning duration over time">
          {avgDuration.length === 0 ? <NoData /> : <LineMetricChart data={avgDuration} dataKey="avgMinutes" unit="m" />}
        </ChartCard>
        <ChartCard title="SLA compliance over time">
          {slaOverTime.length === 0 ? (
            <NoData />
          ) : (
            <LineMetricChart data={slaOverTime} dataKey="compliancePercent" color="#0ca30c" unit="%" />
          )}
        </ChartCard>
        <ChartCard title="Cleaning hours by day">
          {cleaningsOverTime.length === 0 ? <NoData /> : <BarMetricChart data={cleaningsOverTime} dataKey="hours" unit="h" />}
        </ChartCard>
        <ChartCard title="Cleanings by location type">
          {byType.length === 0 ? (
            <NoData />
          ) : (
            <CategoricalBarChart data={byType.map((t) => ({ label: LOCATION_TYPE_LABELS[t.type as LocationType], value: t.count }))} />
          )}
        </ChartCard>
        <ChartCard title="Issues by category">
          {byIssueCategory.length === 0 ? (
            <NoData label="No issues in this range — nothing to plot." />
          ) : (
            <CategoricalBarChart data={byIssueCategory.map((t) => ({ label: ISSUE_TYPE_LABELS[t.type as keyof typeof ISSUE_TYPE_LABELS], value: t.count }))} />
          )}
        </ChartCard>
        <ChartCard title="Busiest hours">
          <BarMetricChart data={busiestHours.map((h) => ({ hour: `${h.hour}:00`, count: h.count }))} dataKey="count" xKey="hour" />
        </ChartCard>
        <ChartCard title="Duration distribution">
          {distribution.every((d) => d.count === 0) ? <NoData /> : <BarMetricChart data={distribution} dataKey="count" xKey="label" />}
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Location performance</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {locationPerf.length === 0 ? (
            <NoData />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead className="hidden sm:table-cell">Site</TableHead>
                  <TableHead>Cleanings</TableHead>
                  <TableHead className="hidden md:table-cell">Avg duration</TableHead>
                  <TableHead className="hidden lg:table-cell">Target</TableHead>
                  <TableHead>Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locationPerf.slice(0, 15).map((row) => (
                  <TableRow key={row.locationId}>
                    <TableCell className="font-medium">
                      {row.name}
                      <div className="text-muted-foreground text-xs font-normal sm:hidden">{row.siteName}</div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{row.siteName}</TableCell>
                    <TableCell>{row.cleanings}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatDurationCompact(row.avgDurationSeconds)}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{row.targetMinutes}m</TableCell>
                    <TableCell className={row.variancePercent > 15 ? "text-status-overdue" : row.variancePercent < -10 ? "text-status-cleaning" : ""}>
                      {row.variancePercent > 0 ? "+" : ""}
                      {row.variancePercent}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site comparison</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {siteComparison.length === 0 ? (
            <NoData />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Cleanings</TableHead>
                  <TableHead>Avg duration</TableHead>
                  <TableHead>SLA compliance</TableHead>
                  <TableHead>Issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {siteComparison.map((row) => (
                  <TableRow key={row.siteId}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.cleanings}</TableCell>
                    <TableCell>{formatDurationCompact(row.avgDurationSeconds)}</TableCell>
                    <TableCell>{row.slaCompliancePercent}%</TableCell>
                    <TableCell>{row.issues}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function NoData({ label = "No data in this range yet." }: { label?: string }) {
  return <EmptyState title={label} className="py-8" />;
}
