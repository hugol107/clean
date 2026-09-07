import Link from "next/link";
import { notFound } from "next/navigation";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { Nfc, QrCode, ArrowLeft } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { assertSiteAccess, requireOrgAccess } from "@/lib/tenant";
import { getLocationDetail, getLocationTimeline } from "@/server/services/locations";
import { getCleaningsOverTime, getAvgDurationOverTime } from "@/server/services/analytics";
import { listChecklistTemplates } from "@/server/services/checklists";
import { computeLocationStatus } from "@/lib/sla";
import { getOrganization } from "@/server/services/organizations";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { LocationStatusBadge } from "@/components/status-badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";
import { EditLocationDialog } from "@/components/forms/edit-location-dialog";
import { LineMetricChart } from "@/components/charts/line-metric-chart";
import { LOCATION_TYPE_LABELS } from "@/lib/constants";
import { formatDurationCompact, formatMinutes } from "@/lib/utils";
import { IssueStatus, IssueSeverity } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export default async function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await resolveActiveOrganization();
  const accessCtx = await requireOrgAccess(ctx.organizationId);

  const [location, organization, checklists] = await Promise.all([
    getLocationDetail(ctx.organizationId, id).catch(() => null),
    getOrganization(ctx.organizationId),
    listChecklistTemplates(ctx.organizationId),
  ]);
  if (!location) notFound();
  assertSiteAccess(accessCtx, location.siteId);

  const [timeline, activeLock, openIssueCount, weekCount] = await Promise.all([
    getLocationTimeline(ctx.organizationId, id, 15),
    prisma.activeLocationLock.findUnique({ where: { locationId: id } }),
    prisma.issue.count({ where: { locationId: id, status: { in: [IssueStatus.OPEN, IssueStatus.ACKNOWLEDGED, IssueStatus.IN_PROGRESS] } } }),
    prisma.cleaningSession.count({ where: { locationId: id, status: "COMPLETED", startedAt: { gte: subDays(new Date(), 7) } } }),
  ]);

  const lastCompleted = await prisma.cleaningSession.findFirst({
    where: { locationId: id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });
  const hasHighSeverityIssue = await prisma.issue.findFirst({
    where: { locationId: id, severity: { in: [IssueSeverity.HIGH, IssueSeverity.CRITICAL] }, status: { in: [IssueStatus.OPEN, IssueStatus.ACKNOWLEDGED, IssueStatus.IN_PROGRESS] } },
  });

  const statusResult = computeLocationStatus({
    isActive: location.isActive,
    hasActiveSession: !!activeLock,
    hasOpenHighSeverityIssue: !!hasHighSeverityIssue,
    lastCompletedAt: lastCompleted?.completedAt ?? null,
    targetFrequencyMinutes: location.targetFrequencyMinutes,
    dueSoonThresholdPercent: organization.dueSoonThresholdPercent,
  });

  const completedDurations = timeline.filter((s) => s.durationSeconds != null).map((s) => s.durationSeconds!);
  const avgDuration = completedDurations.length ? Math.round(completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length) : null;

  const filters = { organizationId: ctx.organizationId, dateFrom: subDays(new Date(), 30), dateTo: new Date() };
  const [cleaningsOverTime, durationOverTime] = await Promise.all([
    getCleaningsOverTime({ ...filters, locationId: id }),
    getAvgDurationOverTime({ ...filters, locationId: id }),
  ]);

  const activeTag = location.nfcTags.find((t) => t.status === "ACTIVE");

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" className="w-fit -ml-2" asChild>
        <Link href="/locations">
          <ArrowLeft /> Back to locations
        </Link>
      </Button>

      <PageHeader
        title={location.name}
        description={`${location.site.name}${location.area ? ` · ${location.area.name}` : ""} · ${LOCATION_TYPE_LABELS[location.type]}`}
        actions={
          <>
            <LocationStatusBadge status={statusResult.status} className="text-sm px-3 py-1" />
            <EditLocationDialog
              organizationId={ctx.organizationId}
              locationId={location.id}
              name={location.name}
              targetDurationMinutes={location.targetDurationMinutes}
              targetFrequencyMinutes={location.targetFrequencyMinutes}
              checklistTemplateId={location.checklistTemplateId}
              checklistTemplates={checklists.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name }))}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Last cleaned" value={lastCompleted ? formatDistanceToNow(lastCompleted.completedAt!, { addSuffix: true }) : "Never"} />
        <KpiCard label="Average duration" value={avgDuration ? formatDurationCompact(avgDuration) : "—"} hint={`Target ${formatMinutes(location.targetDurationMinutes)}`} />
        <KpiCard label="Cleanings this week" value={weekCount} />
        <KpiCard label="Open issues" value={openIssueCount} tone={openIssueCount > 0 ? "warning" : "default"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cleaning duration over time</CardTitle>
          </CardHeader>
          <CardContent>
            {durationOverTime.length === 0 ? (
              <EmptyState title="No completed cleanings yet" description="Duration trends will appear here after the first cleaning." />
            ) : (
              <LineMetricChart data={durationOverTime} dataKey="avgMinutes" unit="m" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Visits per day</CardTitle>
          </CardHeader>
          <CardContent>
            {cleaningsOverTime.length === 0 ? (
              <EmptyState title="No visits recorded yet" description="Tap the NFC tag or QR code here to log the first visit." />
            ) : (
              <LineMetricChart data={cleaningsOverTime} dataKey="cleanings" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <EmptyState icon={QrCode} title="No cleaning sessions yet" description="Tap an NFC tag to start your first cleaning task." />
            ) : (
              <ul className="flex flex-col divide-y">
                {timeline.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="flex flex-col">
                      <span>
                        <span className="font-medium">{format(s.startedAt, "HH:mm")}</span> — {s.status === "ACTIVE" ? "Started" : "Cleaned"} by{" "}
                        {s.employee.user.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(s.startedAt, "MMM d")} · {s.durationSeconds ? formatDurationCompact(s.durationSeconds) : "in progress"}
                        {s.issues.length > 0 && ` · ${s.issues.length} issue${s.issues.length > 1 ? "s" : ""}`}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>NFC / QR tag</CardTitle>
          </CardHeader>
          <CardContent>
            {activeTag ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">This location has an active tag.</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/nfc-tags?locationId=${location.id}`}>
                    <Nfc /> Manage tag
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">No tag assigned yet. Generate one from the NFC Tags page.</p>
                <Button size="sm" asChild>
                  <Link href="/nfc-tags">
                    <Nfc /> Go to NFC Tags
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
