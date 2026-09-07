"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signIn } from "@/auth";
import { registerSchema } from "@/lib/validation/auth";
import { ConflictError } from "@/lib/errors";
import { createOrganizationWithOwner } from "@/server/services/organizations";
import { runAction, type ActionResult } from "@/server/actions/action-helpers";

const PASSWORD_SALT_ROUNDS = 10;

export async function registerManagerAction(input: unknown): Promise<ActionResult<{ organizationSlug: string }>> {
  return runAction(async () => {
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      throw new ConflictError(parsed.error.issues[0]?.message ?? "Please check the form fields.");
    }
    const { name, email, password, organizationName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError("An account with this email already exists. Try signing in instead.");
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    const user = await prisma.user.create({ data: { name, email, passwordHash } });
    const { organization } = await createOrganizationWithOwner({ name: organizationName, ownerUserId: user.id });

    await signIn("credentials", { email, password, redirect: false });

    return { organizationSlug: organization.slug };
  });
}
