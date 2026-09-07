import { resolveActiveOrganization } from "@/lib/current-org";
import { getAccessibleSiteIdsForCurrentMembership } from "@/server/services/access";
import { listSites } from "@/server/services/sites";
import { listChecklistTemplates } from "@/server/services/checklists";
import { PageHeader } from "@/components/dashboard/page-header";
import { LocationForm } from "@/components/forms/location-form";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function NewLocationPage({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const { site } = await searchParams;
  const ctx = await resolveActiveOrganization();
  const accessibleSiteIds = await getAccessibleSiteIdsForCurrentMembership(ctx);
  const [sites, checklists] = await Promise.all([
    listSites(ctx.organizationId, accessibleSiteIds),
    listChecklistTemplates(ctx.organizationId),
  ]);

  if (sites.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Add location" />
        <EmptyState
          icon={Building2}
          title="Create a site first"
          description="Locations belong to a site (hotel, building, terminal…). Add one before creating locations."
          action={
            <Button size="sm" asChild>
              <Link href="/sites/new">Add site</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Add location" description="A single physical zone that will get its own NFC tag / QR code." />
      <LocationForm
        organizationId={ctx.organizationId}
        sites={sites.map((s) => ({ id: s.id, name: s.name }))}
        checklistTemplates={checklists.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name }))}
        defaultSiteId={site}
      />
    </div>
  );
}
