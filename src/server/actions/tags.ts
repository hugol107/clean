"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant";
import { runAction, type ActionResult } from "@/server/actions/action-helpers";
import * as tagsService from "@/server/services/tags";

const createTagSchema = z.object({ organizationId: z.string().min(1), label: z.string().trim().max(120).optional() });

export async function createTagAction(input: z.infer<typeof createTagSchema>): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = createTagSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "nfctag:manage");
    const tag = await tagsService.createTag(parsed.organizationId, ctx.user.id, parsed.label);
    revalidatePath("/nfc-tags");
    return { id: tag.id };
  });
}

const assignTagSchema = z.object({ organizationId: z.string().min(1), tagId: z.string().min(1), locationId: z.string().min(1) });

export async function assignTagAction(input: z.infer<typeof assignTagSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = assignTagSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "nfctag:manage");
    await tagsService.assignTagToLocation(parsed.organizationId, ctx.user.id, parsed.tagId, parsed.locationId);
    revalidatePath("/nfc-tags");
    revalidatePath("/locations");
  });
}

const tagIdSchema = z.object({ organizationId: z.string().min(1), tagId: z.string().min(1) });

export async function unassignTagAction(input: z.infer<typeof tagIdSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = tagIdSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "nfctag:manage");
    await tagsService.unassignTag(parsed.organizationId, ctx.user.id, parsed.tagId);
    revalidatePath("/nfc-tags");
  });
}

const disableTagSchema = tagIdSchema.extend({ reason: z.string().trim().max(500).optional() });

export async function disableTagAction(input: z.infer<typeof disableTagSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = disableTagSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "nfctag:manage");
    await tagsService.disableTag(parsed.organizationId, ctx.user.id, parsed.tagId, parsed.reason);
    revalidatePath("/nfc-tags");
  });
}

export async function replaceTagAction(input: z.infer<typeof tagIdSchema>): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = tagIdSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "nfctag:manage");
    const tag = await tagsService.replaceTag(parsed.organizationId, ctx.user.id, parsed.tagId);
    revalidatePath("/nfc-tags");
    return { id: tag.id };
  });
}
