import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, listUserOrganizations, type SessionUser } from "@/lib/tenant";
import type { OrgRole } from "@/generated/prisma/enums";

export interface ActiveOrgContext {
  user: SessionUser;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  /** Null only for a super admin acting without a membership of their own. */
  role: OrgRole | null;
  organizations: { organizationId: string; name: string; slug: string; role: OrgRole; logoUrl: string | null }[];
}

/**
 * Resolves which organization the dashboard shell should render for the
 * current request: an explicit `preferredOrgId` (e.g. from a route param),
 * else the user's last-used organization, else their first membership.
 * Redirects super admins with zero memberships to the platform console, and
 * everyone else with zero memberships into onboarding.
 */
export async function resolveActiveOrganization(preferredOrgId?: string): Promise<ActiveOrgContext> {
  const user = await requireUser();
  const organizations = await listUserOrganizations(user.id);

  if (organizations.length === 0) {
    if (user.isSuperAdmin) redirect("/super-admin");
    redirect("/onboarding");
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { lastActiveOrganizationId: true } });
  const candidateId = preferredOrgId ?? dbUser?.lastActiveOrganizationId ?? organizations[0].organizationId;
  const active = organizations.find((o) => o.organizationId === candidateId) ?? organizations[0];

  return {
    user,
    organizationId: active.organizationId,
    organizationName: active.name,
    organizationSlug: active.slug,
    role: active.role,
    organizations,
  };
}
