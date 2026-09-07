import { requirePermission } from "@/lib/tenant";
import { resolveActiveOrganization } from "@/lib/current-org";
import { getOrganization } from "@/server/services/organizations";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsForm } from "@/components/forms/settings-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ORG_PLAN_LABELS, ORG_PLAN_LIMITS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await resolveActiveOrganization();
  await requirePermission(ctx.organizationId, "settings:manage");
  const organization = await getOrganization(ctx.organizationId);
  const limits = ORG_PLAN_LIMITS[organization.plan];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Settings" description="Organization configuration, cleaning rules, and privacy." />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="pt-4">
          <SettingsForm organization={organization} />
        </TabsContent>

        <TabsContent value="notifications" className="pt-4">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>In-app notifications are on for everyone by default.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Push, email, WhatsApp, SMS and Slack notification channels are planned for a future release — the notification model
              already supports them (see <code>Notification.type</code>), only the delivery channels remain to be wired up.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="pt-4">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connect CleanTap to the rest of your stack.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              API access, Slack, and property-management-system integrations are planned for Phase 3.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="pt-4">
          <Card className="max-w-2xl">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Current plan</CardTitle>
                <CardDescription>Billing isn&apos;t enabled yet — every organization runs unmetered during the beta.</CardDescription>
              </div>
              <Badge>{ORG_PLAN_LABELS[organization.plan]}</Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Sites</span>
                <span className="font-medium">{Number.isFinite(limits.sites) ? limits.sites : "Unlimited"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Locations</span>
                <span className="font-medium">{Number.isFinite(limits.locations) ? limits.locations : "Unlimited"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Employees</span>
                <span className="font-medium">{Number.isFinite(limits.employees) ? limits.employees : "Unlimited"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Sessions / mo</span>
                <span className="font-medium">{Number.isFinite(limits.monthlySessions) ? limits.monthlySessions : "Unlimited"}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
