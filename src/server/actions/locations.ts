"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission, assertSiteAccess } from "@/lib/tenant";
import { runAction, type ActionResult } from "@/server/actions/action-helpers";
import * as locationsService from "@/server/services/locations";
import { LocationType } from "@/generated/prisma/enums";

const createLocationSchema = z.object({
  organizationId: z.string().min(1),
  siteId: z.string().min(1),
  areaId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(160),
  code: z.string().trim().min(1).max(60),
  type: z.enum(LocationType),
  targetDurationMinutes: z.number().int().min(1).max(480),
  targetFrequencyMinutes: z.number().int().min(1).max(10080),
  checklistTemplateId: z.string().min(1).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function createLocationAction(input: z.infer<typeof createLocationSchema>): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = createLocationSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "location:manage");
    assertSiteAccess(ctx, parsed.siteId);
    const location = await locationsService.createLocation({ ...parsed, actorUserId: ctx.user.id });
    revalidatePath("/locations");
    revalidatePath("/onboarding");
    return { id: location.id };
  });
}

const bulkCreateSchema = z.object({
  organizationId: z.string().min(1),
  siteId: z.string().min(1),
  areaId: z.string().min(1).optional(),
  prefix: z.string().trim().min(1).max(60),
  from: z.number().int().min(0),
  to: z.number().int().min(0),
  type: z.enum(LocationType),
  targetDurationMinutes: z.number().int().min(1).max(480),
  targetFrequencyMinutes: z.number().int().min(1).max(10080),
  checklistTemplateId: z.string().min(1).optional(),
  padWidth: z.number().int().min(0).max(6).optional(),
});

export async function bulkCreateLocationsAction(
  input: z.infer<typeof bulkCreateSchema>,
): Promise<ActionResult<{ created: number; skipped: number }>> {
  return runAction(async () => {
    const parsed = bulkCreateSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "location:manage");
    assertSiteAccess(ctx, parsed.siteId);
    const result = await locationsService.bulkCreateLocations({ ...parsed, actorUserId: ctx.user.id });
    revalidatePath("/locations");
    revalidatePath("/onboarding");
    return result;
  });
}

const updateLocationSchema = z.object({
  organizationId: z.string().min(1),
  locationId: z.string().min(1),
  name: z.string().trim().min(1).max(160).optional(),
  areaId: z.string().min(1).nullable().optional(),
  type: z.enum(LocationType).optional(),
  targetDurationMinutes: z.number().int().min(1).max(480).optional(),
  targetFrequencyMinutes: z.number().int().min(1).max(10080).optional(),
  checklistTemplateId: z.string().min(1).nullable().optional(),
  operatingHoursStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  operatingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export async function updateLocationAction(input: z.infer<typeof updateLocationSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const { organizationId, locationId, ...rest } = updateLocationSchema.parse(input);
    const ctx = await requirePermission(organizationId, "location:manage");
    await locationsService.updateLocation(organizationId, ctx.user.id, locationId, rest);
    revalidatePath("/locations");
    revalidatePath(`/locations/${locationId}`);
  });
}

const toggleLocationSchema = z.object({ organizationId: z.string().min(1), locationId: z.string().min(1), isActive: z.boolean() });

export async function setLocationActiveAction(input: z.infer<typeof toggleLocationSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = toggleLocationSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "location:manage");
    await locationsService.setLocationActive(parsed.organizationId, ctx.user.id, parsed.locationId, parsed.isActive);
    revalidatePath("/locations");
  });
}
