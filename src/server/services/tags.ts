import "server-only";
import { prisma } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { recordAudit } from "@/server/services/audit";
import { generateSecureToken } from "@/lib/tokens";
import { NfcTagStatus } from "@/generated/prisma/enums";

export async function createTag(organizationId: string, actorUserId: string, label?: string) {
  const token = generateSecureToken();
  const tag = await prisma.nFCTag.create({
    data: { organizationId, token, label, status: NfcTagStatus.UNASSIGNED },
  });
  await recordAudit({ organizationId, actorUserId, action: "tag.created", entityType: "NFCTag", entityId: tag.id });
  return tag;
}

export async function assignTagToLocation(organizationId: string, actorUserId: string, tagId: string, locationId: string) {
  const [tag, location] = await Promise.all([
    prisma.nFCTag.findFirst({ where: { id: tagId, organizationId } }),
    prisma.location.findFirst({ where: { id: locationId, organizationId } }),
  ]);
  if (!tag) throw new NotFoundError("Tag not found.");
  if (!location) throw new NotFoundError("Location not found.");
  if (tag.status === NfcTagStatus.DISABLED) throw new ValidationError("This tag is disabled. Replace it instead.");

  return prisma.$transaction(async (tx) => {
    // A location should only have one ACTIVE tag at a time — quietly detach
    // any other active tag at this location so scanning old spare tags
    // doesn't create ambiguity about which one is "the" tag here.
    await tx.nFCTag.updateMany({
      where: { locationId, status: NfcTagStatus.ACTIVE, id: { not: tagId } },
      data: { locationId: null, status: NfcTagStatus.UNASSIGNED },
    });

    const updated = await tx.nFCTag.update({
      where: { id: tagId },
      data: { locationId, status: NfcTagStatus.ACTIVE },
    });

    await recordAudit(
      {
        organizationId,
        actorUserId,
        action: "tag.assigned",
        entityType: "NFCTag",
        entityId: tagId,
        metadata: { locationId },
      },
      tx,
    );

    return updated;
  });
}

export async function unassignTag(organizationId: string, actorUserId: string, tagId: string) {
  const tag = await prisma.nFCTag.findFirst({ where: { id: tagId, organizationId } });
  if (!tag) throw new NotFoundError("Tag not found.");
  const updated = await prisma.nFCTag.update({ where: { id: tagId }, data: { locationId: null, status: NfcTagStatus.UNASSIGNED } });
  await recordAudit({ organizationId, actorUserId, action: "tag.unassigned", entityType: "NFCTag", entityId: tagId });
  return updated;
}

/** A lost/compromised tag: disable it immediately so the URL stops working. */
export async function disableTag(organizationId: string, actorUserId: string, tagId: string, reason?: string) {
  const tag = await prisma.nFCTag.findFirst({ where: { id: tagId, organizationId } });
  if (!tag) throw new NotFoundError("Tag not found.");
  const updated = await prisma.nFCTag.update({ where: { id: tagId }, data: { status: NfcTagStatus.DISABLED } });
  await recordAudit({ organizationId, actorUserId, action: "tag.disabled", entityType: "NFCTag", entityId: tagId, reason });
  return updated;
}

/** Issues a fresh token for the same location and marks the old physical tag as replaced. */
export async function replaceTag(organizationId: string, actorUserId: string, oldTagId: string) {
  const oldTag = await prisma.nFCTag.findFirst({ where: { id: oldTagId, organizationId } });
  if (!oldTag) throw new NotFoundError("Tag not found.");
  if (!oldTag.locationId) throw new ValidationError("Only an assigned tag can be replaced.");

  return prisma.$transaction(async (tx) => {
    const newTag = await tx.nFCTag.create({
      data: {
        organizationId,
        token: generateSecureToken(),
        status: NfcTagStatus.ACTIVE,
        locationId: oldTag.locationId,
        label: oldTag.label,
      },
    });
    await tx.nFCTag.update({
      where: { id: oldTagId },
      data: { status: NfcTagStatus.REPLACED, locationId: null, replacedByTagId: newTag.id },
    });
    await recordAudit(
      { organizationId, actorUserId, action: "tag.replaced", entityType: "NFCTag", entityId: oldTagId, metadata: { newTagId: newTag.id } },
      tx,
    );
    return newTag;
  });
}

export interface ListTagsParams {
  organizationId: string;
  accessibleSiteIds?: string[] | null;
  status?: NfcTagStatus;
  search?: string;
}

export async function listTags(params: ListTagsParams) {
  const tags = await prisma.nFCTag.findMany({
    where: {
      organizationId: params.organizationId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.accessibleSiteIds ? { location: { siteId: { in: params.accessibleSiteIds } } } : {}),
      ...(params.search
        ? {
            OR: [
              { label: { contains: params.search, mode: "insensitive" } },
              { location: { name: { contains: params.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { location: { include: { site: true } } },
    orderBy: { createdAt: "desc" },
  });

  return tags;
}
