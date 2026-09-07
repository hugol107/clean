import "server-only";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/services/audit";
import { notifyOrgManagers } from "@/server/services/notifications";
import { saveUpload } from "@/lib/storage";
import { IssueSeverity, IssueStatus, IssueType, NotificationType, AttachmentType } from "@/generated/prisma/enums";

export interface CreateIssueParams {
  organizationId: string;
  siteId: string;
  locationId: string;
  sessionId?: string | null;
  reportedByUserId: string;
  type: IssueType;
  severity: IssueSeverity;
  description: string;
  photo?: { buffer: Buffer; fileName: string; mimeType: string } | null;
}

export async function createIssue(params: CreateIssueParams) {
  const location = await prisma.location.findFirst({ where: { id: params.locationId, organizationId: params.organizationId } });
  if (!location) throw new NotFoundError("Location not found.");

  const issue = await prisma.issue.create({
    data: {
      organizationId: params.organizationId,
      siteId: params.siteId,
      locationId: params.locationId,
      sessionId: params.sessionId ?? null,
      reportedByUserId: params.reportedByUserId,
      type: params.type,
      severity: params.severity,
      description: params.description,
      status: IssueStatus.OPEN,
    },
  });

  if (params.photo) {
    const uploaded = await saveUpload({
      buffer: params.photo.buffer,
      fileName: params.photo.fileName,
      mimeType: params.photo.mimeType,
      folder: `${params.organizationId}/issues`,
    });
    await prisma.attachment.create({
      data: {
        organizationId: params.organizationId,
        issueId: issue.id,
        type: AttachmentType.ISSUE_PHOTO,
        url: uploaded.url,
        storageKey: uploaded.storageKey,
        fileName: params.photo.fileName,
        mimeType: params.photo.mimeType,
        sizeBytes: uploaded.sizeBytes,
        uploadedByUserId: params.reportedByUserId,
      },
    });
  }

  await recordAudit({
    organizationId: params.organizationId,
    actorUserId: params.reportedByUserId,
    action: "issue.reported",
    entityType: "Issue",
    entityId: issue.id,
    metadata: { type: params.type, severity: params.severity },
  });

  // High/Critical issues need to reach a manager immediately (spec section 8).
  if (params.severity === IssueSeverity.HIGH || params.severity === IssueSeverity.CRITICAL) {
    await notifyOrgManagers({
      organizationId: params.organizationId,
      siteId: params.siteId,
      type: NotificationType.ISSUE_REPORTED,
      title: `${params.severity === "CRITICAL" ? "Critical" : "High severity"} issue at ${location.name}`,
      body: params.description,
      relatedEntityType: "Issue",
      relatedEntityId: issue.id,
    });
  }

  return issue;
}

export interface ListIssuesParams {
  organizationId: string;
  accessibleSiteIds?: string[] | null;
  siteId?: string;
  status?: IssueStatus;
  severity?: IssueSeverity;
  locationId?: string;
}

export async function listIssues(params: ListIssuesParams) {
  return prisma.issue.findMany({
    where: {
      organizationId: params.organizationId,
      ...(params.accessibleSiteIds ? { siteId: { in: params.accessibleSiteIds } } : {}),
      ...(params.siteId ? { siteId: params.siteId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.severity ? { severity: params.severity } : {}),
      ...(params.locationId ? { locationId: params.locationId } : {}),
    },
    include: {
      location: { include: { site: true } },
      reportedByUser: true,
      attachments: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function getIssue(organizationId: string, issueId: string) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, organizationId },
    include: { location: { include: { site: true } }, reportedByUser: true, resolvedByUser: true, attachments: true, session: true },
  });
  if (!issue) throw new NotFoundError("Issue not found.");
  return issue;
}

export async function updateIssueStatus(
  organizationId: string,
  actorUserId: string,
  issueId: string,
  status: IssueStatus,
  resolutionNotes?: string,
) {
  const issue = await prisma.issue.findFirst({ where: { id: issueId, organizationId } });
  if (!issue) throw new NotFoundError("Issue not found.");

  const updated = await prisma.issue.update({
    where: { id: issueId },
    data: {
      status,
      resolutionNotes: resolutionNotes ?? issue.resolutionNotes,
      resolvedAt: status === IssueStatus.RESOLVED || status === IssueStatus.DISMISSED ? new Date() : issue.resolvedAt,
      resolvedByUserId: status === IssueStatus.RESOLVED || status === IssueStatus.DISMISSED ? actorUserId : issue.resolvedByUserId,
    },
  });

  await recordAudit({
    organizationId,
    actorUserId,
    action: "issue.status_changed",
    entityType: "Issue",
    entityId: issueId,
    previousValue: { status: issue.status },
    newValue: { status },
  });

  return updated;
}

export async function countOpenIssuesBySeverity(organizationId: string, accessibleSiteIds: string[] | null) {
  const groups = await prisma.issue.groupBy({
    by: ["severity"],
    where: {
      organizationId,
      ...(accessibleSiteIds ? { siteId: { in: accessibleSiteIds } } : {}),
      status: { in: [IssueStatus.OPEN, IssueStatus.ACKNOWLEDGED, IssueStatus.IN_PROGRESS] },
    },
    _count: { _all: true },
  });
  const bySeverity: Record<IssueSeverity, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const g of groups) bySeverity[g.severity] = g._count._all;
  return bySeverity;
}
