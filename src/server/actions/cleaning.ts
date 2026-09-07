"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOrgAccess, requirePermission, requireUser } from "@/lib/tenant";
import { runAction, type ActionResult } from "@/server/actions/action-helpers";
import * as cleaningService from "@/server/services/cleaning-sessions";
import { getOrCreateEmployeeProfile } from "@/server/services/employees";
import { TapMethod } from "@/generated/prisma/enums";

const geoSchema = z.object({ latitude: z.number(), longitude: z.number() }).nullable().optional();

function revalidateOperationalPaths(locationId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/live");
  revalidatePath("/locations");
  revalidatePath(`/locations/${locationId}`);
  revalidatePath("/w");
  revalidatePath("/w/history");
}

const startSchema = z.object({
  token: z.string().min(1),
  method: z.enum(TapMethod).default(TapMethod.NFC),
  taskId: z.string().min(1).optional(),
  geo: geoSchema,
});

export async function startCleaningFromTagAction(
  input: z.infer<typeof startSchema>,
): Promise<ActionResult<{ sessionId: string; locationName: string }>> {
  return runAction(async () => {
    const parsed = startSchema.parse(input);
    const user = await requireUser();
    const tag = await cleaningService.resolveTagForTap(parsed.token);
    const location = tag.location!;

    await requireOrgAccess(location.organizationId);
    const employee = await getOrCreateEmployeeProfile(user.id, location.organizationId, location.siteId);

    const session = await cleaningService.startCleaningSession({
      organizationId: location.organizationId,
      employeeId: employee.id,
      actorUserId: user.id,
      locationId: location.id,
      taskId: parsed.taskId ?? null,
      startMethod: parsed.method,
      tagId: tag.id,
      geo: parsed.geo ?? null,
    });

    revalidateOperationalPaths(location.id);
    return { sessionId: session.id, locationName: location.name };
  });
}

const completeSchema = z.object({
  sessionId: z.string().min(1),
  organizationId: z.string().min(1),
  locationId: z.string().min(1),
  method: z.enum(TapMethod).default(TapMethod.NFC),
  notes: z.string().trim().max(2000).optional(),
  geo: geoSchema,
  checklistResponses: z
    .array(
      z.object({
        checklistItemId: z.string().min(1),
        isChecked: z.boolean(),
        textValue: z.string().max(500).optional(),
        numberValue: z.number().optional(),
      }),
    )
    .optional(),
});

export async function completeCleaningAction(
  input: z.infer<typeof completeSchema>,
): Promise<ActionResult<{ durationSeconds: number; anomalies: string[] }>> {
  return runAction(async () => {
    const parsed = completeSchema.parse(input);
    const user = await requireUser();
    await requireOrgAccess(parsed.organizationId);

    const result = await cleaningService.completeCleaningSession({
      sessionId: parsed.sessionId,
      organizationId: parsed.organizationId,
      actorUserId: user.id,
      endMethod: parsed.method,
      notes: parsed.notes,
      geo: parsed.geo ?? null,
      checklistResponses: parsed.checklistResponses,
    });

    revalidateOperationalPaths(parsed.locationId);
    return { durationSeconds: result.durationSeconds, anomalies: result.anomalies.map((a) => a.message) };
  });
}

const cancelSchema = z.object({
  sessionId: z.string().min(1),
  organizationId: z.string().min(1),
  locationId: z.string().min(1),
  reason: z.string().trim().min(3).max(500),
});

export async function cancelCleaningAction(input: z.infer<typeof cancelSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = cancelSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "task:manage");
    await cleaningService.cancelCleaningSession({
      sessionId: parsed.sessionId,
      organizationId: parsed.organizationId,
      actorUserId: ctx.user.id,
      reason: parsed.reason,
    });
    revalidateOperationalPaths(parsed.locationId);
  });
}

const editSchema = z.object({
  sessionId: z.string().min(1),
  organizationId: z.string().min(1),
  reason: z.string().trim().min(3).max(500),
  notes: z.string().trim().max(2000).optional(),
});

export async function editCleaningSessionAction(input: z.infer<typeof editSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = editSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "task:manage");
    await cleaningService.editCleaningSession({ ...parsed, actorUserId: ctx.user.id });
    revalidatePath("/live");
  });
}
