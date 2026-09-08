import Link from "next/link";
import { Plus, Rows3, MapPin } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { listLocationsWithStatus } from "@/server/services/locations";
import { listSites } from "@/server/services/sites";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { QuerySelect } from "@/components/dashboard/query-select";
import { SearchBox } from "@/components/dashboard/search-box";
import { LocationStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LOCATION_TYPE_LABELS, LOCATION_TYPE_OPTIONS } from "@/lib/constants";
import { formatMinutes } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { getAccessibleSiteIdsForCurrentMembership } from "@/server/services/access";
import type { LocationType } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; type?: string; status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const ctx = await resolveActiveOrganization();
  const accessibleSiteIds = await getAccessibleSiteIdsForCurrentMembership(ctx);

  const [locations, sites] = await Promise.all([
    listLocationsWithStatus({
      organizationId: ctx.organizationId,
      accessibleSiteIds,
      siteId: params.site,
      type: params.type as LocationType | undefined,
      search: params.q,
    }),
    listSites(ctx.organizationId, accessibleSiteIds),
  ]);

  const filtered = params.status ? locations.filter((l) => l.status === params.status) : locations;
  const canManage = ctx.role === "ORG_ADMIN" || ctx.role === "SITE_MANAGER" || ctx.user.isSuperAdmin;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Locations"
        description={`${locations.length} locations across ${sites.length} site${sites.length === 1 ? "" : "s"}`}
        actions={
          canManage && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/locations/bulk">
                  <Rows3 /> Bulk create
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/locations/new">
                  <Plus /> Add location
                </Link>
              </Button>
            </>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchBox defaultValue={params.q} placeholder="Search by name or code…" className="w-full sm:w-64" preserveParams={params} />
        <QuerySelect paramKey="site" placeholder="All sites" className="w-40" options={sites.map((s) => ({ value: s.id, label: s.name }))} />
        <QuerySelect paramKey="type" placeholder="All types" className="w-40" options={LOCATION_TYPE_OPTIONS} />
        <QuerySelect
          paramKey="status"
          placeholder="All statuses"
          className="w-40"
          options={["CLEAN", "DUE_SOON", "OVERDUE", "CLEANING", "ISSUE", "NEVER_CLEANED"].map((s) => ({ value: s, label: s.replaceAll("_", " ") }))}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No locations match these filters"
          description="Try clearing filters, or add your first location to get started."
          action={
            canManage && (
              <Button size="sm" asChild>
                <Link href="/locations/new">
                  <Plus /> Add location
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead className="hidden sm:table-cell">Site</TableHead>
                  <TableHead className="hidden lg:table-cell">Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Last cleaned</TableHead>
                  <TableHead className="hidden lg:table-cell">Target</TableHead>
                  <TableHead className="hidden lg:table-cell">Frequency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell>
                      <Link href={`/locations/${loc.id}`} className="font-medium hover:underline">
                        {loc.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {loc.code}
                        <span className="sm:hidden"> · {loc.siteName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{loc.siteName}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{LOCATION_TYPE_LABELS[loc.type]}</TableCell>
                    <TableCell>
                      <LocationStatusBadge status={loc.status} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {loc.lastCleanedAt ? formatDistanceToNow(loc.lastCleanedAt, { addSuffix: true }) : "Never"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{formatMinutes(loc.targetDurationMinutes)}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">every {formatMinutes(loc.targetFrequencyMinutes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
