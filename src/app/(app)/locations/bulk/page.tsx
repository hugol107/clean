import { resolveActiveOrganization } from "@/lib/current-org";
import { getAccessibleSiteIdsForCurrentMembership } from "@/server/services/access";
import { listSites } from "@/server/services/sites";
import { listChecklistTemplates } from "@/server/services/checklists";
import { PageHeader } from "@/components/dashboard/page-header";
import { BulkLocationForm } from "@/components/forms/bulk-location-form";

export default async function BulkLocationsPage() {
  const ctx = await resolveActiveOrganization();
  const accessibleSiteIds = await getAccessibleSiteIdsForCurrentMembership(ctx);
  const [sites, checklists] = await Promise.all([
    listSites(ctx.organizationId, accessibleSiteIds),
    listChecklistTemplates(ctx.organizationId),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Bulk create locations"
        description="Generate a range of similar locations at once — perfect for hotel floors with dozens of rooms."
      />
      <BulkLocationForm
        organizationId={ctx.organizationId}
        sites={sites.map((s) => ({ id: s.id, name: s.name }))}
        checklistTemplates={checklists.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
