import "server-only";
import { prisma } from "@/lib/db";
import { OrgRole } from "@/generated/prisma/enums";
import type { ActiveOrgContext } from "@/lib/current-org";

/**
 * Resolves the site scope for the current dashboard context: `null` means
 * "every site" (org admins, super admins); an array means the caller is
 * restricted to those sites (site managers / supervisors).
 */
export async function getAccessibleSiteIdsForCurrentMembership(ctx: ActiveOrgContext): Promise<string[] | null> {
  if (ctx.user.isSuperAdmin || ctx.role === OrgRole.ORG_ADMIN || !ctx.role) return null;

  const membership = await prisma.organizationMembership.findUnique({
    where: { userId_organizationId: { userId: ctx.user.id, organizationId: ctx.organizationId } },
    include: { siteAssignments: true },
  });
  return membership?.siteAssignments.map((a) => a.siteId) ?? [];
}
