import Link from "next/link";
import { FileDown } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { requirePermission } from "@/lib/tenant";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { REPORT_LABELS } from "@/server/services/reports";

export const dynamic = "force-dynamic";

const REPORT_DESCRIPTIONS: Record<string, string> = {
  "daily-cleaning": "Every completed cleaning session with duration, method, and target time.",
  "employee-activity": "Cleanings, hours, and average duration per employee.",
  "location-performance": "Cleanings, average duration, and variance vs target per location.",
  "sla-compliance": "SLA compliance and issue counts per site.",
  issues: "Every reported issue with type, severity, and status.",
  "cleaning-hours": "Total cleaning hours per site, per day.",
};

export default async function ReportsPage() {
  const ctx = await resolveActiveOrganization();
  await requirePermission(ctx.organizationId, "reports:export");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Reports" description="Export operational data as CSV for the last 30 days. PDF export is planned for a future release." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(REPORT_LABELS).map(([type, label]) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="text-base">{label}</CardTitle>
              <CardDescription>{REPORT_DESCRIPTIONS[type]}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/api/reports/${type}?organizationId=${ctx.organizationId}`}>
                  <FileDown /> Download CSV
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
