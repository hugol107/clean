"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission, requireSuperAdmin, requireUser } from "@/lib/tenant";
import { runAction, type ActionResult } from "@/server/actions/action-helpers";
import * as organizationsService from "@/server/services/organizations";
import * as sitesService from "@/server/services/sites";
import { LocationVerification, OrgPlan } from "@/generated/prisma/enums";

const createOrgForSelfSchema = z.object({
  name: z.string().trim().min(2, "Company name is too short").max(160),
});

/**
 * Onboarding step 1 for someone who is already authenticated but belongs to
 * no organization yet — the case a Google-first sign-in lands in, since
 * there's no password-based registration form to collect a company name on
 * the way in. Deliberately password-agnostic: the person is already signed
 * in, so this only ever needs the org name.
 */
export async function createOrganizationForSelfAction(
  input: z.infer<typeof createOrgForSelfSchema>,
): Promise<ActionResult<{ organizationId: string }>> {
  return runAction(async () => {
    const parsed = createOrgForSelfSchema.parse(input);
    const user = await requireUser();
    const { organization } = await organizationsService.createOrganizationWithOwner({
      name: parsed.name,
      ownerUserId: user.id,
    });
    revalidatePath("/onboarding");
    return { organizationId: organization.id };
  });
}

const updateSettingsSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().trim().min(2).max(160).optional(),
  timezone: z.string().min(1).optional(),
  locationVerification: z.enum(LocationVerification).optional(),
  allowMultipleActiveSessions: z.boolean().optional(),
  dueSoonThresholdPercent: z.number().int().min(10).max(99).optional(),
  dataRetentionDays: z.number().int().min(30).max(3650).optional(),
});

export async function updateOrganizationSettingsAction(input: z.infer<typeof updateSettingsSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = updateSettingsSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "settings:manage");
    await organizationsService.updateOrganizationSettings({ ...parsed, actorUserId: ctx.user.id });
    revalidatePath("/settings");
  });
}

const createSiteSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  address: z.string().trim().max(240).optional(),
  city: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  timezone: z.string().optional(),
  operatingHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  operatingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function createSiteAction(input: z.infer<typeof createSiteSchema>): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = createSiteSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "site:manage");
    const site = await sitesService.createSite({ ...parsed, actorUserId: ctx.user.id });
    revalidatePath("/sites");
    revalidatePath("/onboarding");
    return { id: site.id };
  });
}

const updateSiteSchema = createSiteSchema.partial().extend({
  organizationId: z.string().min(1),
  siteId: z.string().min(1),
});

export async function updateSiteAction(input: z.infer<typeof updateSiteSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const { organizationId, siteId, ...rest } = updateSiteSchema.parse(input);
    const ctx = await requirePermission(organizationId, "site:manage");
    await sitesService.updateSite(organizationId, ctx.user.id, siteId, rest);
    revalidatePath("/sites");
    revalidatePath(`/sites/${siteId}`);
  });
}

const toggleSiteSchema = z.object({ organizationId: z.string().min(1), siteId: z.string().min(1), isActive: z.boolean() });

export async function setSiteActiveAction(input: z.infer<typeof toggleSiteSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = toggleSiteSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "site:manage");
    await sitesService.setSiteActive(parsed.organizationId, ctx.user.id, parsed.siteId, parsed.isActive);
    revalidatePath("/sites");
  });
}

const createAreaSchema = z.object({
  organizationId: z.string().min(1),
  siteId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  level: z.number().int().optional(),
});

export async function createAreaAction(input: z.infer<typeof createAreaSchema>): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = createAreaSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "site:manage");
    const area = await sitesService.createArea(parsed.organizationId, ctx.user.id, parsed.siteId, parsed.name, parsed.level);
    revalidatePath(`/sites/${parsed.siteId}`);
    return { id: area.id };
  });
}

// --- Super Admin (platform-wide) ------------------------------------------

const platformPlanSchema = z.object({ organizationId: z.string().min(1), plan: z.enum(OrgPlan) });

export async function updateOrganizationPlanAction(input: z.infer<typeof platformPlanSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = platformPlanSchema.parse(input);
    const admin = await requireSuperAdmin();
    await organizationsService.updateOrganizationPlan(parsed.organizationId, admin.id, parsed.plan);
    revalidatePath("/super-admin");
  });
}

const platformSuspendSchema = z.object({ organizationId: z.string().min(1), isActive: z.boolean() });

export async function setOrganizationActiveAction(input: z.infer<typeof platformSuspendSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = platformSuspendSchema.parse(input);
    const admin = await requireSuperAdmin();
    await organizationsService.setOrganizationActive(parsed.organizationId, admin.id, parsed.isActive);
    revalidatePath("/super-admin");
  });
}
