import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AuthorizationError } from "@/lib/errors";
import { OrgRole, MembershipStatus } from "@/generated/prisma/enums";
import type { Permission } from "@/lib/rbac";
import { can } from "@/lib/rbac";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  isSuperAdmin: boolean;
};

/** Returns the signed-in user, or null. Never redirects. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    image: session.user.image ?? null,
    isSuperAdmin: session.user.isSuperAdmin,
  };
}

/** Returns the signed-in user or redirects to /login. Use in server components/pages. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isSuperAdmin) throw new AuthorizationError("Super admin access required.");
  return user;
}

export type MembershipContext = {
  user: SessionUser;
  /** Null only when a super admin is acting without a membership row of their own. */
  membership: { id: string; role: OrgRole; organizationId: string } | null;
  /** Null means "every site in the organization" (org admins, super admins). */
  accessibleSiteIds: string[] | null;
};

/**
 * The core multi-tenant guard. Every server action / service function that
 * touches organization-scoped data calls this first — it is the boundary
 * that makes tenant isolation a server-side guarantee rather than a
 * frontend convention (see spec section 23: "No confiar nunca únicamente en
 * permisos del frontend").
 */
export async function requireOrgAccess(organizationId: string): Promise<MembershipContext> {
  const user = await requireUser();

  if (user.isSuperAdmin) {
    return { user, membership: null, accessibleSiteIds: null };
  }

  const membership = await prisma.organizationMembership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId } },
    include: { siteAssignments: { select: { siteId: true } } },
  });

  if (!membership || membership.status !== MembershipStatus.ACTIVE) {
    throw new AuthorizationError("You don't have access to this organization.");
  }

  const accessibleSiteIds =
    membership.role === OrgRole.ORG_ADMIN ? null : membership.siteAssignments.map((a) => a.siteId);

  return {
    user,
    membership: { id: membership.id, role: membership.role, organizationId },
    accessibleSiteIds,
  };
}

/** Like requireOrgAccess, but also enforces the caller's role is permitted to do `permission`. */
export async function requirePermission(organizationId: string, permission: Permission): Promise<MembershipContext> {
  const ctx = await requireOrgAccess(organizationId);
  const role = ctx.membership?.role ?? null;
  if (!can(role, permission, ctx.user.isSuperAdmin)) {
    throw new AuthorizationError("Your role doesn't allow this action.");
  }
  return ctx;
}

/** Throws if the given site isn't within the caller's scoped sites. */
export function assertSiteAccess(ctx: MembershipContext, siteId: string) {
  if (ctx.accessibleSiteIds && !ctx.accessibleSiteIds.includes(siteId)) {
    throw new AuthorizationError("You don't have access to this site.");
  }
}

/** All organizations (id, name, slug, role) the current user can act within. */
export async function listUserOrganizations(userId: string) {
  const memberships = await prisma.organizationMembership.findMany({
    where: { userId, status: MembershipStatus.ACTIVE },
    include: { organization: { select: { id: true, name: true, slug: true, logoUrl: true, isActive: true } } },
    orderBy: { createdAt: "asc" },
  });
  return memberships
    .filter((m) => m.organization.isActive)
    .map((m) => ({
      organizationId: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      logoUrl: m.organization.logoUrl,
      role: m.role,
    }));
}

/** The employee profile for the current user within an organization, if any. */
export async function getEmployeeProfile(userId: string, organizationId: string) {
  return prisma.employeeProfile.findFirst({
    where: { userId, organizationId },
  });
}
