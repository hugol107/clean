import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { assertSiteAccess, requireOrgAccess } from "@/lib/tenant";
import { getIssue } from "@/server/services/issues";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToneBadge } from "@/components/status-badge";
import { IssueStatusActions } from "@/components/forms/issue-status-actions";
import { ISSUE_SEVERITY_LABELS, ISSUE_SEVERITY_TONE, ISSUE_STATUS_LABELS, ISSUE_STATUS_TONE, ISSUE_TYPE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await resolveActiveOrganization();
  const accessCtx = await requireOrgAccess(ctx.organizationId);

  const issue = await getIssue(ctx.organizationId, id).catch(() => null);
  if (!issue) notFound();
  assertSiteAccess(accessCtx, issue.siteId);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" className="w-fit -ml-2" asChild>
        <Link href="/issues">
          <ArrowLeft /> Back to issues
        </Link>
      </Button>

      <PageHeader
        title={`${ISSUE_TYPE_LABELS[issue.type]} — ${issue.location.name}`}
        description={`${issue.location.site.name} · Reported ${format(issue.createdAt, "MMM d, HH:mm")} by ${issue.reportedByUser?.name ?? "Unknown"}`}
        actions={
          <>
            <ToneBadge tone={ISSUE_SEVERITY_TONE[issue.severity]}>{ISSUE_SEVERITY_LABELS[issue.severity]}</ToneBadge>
            <ToneBadge tone={ISSUE_STATUS_TONE[issue.status]}>{ISSUE_STATUS_LABELS[issue.status]}</ToneBadge>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm">{issue.description}</p>
            {issue.attachments.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {issue.attachments.map((a) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={a.id} src={a.url} alt="Issue attachment" className="h-32 w-32 rounded-lg border object-cover" />
                ))}
              </div>
            )}
            {issue.resolutionNotes && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <span className="font-medium">Resolution notes: </span>
                {issue.resolutionNotes}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Update status</CardTitle>
          </CardHeader>
          <CardContent>
            <IssueStatusActions organizationId={ctx.organizationId} issueId={issue.id} status={issue.status} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
