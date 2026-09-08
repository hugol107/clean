import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { getAccessibleSiteIdsForCurrentMembership } from "@/server/services/access";
import { listSites } from "@/server/services/sites";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function SitesPage() {
  const ctx = await resolveActiveOrganization();
  const accessibleSiteIds = await getAccessibleSiteIdsForCurrentMembership(ctx);
  const sites = await listSites(ctx.organizationId, accessibleSiteIds);
  const canCreate = ctx.role === "ORG_ADMIN" || ctx.user.isSuperAdmin;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Sites"
        description={`${sites.length} site${sites.length === 1 ? "" : "s"} in ${ctx.organizationName}`}
        actions={
          canCreate && (
            <Button size="sm" asChild>
              <Link href="/sites/new">
                <Plus /> Add site
              </Link>
            </Button>
          )
        }
      />

      {sites.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No sites yet"
          description="Create your first hotel, building, or terminal to start adding locations."
          action={
            canCreate && (
              <Button size="sm" asChild>
                <Link href="/sites/new">
                  <Plus /> Add site
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <Link key={site.id} href={`/sites/${site.id}`}>
              <Card className="card-hover h-full transition-colors hover:border-primary/40">
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle>{site.name}</CardTitle>
                    <CardDescription>{[site.city, site.country].filter(Boolean).join(", ") || "No address set"}</CardDescription>
                  </div>
                  {!site.isActive && <Badge variant="neutral">Archived</Badge>}
                </CardHeader>
                <CardContent className="flex gap-4 text-sm text-muted-foreground">
                  <span>{site._count.locations} locations</span>
                  <span>{site._count.employeeProfiles} workers</span>
                  <span>
                    {site.operatingHoursStart}–{site.operatingHoursEnd}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
