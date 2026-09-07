import "server-only";
import { prisma } from "@/lib/db";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { recordAudit } from "@/server/services/audit";
import { computeLocationStatus, type LocationOperationalStatus } from "@/lib/sla";
import { IssueSeverity, IssueStatus, LocationType, SessionStatus } from "@/generated/prisma/enums";

export interface CreateLocationParams {
  organizationId: string;
  actorUserId: string;
  siteId: string;
  areaId?: string | null;
  name: string;
  code: string;
  type: LocationType;
  targetDurationMinutes: number;
  targetFrequencyMinutes: number;
  checklistTemplateId?: string | null;
  operatingHoursStart?: string | null;
  operatingHoursEnd?: string | null;
  notes?: string | null;
}

export async function createLocation(params: CreateLocationParams) {
  const existing = await prisma.location.findUnique({ where: { siteId_code: { siteId: params.siteId, code: params.code } } });
  if (existing) throw new ConflictError(`A location with code "${params.code}" already exists at this site.`);

  const location = await prisma.location.create({
    data: {
      organizationId: params.organizationId,
      siteId: params.siteId,
      areaId: params.areaId ?? null,
      name: params.name,
      code: params.code,
      type: params.type,
      targetDurationMinutes: params.targetDurationMinutes,
      targetFrequencyMinutes: params.targetFrequencyMinutes,
      checklistTemplateId: params.checklistTemplateId ?? null,
      operatingHoursStart: params.operatingHoursStart ?? null,
      operatingHoursEnd: params.operatingHoursEnd ?? null,
      notes: params.notes ?? null,
    },
  });

  await recordAudit({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    action: "location.created",
    entityType: "Location",
    entityId: location.id,
    metadata: { name: params.name, code: params.code },
  });

  return location;
}

export interface BulkCreateLocationsParams {
  organizationId: string;
  actorUserId: string;
  siteId: string;
  areaId?: string | null;
  prefix: string;
  from: number;
  to: number;
  type: LocationType;
  targetDurationMinutes: number;
  targetFrequencyMinutes: number;
  checklistTemplateId?: string | null;
  /** Zero-pad numbers to this width, e.g. 3 -> "Room 007". 0 disables padding. */
  padWidth?: number;
}

const BULK_CREATE_MAX = 500;

/** "Room 101..140" style bulk generation (spec section 31) — avoids forcing a manager to create hundreds of rooms one by one. */
export async function bulkCreateLocations(params: BulkCreateLocationsParams) {
  if (params.to < params.from) throw new ValidationError("The range end must be greater than or equal to the start.");
  const count = params.to - params.from + 1;
  if (count > BULK_CREATE_MAX) throw new ValidationError(`Can't create more than ${BULK_CREATE_MAX} locations at once.`);

  const numbers = Array.from({ length: count }, (_, i) => params.from + i);
  const codes = numbers.map((n) => (params.padWidth ? String(n).padStart(params.padWidth, "0") : String(n)));

  const existing = await prisma.location.findMany({
    where: { siteId: params.siteId, code: { in: codes } },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((l) => l.code));
  const toCreate = codes.filter((c) => !existingCodes.has(c));

  if (toCreate.length === 0) {
    throw new ConflictError("All locations in this range already exist.");
  }

  const created = await prisma.$transaction(
    toCreate.map((code) =>
      prisma.location.create({
        data: {
          organizationId: params.organizationId,
          siteId: params.siteId,
          areaId: params.areaId ?? null,
          name: `${params.prefix} ${code}`,
          code,
          type: params.type,
          targetDurationMinutes: params.targetDurationMinutes,
          targetFrequencyMinutes: params.targetFrequencyMinutes,
          checklistTemplateId: params.checklistTemplateId ?? null,
        },
      }),
    ),
  );

  await recordAudit({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    action: "location.bulk_created",
    entityType: "Location",
    entityId: params.siteId,
    metadata: { count: created.length, skipped: codes.length - toCreate.length, prefix: params.prefix },
  });

  return { created: created.length, skipped: codes.length - toCreate.length };
}

export async function updateLocation(
  organizationId: string,
  actorUserId: string,
  locationId: string,
  data: Partial<Omit<CreateLocationParams, "organizationId" | "actorUserId" | "siteId" | "code">>,
) {
  const location = await prisma.location.findFirst({ where: { id: locationId, organizationId } });
  if (!location) throw new NotFoundError("Location not found.");
  const updated = await prisma.location.update({ where: { id: locationId }, data });
  await recordAudit({ organizationId, actorUserId, action: "location.updated", entityType: "Location", entityId: locationId, newValue: data });
  return updated;
}

export async function setLocationActive(organizationId: string, actorUserId: string, locationId: string, isActive: boolean) {
  const location = await prisma.location.findFirst({ where: { id: locationId, organizationId } });
  if (!location) throw new NotFoundError("Location not found.");
  const updated = await prisma.location.update({ where: { id: locationId }, data: { isActive } });
  await recordAudit({
    organizationId,
    actorUserId,
    action: isActive ? "location.reactivated" : "location.archived",
    entityType: "Location",
    entityId: locationId,
  });
  return updated;
}

export interface LocationWithStatus {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  siteId: string;
  siteName: string;
  areaId: string | null;
  areaName: string | null;
  isActive: boolean;
  targetDurationMinutes: number;
  targetFrequencyMinutes: number;
  checklistTemplateId: string | null;
  status: LocationOperationalStatus;
  minutesSinceLastClean: number | null;
  overdueByMinutes: number | null;
  lastCleanedAt: Date | null;
}

export interface ListLocationsParams {
  organizationId: string;
  accessibleSiteIds?: string[] | null;
  siteId?: string;
  areaId?: string;
  type?: LocationType;
  search?: string;
}

/** The core "what does this location look like right now" query, used by the Locations table, the building map, and Live Operations. */
export async function listLocationsWithStatus(params: ListLocationsParams): Promise<LocationWithStatus[]> {
  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: params.organizationId } });

  const locations = await prisma.location.findMany({
    where: {
      organizationId: params.organizationId,
      ...(params.accessibleSiteIds ? { siteId: { in: params.accessibleSiteIds } } : {}),
      ...(params.siteId ? { siteId: params.siteId } : {}),
      ...(params.areaId ? { areaId: params.areaId } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.search
        ? { OR: [{ name: { contains: params.search, mode: "insensitive" } }, { code: { contains: params.search, mode: "insensitive" } }] }
        : {}),
    },
    include: { site: { select: { name: true } }, area: { select: { name: true } } },
    orderBy: [{ site: { name: "asc" } }, { name: "asc" }],
  });
  if (locations.length === 0) return [];

  const locationIds = locations.map((l) => l.id);

  const [activeLocks, lastCompletedSessions, highSeverityIssues] = await Promise.all([
    prisma.activeLocationLock.findMany({ where: { locationId: { in: locationIds } } }),
    prisma.cleaningSession.findMany({
      where: { locationId: { in: locationIds }, status: SessionStatus.COMPLETED },
      orderBy: [{ locationId: "asc" }, { completedAt: "desc" }],
      distinct: ["locationId"],
      select: { locationId: true, completedAt: true },
    }),
    prisma.issue.findMany({
      where: {
        locationId: { in: locationIds },
        severity: { in: [IssueSeverity.HIGH, IssueSeverity.CRITICAL] },
        status: { in: [IssueStatus.OPEN, IssueStatus.ACKNOWLEDGED, IssueStatus.IN_PROGRESS] },
      },
      select: { locationId: true },
    }),
  ]);

  const activeLocationIds = new Set(activeLocks.map((l) => l.locationId));
  const lastCleanedByLocation = new Map(lastCompletedSessions.map((s) => [s.locationId, s.completedAt]));
  const issueLocationIds = new Set(highSeverityIssues.map((i) => i.locationId));

  return locations.map((location) => {
    const lastCompletedAt = lastCleanedByLocation.get(location.id) ?? null;
    const result = computeLocationStatus({
      isActive: location.isActive,
      hasActiveSession: activeLocationIds.has(location.id),
      hasOpenHighSeverityIssue: issueLocationIds.has(location.id),
      lastCompletedAt,
      targetFrequencyMinutes: location.targetFrequencyMinutes,
      dueSoonThresholdPercent: organization.dueSoonThresholdPercent,
    });

    return {
      id: location.id,
      name: location.name,
      code: location.code,
      type: location.type,
      siteId: location.siteId,
      siteName: location.site.name,
      areaId: location.areaId,
      areaName: location.area?.name ?? null,
      isActive: location.isActive,
      targetDurationMinutes: location.targetDurationMinutes,
      targetFrequencyMinutes: location.targetFrequencyMinutes,
      checklistTemplateId: location.checklistTemplateId,
      status: result.status,
      minutesSinceLastClean: result.minutesSinceLastClean,
      overdueByMinutes: result.overdueByMinutes,
      lastCleanedAt: lastCompletedAt,
    };
  });
}

export async function getLocationDetail(organizationId: string, locationId: string) {
  const location = await prisma.location.findFirst({
    where: { id: locationId, organizationId },
    include: { site: true, area: true, checklistTemplate: { include: { items: true } }, nfcTags: { orderBy: { createdAt: "desc" } } },
  });
  if (!location) throw new NotFoundError("Location not found.");
  return location;
}

export async function getLocationTimeline(organizationId: string, locationId: string, take = 30) {
  return prisma.cleaningSession.findMany({
    where: { locationId, organizationId },
    include: { employee: { include: { user: true } }, issues: true },
    orderBy: { startedAt: "desc" },
    take,
  });
}
