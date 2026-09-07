"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant";
import { runAction, type ActionResult } from "@/server/actions/action-helpers";
import * as checklistsService from "@/server/services/checklists";
import { ChecklistItemType } from "@/generated/prisma/enums";

const itemSchema = z.object({
  label: z.string().trim().min(1).max(200),
  itemType: z.enum(ChecklistItemType).optional(),
  isRequired: z.boolean().optional(),
});

const createSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).optional(),
  items: z.array(itemSchema).min(1),
});

export async function createChecklistTemplateAction(input: z.infer<typeof createSchema>): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = createSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "checklist:manage");
    const template = await checklistsService.createChecklistTemplate({ ...parsed, actorUserId: ctx.user.id });
    revalidatePath("/checklists");
    revalidatePath("/onboarding");
    return { id: template.id };
  });
}

const updateSchema = z.object({
  organizationId: z.string().min(1),
  templateId: z.string().min(1),
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(500).optional(),
  items: z.array(itemSchema).optional(),
});

export async function updateChecklistTemplateAction(input: z.infer<typeof updateSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const { organizationId, templateId, ...rest } = updateSchema.parse(input);
    const ctx = await requirePermission(organizationId, "checklist:manage");
    await checklistsService.updateChecklistTemplate(organizationId, ctx.user.id, templateId, rest);
    revalidatePath("/checklists");
    revalidatePath(`/checklists/${templateId}`);
  });
}

const toggleSchema = z.object({ organizationId: z.string().min(1), templateId: z.string().min(1), isActive: z.boolean() });

export async function setChecklistTemplateActiveAction(input: z.infer<typeof toggleSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = toggleSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "checklist:manage");
    await checklistsService.setChecklistTemplateActive(parsed.organizationId, ctx.user.id, parsed.templateId, parsed.isActive);
    revalidatePath("/checklists");
  });
}
