import "server-only";
import { prisma } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { recordAudit } from "@/server/services/audit";
import { ChecklistItemType } from "@/generated/prisma/enums";

export interface ChecklistItemInput {
  label: string;
  itemType?: ChecklistItemType;
  isRequired?: boolean;
}

export interface CreateChecklistTemplateParams {
  organizationId: string;
  actorUserId: string;
  name: string;
  description?: string;
  items: ChecklistItemInput[];
}

export async function createChecklistTemplate(params: CreateChecklistTemplateParams) {
  if (params.items.length === 0) throw new ValidationError("Add at least one checklist item.");

  const template = await prisma.checklistTemplate.create({
    data: {
      organizationId: params.organizationId,
      name: params.name,
      description: params.description,
      items: {
        create: params.items.map((item, index) => ({
          label: item.label,
          itemType: item.itemType ?? ChecklistItemType.CHECKBOX,
          isRequired: item.isRequired ?? true,
          sortOrder: index,
        })),
      },
    },
    include: { items: true },
  });

  await recordAudit({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    action: "checklist.created",
    entityType: "ChecklistTemplate",
    entityId: template.id,
    metadata: { name: params.name, itemCount: params.items.length },
  });

  return template;
}

export async function updateChecklistTemplate(
  organizationId: string,
  actorUserId: string,
  templateId: string,
  params: { name?: string; description?: string; items?: ChecklistItemInput[] },
) {
  const template = await prisma.checklistTemplate.findFirst({ where: { id: templateId, organizationId } });
  if (!template) throw new NotFoundError("Checklist template not found.");

  return prisma.$transaction(async (tx) => {
    if (params.items) {
      await tx.checklistItem.deleteMany({ where: { checklistTemplateId: templateId } });
      await tx.checklistItem.createMany({
        data: params.items.map((item, index) => ({
          checklistTemplateId: templateId,
          label: item.label,
          itemType: item.itemType ?? ChecklistItemType.CHECKBOX,
          isRequired: item.isRequired ?? true,
          sortOrder: index,
        })),
      });
    }

    const updated = await tx.checklistTemplate.update({
      where: { id: templateId },
      data: { name: params.name, description: params.description },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    await recordAudit(
      { organizationId, actorUserId, action: "checklist.updated", entityType: "ChecklistTemplate", entityId: templateId },
      tx,
    );

    return updated;
  });
}

export async function setChecklistTemplateActive(organizationId: string, actorUserId: string, templateId: string, isActive: boolean) {
  const template = await prisma.checklistTemplate.findFirst({ where: { id: templateId, organizationId } });
  if (!template) throw new NotFoundError("Checklist template not found.");
  const updated = await prisma.checklistTemplate.update({ where: { id: templateId }, data: { isActive } });
  await recordAudit({
    organizationId,
    actorUserId,
    action: isActive ? "checklist.reactivated" : "checklist.archived",
    entityType: "ChecklistTemplate",
    entityId: templateId,
  });
  return updated;
}

export async function listChecklistTemplates(organizationId: string) {
  return prisma.checklistTemplate.findMany({
    where: { organizationId },
    include: { items: { orderBy: { sortOrder: "asc" } }, _count: { select: { locations: true, tasks: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getChecklistTemplate(organizationId: string, templateId: string) {
  const template = await prisma.checklistTemplate.findFirst({
    where: { id: templateId, organizationId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) throw new NotFoundError("Checklist template not found.");
  return template;
}
