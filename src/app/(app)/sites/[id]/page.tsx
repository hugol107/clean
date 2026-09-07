import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, MapPin } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { assertSiteAccess, requireOrgAccess } from "@/lib/tenant";
import { getSite } from "@/server/services/sites";
import { listLocationsWithStatus } from "@/server/services/locations";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationStatusBadge, StatusDot } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { LocationOperationalStatus } from "@/lib/sla";

export const dynamic = "force-dynamic";

const TILE_CLASSES: Record<LocationOperationalStatus, string> = {
  CLEAN: "bg-status-clean-bg text-status-clean border-status-clean/30",
  CLEANING: "bg-status-cleaning-bg text-status-cleaning border-status-cleaning/30",
  DUE_SOON: "bg-status-due-soon-bg text-status-due-soon border-status-due-soon/30",
  OVERDUE: "bg-status-overdue-bg text-status-overdue border-status-overdue/30",
  ISSUE: "bg-status-issue-bg text-status-issue border-status-issue/30",
  UNAVAILABLE: "bg-status-unavailable-bg text-status-unavailable border-status-unavailable/30",
  NEVER_CLEANED: "bg-status-unavailable-bg text-status-unavailable border-status-unavailable/30",
};

export default async function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await resolveActiveOrganization();
  const accessCtx = await requireOrgAccess(ctx.organizationId);

  const site = await getSite(ctx.organizationId, id).catch(() => null);
  if (!site) notFound();
  assertSiteAccess(accessCtx, id);

  const locations = await listLocationsWithStatus({ organizationId: ctx.organizationId, siteId: id });

  const grouped = new Map<string, typeof locations>();
  for (const loc of locations) {
    const key = loc.areaName ?? "General";
    grouped.set(key, [...(grouped.get(key) ?? []), loc]);
  }
  const areaNames = [...grouped.keys()].sort();

  const legend: { status: LocationOperationalStatus; label: string }[] = [
    { status: "CLEAN", label: "Clean" },
    { status: "CLEANING", label: "Cleaning" },
    { status: "DUE_SOON", label: "Due soon" },
    { status: "OVERDUE", label: "Overdue" },
    { status: "ISSUE", label: "Issue" },
    { status: "UNAVAILABLE", label: "Unavailable" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" className="w-fit -ml-2" asChild>
        <Link href="/sites">
          <ArrowLeft /> Back to sites
        </Link>
      </Button>

      <PageHeader
        title={site.name}
        description={[site.address, site.city, site.country].filter(Boolean).join(", ") || "No address set"}
        actions={
          <Button size="sm" asChild>
            <Link href={`/locations/new?site=${site.id}`}>
              <Plus /> Add location
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Operational map</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-4">
            {legend.map((l) => (
              <div key={l.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <StatusDot status={l.status} />
                {l.label}
              </div>
            ))}
          </div>

          {locations.length === 0 ? (
            <EmptyState icon={MapPin} title="No locations yet" description="Add locations to see them appear on the map." />
          ) : (
            areaNames.map((area) => (
              <div key={area} className="flex flex-col gap-2">
                <span className="text-sm font-medium">{area}</span>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                  {grouped.get(area)!.map((loc) => (
                    <Link
                      key={loc.id}
                      href={`/locations/${loc.id}`}
                      title={`${loc.name} — ${loc.status.replaceAll("_", " ")}`}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-lg border text-xs font-medium transition-transform hover:scale-105",
                        TILE_CLASSES[loc.status],
                      )}
                    >
                      {loc.code}
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Locations ({locations.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {locations.map((loc) => (
            <Link key={loc.id} href={`/locations/${loc.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-accent/40">
              <div className="flex flex-col">
                <span className="font-medium">{loc.name}</span>
                <span className="text-xs text-muted-foreground">{loc.areaName ?? "General"}</span>
              </div>
              <LocationStatusBadge status={loc.status} />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
