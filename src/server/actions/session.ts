"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrgAccess } from "@/lib/tenant";
import { runAction, type ActionResult } from "@/server/actions/action-helpers";

const switchOrgSchema = z.object({ organizationId: z.string().min(1) });

/** Switches the "active organization" used by the dashboard shell. Verifies membership first — never trust a client-picked org id blindly. */
export async function setActiveOrganizationAction(input: z.infer<typeof switchOrgSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = switchOrgSchema.parse(input);
    const ctx = await requireOrgAccess(parsed.organizationId);
    await prisma.user.update({ where: { id: ctx.user.id }, data: { lastActiveOrganizationId: parsed.organizationId } });
  });
}
