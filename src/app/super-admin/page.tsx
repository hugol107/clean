import { requireSuperAdmin } from "@/lib/tenant";
import { listOrganizationsForSuperAdmin, getPlatformOverview } from "@/server/services/organizations";
import { PageHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Users, AlertTriangle, Activity } from "lucide-react";
import { ORG_PLAN_LABELS } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  await requireSuperAdmin();
  const [organizations, overview] = await Promise.all([listOrganizationsForSuperAdmin(), getPlatformOverview()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Platform overview" description="Every organization on CleanTap." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Organizations" value={overview.organizations} icon={Building2} />
        <KpiCard label="Sites" value={overview.sites} icon={Building2} />
        <KpiCard label="Locations" value={overview.locations} icon={MapPin} />
        <KpiCard label="Active employees" value={overview.employees} icon={Users} />
        <KpiCard label="Cleanings today" value={overview.sessionsToday} icon={Activity} />
        <KpiCard label="Open issues" value={overview.openIssues} icon={AlertTriangle} tone={overview.openIssues > 0 ? "warning" : "default"} />
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Sites</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Sessions (30d)</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ORG_PLAN_LABELS[org.plan]}</Badge>
                  </TableCell>
                  <TableCell>{org._count.sites}</TableCell>
                  <TableCell>{org._count.locations}</TableCell>
                  <TableCell>{org._count.employeeProfiles}</TableCell>
                  <TableCell>{org.sessionsLast30d}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDistanceToNow(org.createdAt, { addSuffix: true })}</TableCell>
                  <TableCell>
                    <Badge variant={org.isActive ? "success" : "danger"}>{org.isActive ? "Active" : "Suspended"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
