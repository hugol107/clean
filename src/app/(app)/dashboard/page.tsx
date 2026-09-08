import Link from "next/link";
import { CheckCircle2, Clock, AlertTriangle, Users, Timer, Gauge, MapPin, Activity } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { getAnalyticsOverview } from "@/server/services/analytics";
import { listLocationsWithStatus } from "@/server/services/locations";
import { listIssues } from "@/server/services/issues";
import { getAccessibleSiteIdsForCurrentMembership } from "@/server/services/access";
import { prisma } from "@/lib/db";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LocationStatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDurationCompact, initials } from "@/lib/utils";
import { IssueSeverity, IssueStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function DashboardPage() {
  const ctx = await resolveActiveOrganization();
  const accessibleSiteIds = await getAccessibleSiteIdsForCurrentMembership(ctx);

  const [overview, locations, criticalIssues, activeSessions] = await Promise.all([
    getAnalyticsOverview({ organizationId: ctx.organizationId, accessibleSiteIds, dateFrom: startOfToday(), dateTo: new Date() }),
    listLocationsWithStatus({ organizationId: ctx.organizationId, accessibleSiteIds }),
    listIssues({ organizationId: ctx.organizationId, accessibleSiteIds, status: IssueStatus.OPEN }),
    prisma.cleaningSession.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: "ACTIVE",
        ...(accessibleSiteIds ? { siteId: { in: accessibleSiteIds } } : {}),
      },
      select: { employeeId: true },
    }),
  ]);
  const activeEmployeesCount = new Set(activeSessions.map((s) => s.employeeId)).size;

  const pending = locations.filter((l) => l.status === "DUE_SOON" || l.status === "OVERDUE" || l.status === "NEVER_CLEANED").length;
  const overdue = locations.filter((l) => l.status === "OVERDUE").length;
  const activeCleanings = locations.filter((l) => l.status === "CLEANING");
  const highSeverityOpen = criticalIssues.filter((i) => i.severity === IssueSeverity.HIGH || i.severity === IssueSeverity.CRITICAL);

  const recentSessions = await prisma.cleaningSession.findMany({
    where: { organizationId: ctx.organizationId, status: "COMPLETED", ...(accessibleSiteIds ? { siteId: { in: accessibleSiteIds } } : {}) },
    include: { location: true, employee: { include: { user: true } } },
    orderBy: { completedAt: "desc" },
    take: 6,
  });

  const overdueLocations = locations.filter((l) => l.status === "OVERDUE").slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome back, ${ctx.user.name.split(" ")[0]}`}
        description={`Here's what's happening across ${ctx.organizationName} today.`}
        actions={
          <Button asChild size="sm">
            <Link href="/live">View live operations</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard label="Cleanings completed" value={overview.totalCleanings} icon={CheckCircle2} tone="success" hint="Today" style={{ animationDelay: "0ms" }} />
        <KpiCard
          label="Locations pending"
          value={pending}
          icon={Clock}
          tone={pending > 0 ? "warning" : "default"}
          hint={`${overdue} overdue`}
          style={{ animationDelay: "60ms" }}
        />
        <KpiCard label="Active cleanings" value={activeCleanings.length} icon={Activity} tone="info" hint="Right now" style={{ animationDelay: "120ms" }} />
        <KpiCard
          label="SLA compliance"
          value={`${overview.slaCompliancePercent}%`}
          icon={Gauge}
          tone={overview.slaCompliancePercent >= 90 ? "success" : overview.slaCompliancePercent >= 75 ? "warning" : "danger"}
          hint="Today"
          style={{ animationDelay: "180ms" }}
        />
        <KpiCard
          label="Avg cleaning time"
          value={formatDurationCompact(overview.averageDurationSeconds)}
          icon={Timer}
          tone="info"
          hint="Today"
          style={{ animationDelay: "240ms" }}
        />
        <KpiCard
          label="Issues open"
          value={criticalIssues.length}
          icon={AlertTriangle}
          tone={highSeverityOpen.length > 0 ? "danger" : "default"}
          hint={`${highSeverityOpen.length} high/critical`}
          style={{ animationDelay: "300ms" }}
        />
        <KpiCard label="Employees active" value={activeEmployeesCount} icon={Users} tone="success" hint="Currently cleaning" style={{ animationDelay: "360ms" }} />
        <KpiCard label="Cleaning hours" value={`${overview.totalCleaningHours}h`} icon={MapPin} tone="default" hint="Today" style={{ animationDelay: "420ms" }} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Zones with delays</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/locations?status=OVERDUE">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {overdueLocations.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Nothing overdue" description="Every location is within its cleaning frequency target." />
            ) : (
              <ul className="flex flex-col divide-y">
                {overdueLocations.map((loc) => (
                  <li key={loc.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex flex-col">
                      <Link href={`/locations/${loc.id}`} className="text-sm font-medium hover:underline">
                        {loc.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">{loc.siteName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-status-overdue font-medium">+{loc.overdueByMinutes}m</span>
                      <LocationStatusBadge status={loc.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recently completed</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/live">Live feed</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <EmptyState icon={Activity} title="No cleaning sessions yet" description="Tap an NFC tag to start your first cleaning task." />
            ) : (
              <ul className="flex flex-col divide-y">
                {recentSessions.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <Avatar className="size-7">
                      <AvatarFallback className="text-[10px]">{initials(s.employee.user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">
                        <span className="font-medium">{s.employee.user.name}</span> completed {s.location.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDurationCompact(s.durationSeconds)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
