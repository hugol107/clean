import "server-only";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/server/services/audit";
import { generateShortCode } from "@/lib/tokens";
import { OrgRole, IssueStatus } from "@/generated/prisma/enums";
import type { LocationVerification, OrgPlan } from "@/generated/prisma/enums";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+|-+$)/g, "") || "organization"
  );
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  for (let attempt = 0; attempt < 6; attempt++) {
    const collision = await prisma.organization.findUnique({ where: { slug } });
    if (!collision) return slug;
    slug = `${base}-${generateShortCode(4).toLowerCase()}`;
  }
  return `${base}-${Date.now()}`;
}

export async function createOrganizationWithOwner(params: { name: string; ownerUserId: string }) {
  const slug = await generateUniqueSlug(params.name);

  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({ data: { name: params.name, slug } });
    const membership = await tx.organizationMembership.create({
      data: { userId: params.ownerUserId, organizationId: organization.id, role: OrgRole.ORG_ADMIN },
    });
    await tx.user.update({ where: { id: params.ownerUserId }, data: { lastActiveOrganizationId: organization.id } });
    await recordAudit(
      {
        organizationId: organization.id,
        actorUserId: params.ownerUserId,
        action: "organization.created",
        entityType: "Organization",
        entityId: organization.id,
        metadata: { name: params.name },
      },
      tx,
    );
    return { organization, membership };
  });
}

export async function getOrganization(organizationId: string) {
  return prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
}

export interface UpdateOrgSettingsParams {
  organizationId: string;
  actorUserId: string;
  name?: string;
  timezone?: string;
  logoUrl?: string | null;
  locationVerification?: LocationVerification;
  allowMultipleActiveSessions?: boolean;
  dueSoonThresholdPercent?: number;
  dataRetentionDays?: number;
}

export async function updateOrganizationSettings(params: UpdateOrgSettingsParams) {
  const { organizationId, actorUserId, ...data } = params;
  const updated = await prisma.organization.update({ where: { id: organizationId }, data });
  await recordAudit({
    organizationId,
    actorUserId,
    action: "organization.settings_updated",
    entityType: "Organization",
    entityId: organizationId,
    newValue: data,
  });
  return updated;
}

export async function updateOrganizationPlan(organizationId: string, actorUserId: string, plan: OrgPlan) {
  const updated = await prisma.organization.update({ where: { id: organizationId }, data: { plan } });
  await recordAudit({
    organizationId,
    actorUserId,
    action: "organization.plan_changed",
    entityType: "Organization",
    entityId: organizationId,
    newValue: { plan },
  });
  return updated;
}

export async function setOrganizationActive(organizationId: string, actorUserId: string, isActive: boolean) {
  const updated = await prisma.organization.update({ where: { id: organizationId }, data: { isActive } });
  await recordAudit({
    organizationId,
    actorUserId,
    action: isActive ? "organization.reactivated" : "organization.suspended",
    entityType: "Organization",
    entityId: organizationId,
  });
  return updated;
}

/** Platform-wide roster for the Super Admin console. */
export async function listOrganizationsForSuperAdmin() {
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { sites: true, locations: true, employeeProfiles: true, memberships: true } },
    },
  });

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sessionCounts = await prisma.cleaningSession.groupBy({
    by: ["organizationId"],
    where: { startedAt: { gte: since30d } },
    _count: { _all: true },
  });
  const sessionsByOrg = new Map(sessionCounts.map((s) => [s.organizationId, s._count._all]));

  return organizations.map((org) => ({
    ...org,
    sessionsLast30d: sessionsByOrg.get(org.id) ?? 0,
  }));
}

export async function getPlatformOverview() {
  const [organizations, sites, locations, employees, sessionsToday, openIssues] = await Promise.all([
    prisma.organization.count(),
    prisma.site.count(),
    prisma.location.count(),
    prisma.employeeProfile.count({ where: { isActive: true } }),
    prisma.cleaningSession.count({ where: { startedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.issue.count({ where: { status: { in: [IssueStatus.OPEN, IssueStatus.ACKNOWLEDGED, IssueStatus.IN_PROGRESS] } } }),
  ]);
  return { organizations, sites, locations, employees, sessionsToday, openIssues };
}
