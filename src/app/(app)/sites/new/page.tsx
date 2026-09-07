import { resolveActiveOrganization } from "@/lib/current-org";
import { PageHeader } from "@/components/dashboard/page-header";
import { SiteForm } from "@/components/forms/site-form";

export default async function NewSitePage() {
  const ctx = await resolveActiveOrganization();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Add site" description="A hotel, building, terminal, or campus — the top level under your organization." />
      <SiteForm organizationId={ctx.organizationId} />
    </div>
  );
}
