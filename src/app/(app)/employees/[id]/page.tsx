import Link from "next/link";
import { notFound } from "next/navigation";
import { format, subDays } from "date-fns";
import { ArrowLeft, Info } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { requireOrgAccess, assertSiteAccess } from "@/lib/tenant";
import { getEmployeeDetail } from "@/server/services/employees";
import { prisma } from "@/lib/db";
import { computeEfficiencyIndex } from "@/lib/sla";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BarMetricChart } from "@/components/charts/bar-metric-chart";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ROLE_LABELS } from "@/lib/rbac";
import { formatDurationCompact, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await resolveActiveOrganization();
  const accessCtx = await requireOrgAccess(ctx.organizationId);

  const employee = await getEmployeeDetail(ctx.organizationId, id).catch(() => null);
  if (!employee) notFound();
  if (employee.siteId) assertSiteAccess(accessCtx, employee.siteId);

  const since = subDays(new Date(), 30);
  const sessions = await prisma.cleaningSession.findMany({
    where: { employeeId: id, status: "COMPLETED", startedAt: { gte: since } },
    include: { location: { select: { name: true, targetDurationMinutes: true } } },
    orderBy: { startedAt: "asc" },
  });

  const totalHours = sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) / 3600;
  const avgDuration = sessions.length ? sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) / sessions.length : null;
  const withinTarget = sessions.filter((s) => (s.durationSeconds ?? 0) <= s.location.targetDurationMinutes * 60).length;
  const slaCompliance = sessions.length ? Math.round((withinTarget / sessions.length) * 100) : null;
  const issueCount = await prisma.issue.count({ where: { reportedByUserId: employee.userId, createdAt: { gte: since } } });

  const byDay = new Map<string, number>();
  for (const s of sessions) {
    const key = format(s.startedAt, "MMM d");
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const cleaningsPerDay = [...byDay.entries()].map(([date, count]) => ({ date, count }));

  const recent = sessions.slice(-10).reverse();

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" className="w-fit -ml-2" asChild>
        <Link href="/employees">
          <ArrowLeft /> Back to employees
        </Link>
      </Button>

      <div className="flex items-center gap-4">
        <Avatar className="size-14">
          <AvatarFallback className="text-lg">{initials(employee.user.name)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{employee.user.name}</h1>
            <Badge variant="secondary">{ROLE_LABELS[employee.role]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {employee.user.email} · {employee.site?.name ?? "No site assigned"}
            {employee.jobTitle && ` · ${employee.jobTitle}`}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          These figures are operational context, not a ranking. Different zones require different effort — compare duration against
          each location&apos;s own target, not against other employees.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Cleanings (30d)" value={sessions.length} />
        <KpiCard label="Hours (30d)" value={`${totalHours.toFixed(1)}h`} />
        <KpiCard label="Avg duration" value={avgDuration ? formatDurationCompact(avgDuration) : "—"} />
        <KpiCard label="SLA compliance" value={slaCompliance != null ? `${slaCompliance}%` : "—"} hint={`${issueCount} issues reported`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cleanings per day (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {cleaningsPerDay.length === 0 ? (
            <EmptyState title="No cleanings yet" description="Sessions will appear here once this worker starts cleaning." />
          ) : (
            <BarMetricChart data={cleaningsPerDay} dataKey="count" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState title="No sessions yet" />
          ) : (
            <ul className="flex flex-col divide-y">
              {recent.map((s) => {
                const efficiency = computeEfficiencyIndex(s.durationSeconds ?? 0, s.location.targetDurationMinutes);
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{s.location.name}</span>
                      <span className="text-xs text-muted-foreground">{format(s.startedAt, "MMM d, HH:mm")}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDurationCompact(s.durationSeconds)}</span>
                      <Badge variant={efficiency.band === "slower" ? "warning" : efficiency.band === "faster" ? "info" : "success"}>
                        {efficiency.variancePercent > 0 ? "+" : ""}
                        {efficiency.variancePercent}% vs target
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
