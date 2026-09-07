import { resolveActiveOrganization } from "@/lib/current-org";
import { getAccessibleSiteIdsForCurrentMembership } from "@/server/services/access";
import { listSites } from "@/server/services/sites";
import { listEmployees } from "@/server/services/employees";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { TaskForm } from "@/components/forms/task-form";

export default async function NewTaskPage() {
  const ctx = await resolveActiveOrganization();
  const accessibleSiteIds = await getAccessibleSiteIdsForCurrentMembership(ctx);
  const [sites, employees, locations] = await Promise.all([
    listSites(ctx.organizationId, accessibleSiteIds),
    listEmployees({ organizationId: ctx.organizationId, siteIds: accessibleSiteIds ?? undefined }),
    prisma.location.findMany({
      where: { organizationId: ctx.organizationId, isActive: true, ...(accessibleSiteIds ? { siteId: { in: accessibleSiteIds } } : {}) },
      select: { id: true, name: true, siteId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="New task" description="One-time or assigned cleaning task." />
      <TaskForm
        organizationId={ctx.organizationId}
        sites={sites.map((s) => ({ id: s.id, name: s.name }))}
        locations={locations}
        employees={employees.map((e) => ({ id: e.id, name: e.user.name }))}
      />
    </div>
  );
}
