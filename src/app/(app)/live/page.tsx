import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { resolveActiveOrganization } from "@/lib/current-org";
import { getAccessibleSiteIdsForCurrentMembership } from "@/server/services/access";
import { listLocationsWithStatus } from "@/server/services/locations";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LocationStatusBadge } from "@/components/status-badge";
import { LiveOperationsTable, type LiveSession } from "@/components/live/live-operations-table";
import { formatDurationCompact } from "@/lib/utils";
import { CheckCircle2, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LiveOperationsPage() {
  const ctx = await resolveActiveOrganization();
  const accessibleSiteIds = await getAccessibleSiteIdsForCurrentMembership(ctx);

  const [activeSessions, recentlyCompleted, locations] = await Promise.all([
    prisma.cleaningSession.findMany({
      where: { organizationId: ctx.organizationId, status: "ACTIVE", ...(accessibleSiteIds ? { siteId: { in: accessibleSiteIds } } : {}) },
      include: { employee: { include: { user: true } }, location: true },
      orderBy: { startedAt: "asc" },
    }),
    prisma.cleaningSession.findMany({
      where: { organizationId: ctx.organizationId, status: "COMPLETED", ...(accessibleSiteIds ? { siteId: { in: accessibleSiteIds } } : {}) },
      include: { employee: { include: { user: true } }, location: true },
      orderBy: { completedAt: "desc" },
      take: 8,
    }),
    listLocationsWithStatus({ organizationId: ctx.organizationId, accessibleSiteIds }),
  ]);

  const initialSessions: LiveSession[] = activeSessions.map((s) => ({
    sessionId: s.id,
    locationId: s.locationId,
    employeeName: s.employee.user.name,
    locationName: s.location.name,
    startedAt: s.startedAt.toISOString(),
    targetMinutes: s.location.targetDurationMinutes,
  }));

  const pendingLocations = locations.filter((l) => l.status === "DUE_SOON" || l.status === "OVERDUE" || l.status === "NEVER_CLEANED");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Live Operations" description="Updates automatically every few seconds." />

      <Card>
        <CardHeader>
          <CardTitle>Active cleanings ({initialSessions.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-5">
          <LiveOperationsTable organizationId={ctx.organizationId} initialSessions={initialSessions} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recently completed</CardTitle>
          </CardHeader>
          <CardContent>
            {recentlyCompleted.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Nothing completed yet" />
            ) : (
              <ul className="flex flex-col divide-y">
                {recentlyCompleted.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span>
                      <span className="font-medium">{s.employee.user.name}</span> · {s.location.name}
                    </span>
                    <span className="text-muted-foreground">{formatDurationCompact(s.durationSeconds)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending locations ({pendingLocations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingLocations.length === 0 ? (
              <EmptyState icon={Clock} title="Nothing pending" description="Every location is clean or being cleaned." />
            ) : (
              <ul className="flex flex-col divide-y">
                {pendingLocations.slice(0, 8).map((loc) => (
                  <li key={loc.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <Link href={`/locations/${loc.id}`} className="hover:underline">
                      {loc.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      {loc.lastCleanedAt && (
                        <span className="text-xs text-muted-foreground">{formatDistanceToNow(loc.lastCleanedAt, { addSuffix: true })}</span>
                      )}
                      <LocationStatusBadge status={loc.status} />
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
