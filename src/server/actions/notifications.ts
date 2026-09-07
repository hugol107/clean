"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/tenant";
import { runAction, type ActionResult } from "@/server/actions/action-helpers";
import * as notificationsService from "@/server/services/notifications";

const markReadSchema = z.object({ notificationId: z.string().min(1) });

export async function markNotificationReadAction(input: z.infer<typeof markReadSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = markReadSchema.parse(input);
    const user = await requireUser();
    await notificationsService.markNotificationRead(user.id, parsed.notificationId);
    revalidatePath("/dashboard");
  });
}

const markAllSchema = z.object({ organizationId: z.string().min(1) });

export async function markAllNotificationsReadAction(input: z.infer<typeof markAllSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = markAllSchema.parse(input);
    const user = await requireUser();
    await notificationsService.markAllNotificationsRead(user.id, parsed.organizationId);
    revalidatePath("/dashboard");
  });
}
