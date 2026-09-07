import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { getAccessibleSiteIdsForCurrentMembership } from "@/server/services/access";
import { listIssues } from "@/server/services/issues";
import { listSites } from "@/server/services/sites";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { QuerySelect } from "@/components/dashboard/query-select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToneBadge } from "@/components/status-badge";
import { ISSUE_SEVERITY_LABELS, ISSUE_SEVERITY_TONE, ISSUE_STATUS_LABELS, ISSUE_STATUS_TONE, ISSUE_TYPE_LABELS } from "@/lib/constants";
import type { IssueSeverity, IssueStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; status?: string; severity?: string }>;
}) {
  const params = await searchParams;
  const ctx = await resolveActiveOrganization();
  const accessibleSiteIds = await getAccessibleSiteIdsForCurrentMembership(ctx);

  const [issues, sites] = await Promise.all([
    listIssues({
      organizationId: ctx.organizationId,
      accessibleSiteIds,
      siteId: params.site,
      status: params.status as IssueStatus | undefined,
      severity: params.severity as IssueSeverity | undefined,
    }),
    listSites(ctx.organizationId, accessibleSiteIds),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Issues" description={`${issues.length} issue${issues.length === 1 ? "" : "s"}`} />

      <div className="flex flex-wrap items-center gap-2">
        <QuerySelect paramKey="site" placeholder="All sites" className="w-40" options={sites.map((s) => ({ value: s.id, label: s.name }))} />
        <QuerySelect
          paramKey="status"
          placeholder="All statuses"
          className="w-40"
          options={Object.entries(ISSUE_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <QuerySelect
          paramKey="severity"
          placeholder="All severities"
          className="w-40"
          options={Object.entries(ISSUE_SEVERITY_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </div>

      {issues.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No issues match these filters" description="Reported issues will show up here." />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reported</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="text-muted-foreground">{formatDistanceToNow(issue.createdAt, { addSuffix: true })}</TableCell>
                    <TableCell>
                      <Link href={`/issues/${issue.id}`} className="font-medium hover:underline">
                        {issue.location.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{issue.location.site.name}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{ISSUE_TYPE_LABELS[issue.type]}</TableCell>
                    <TableCell>
                      <ToneBadge tone={ISSUE_SEVERITY_TONE[issue.severity]}>{ISSUE_SEVERITY_LABELS[issue.severity]}</ToneBadge>
                    </TableCell>
                    <TableCell>
                      <ToneBadge tone={ISSUE_STATUS_TONE[issue.status]}>{ISSUE_STATUS_LABELS[issue.status]}</ToneBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{issue.reportedByUser?.name ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
