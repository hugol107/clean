import { resolveActiveOrganization } from "@/lib/current-org";
import { PageHeader } from "@/components/dashboard/page-header";
import { ChecklistForm } from "@/components/forms/checklist-form";

export default async function NewChecklistPage() {
  const ctx = await resolveActiveOrganization();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Create checklist" description="Reusable checklist template you can attach to any location or task." />
      <ChecklistForm organizationId={ctx.organizationId} />
    </div>
  );
}
