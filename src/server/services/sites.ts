import "server-only";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/services/audit";

export interface CreateSiteParams {
  organizationId: string;
  actorUserId: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  operatingHoursStart?: string;
  operatingHoursEnd?: string;
}

export async function createSite(params: CreateSiteParams) {
  const site = await prisma.site.create({
    data: {
      organizationId: params.organizationId,
      name: params.name,
      address: params.address,
      city: params.city,
      country: params.country,
      timezone: params.timezone ?? "Europe/Madrid",
      operatingHoursStart: params.operatingHoursStart ?? "00:00",
      operatingHoursEnd: params.operatingHoursEnd ?? "23:59",
    },
  });
  await recordAudit({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    action: "site.created",
    entityType: "Site",
    entityId: site.id,
    metadata: { name: params.name },
  });
  return site;
}

export async function updateSite(
  organizationId: string,
  actorUserId: string,
  siteId: string,
  data: Partial<Pick<CreateSiteParams, "name" | "address" | "city" | "country" | "timezone" | "operatingHoursStart" | "operatingHoursEnd">>,
) {
  const site = await prisma.site.findFirst({ where: { id: siteId, organizationId } });
  if (!site) throw new NotFoundError("Site not found.");
  const updated = await prisma.site.update({ where: { id: siteId }, data });
  await recordAudit({ organizationId, actorUserId, action: "site.updated", entityType: "Site", entityId: siteId, newValue: data });
  return updated;
}

export async function setSiteActive(organizationId: string, actorUserId: string, siteId: string, isActive: boolean) {
  const site = await prisma.site.findFirst({ where: { id: siteId, organizationId } });
  if (!site) throw new NotFoundError("Site not found.");
  const updated = await prisma.site.update({ where: { id: siteId }, data: { isActive } });
  await recordAudit({
    organizationId,
    actorUserId,
    action: isActive ? "site.reactivated" : "site.archived",
    entityType: "Site",
    entityId: siteId,
  });
  return updated;
}

export async function listSites(organizationId: string, accessibleSiteIds: string[] | null) {
  return prisma.site.findMany({
    where: {
      organizationId,
      ...(accessibleSiteIds ? { id: { in: accessibleSiteIds } } : {}),
    },
    include: { _count: { select: { locations: true, employeeProfiles: true, areas: true } } },
    orderBy: { name: "asc" },
  });
}

export async function getSite(organizationId: string, siteId: string) {
  const site = await prisma.site.findFirst({
    where: { id: siteId, organizationId },
    include: { areas: { orderBy: [{ level: "asc" }, { sortOrder: "asc" }] } },
  });
  if (!site) throw new NotFoundError("Site not found.");
  return site;
}

export async function createArea(organizationId: string, actorUserId: string, siteId: string, name: string, level = 0) {
  const site = await prisma.site.findFirst({ where: { id: siteId, organizationId } });
  if (!site) throw new NotFoundError("Site not found.");
  const area = await prisma.area.create({ data: { siteId, name, level } });
  await recordAudit({ organizationId, actorUserId, action: "area.created", entityType: "Area", entityId: area.id, metadata: { siteId, name } });
  return area;
}
