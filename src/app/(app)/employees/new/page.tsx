import { resolveActiveOrganization } from "@/lib/current-org";
import { getAccessibleSiteIdsForCurrentMembership } from "@/server/services/access";
import { listSites } from "@/server/services/sites";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmployeeForm } from "@/components/forms/employee-form";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function NewEmployeePage() {
  const ctx = await resolveActiveOrganization();
  const accessibleSiteIds = await getAccessibleSiteIdsForCurrentMembership(ctx);
  const sites = await listSites(ctx.organizationId, accessibleSiteIds);

  if (sites.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Add worker" />
        <EmptyState
          icon={Building2}
          title="Create a site first"
          description="Workers are assigned to a site. Add one before creating worker accounts."
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
      <PageHeader title="Add worker" description="Creates a login for the worker and assigns them to a site." />
      <EmployeeForm organizationId={ctx.organizationId} sites={sites.map((s) => ({ id: s.id, name: s.name }))} />
    </div>
  );
}
