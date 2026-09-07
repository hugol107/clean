import { NextResponse } from "next/server";
import { requireOrgAccess } from "@/lib/tenant";
import { getAccessibleSiteIdsForCurrentMembership } from "@/server/services/access";
import { prisma } from "@/lib/db";
import { resolveActiveOrganization } from "@/lib/current-org";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }

  try {
    await requireOrgAccess(organizationId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctx = await resolveActiveOrganization(organizationId);
  const accessibleSiteIds = await getAccessibleSiteIdsForCurrentMembership(ctx);

  const activeSessions = await prisma.cleaningSession.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      ...(accessibleSiteIds ? { siteId: { in: accessibleSiteIds } } : {}),
    },
    include: { employee: { include: { user: true } }, location: true },
    orderBy: { startedAt: "asc" },
  });

  return NextResponse.json({
    active: activeSessions.map((s) => ({
      sessionId: s.id,
      locationId: s.locationId,
      employeeName: s.employee.user.name,
      locationName: s.location.name,
      startedAt: s.startedAt.toISOString(),
      targetMinutes: s.location.targetDurationMinutes,
    })),
    fetchedAt: new Date().toISOString(),
  });
}
