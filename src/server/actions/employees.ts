"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant";
import { runAction, type ActionResult } from "@/server/actions/action-helpers";
import * as employeesService from "@/server/services/employees";
import { OrgRole } from "@/generated/prisma/enums";

const createEmployeeSchema = z
  .object({
    organizationId: z.string().min(1),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email(),
    authMethod: z.enum(["password", "google"]).default("password"),
    password: z.string().min(8).max(200).optional(),
    siteId: z.string().min(1),
    employeeCode: z.string().trim().max(40).optional(),
    jobTitle: z.string().trim().max(120).optional(),
  })
  .refine((data) => data.authMethod !== "password" || !!data.password, {
    message: "Set a password, or switch to Google account.",
    path: ["password"],
  });

export async function createEmployeeAction(input: z.infer<typeof createEmployeeSchema>): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { authMethod, ...parsed } = createEmployeeSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "employee:manage");
    const { employeeProfile } = await employeesService.createEmployee({
      ...parsed,
      password: authMethod === "google" ? undefined : parsed.password,
      actorUserId: ctx.user.id,
    });
    revalidatePath("/employees");
    revalidatePath("/onboarding");
    return { id: employeeProfile.id };
  });
}

const createMemberSchema = z
  .object({
    organizationId: z.string().min(1),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email(),
    authMethod: z.enum(["password", "google"]).default("password"),
    password: z.string().min(8).max(200).optional(),
    role: z.enum([OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER, OrgRole.SUPERVISOR]),
    siteIds: z.array(z.string().min(1)).optional(),
  })
  .refine((data) => data.authMethod !== "password" || !!data.password, {
    message: "Set a password, or switch to Google account.",
    path: ["password"],
  });

export async function createOrgMemberAction(input: z.infer<typeof createMemberSchema>): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { authMethod, ...parsed } = createMemberSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "user:manage");
    const { membership } = await employeesService.createOrgMember({
      ...parsed,
      password: authMethod === "google" ? undefined : parsed.password,
      actorUserId: ctx.user.id,
    });
    revalidatePath("/users");
    return { id: membership.id };
  });
}

const toggleEmployeeSchema = z.object({ organizationId: z.string().min(1), employeeId: z.string().min(1), isActive: z.boolean() });

export async function setEmployeeActiveAction(input: z.infer<typeof toggleEmployeeSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = toggleEmployeeSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "employee:manage");
    await employeesService.setEmployeeActive(parsed.organizationId, ctx.user.id, parsed.employeeId, parsed.isActive);
    revalidatePath("/employees");
  });
}
