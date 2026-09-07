"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant";
import { runAction, type ActionResult } from "@/server/actions/action-helpers";
import * as tasksService from "@/server/services/tasks";
import { RecurrenceType, TaskPriority, TaskStatus } from "@/generated/prisma/enums";

const createTaskSchema = z.object({
  organizationId: z.string().min(1),
  siteId: z.string().min(1),
  locationId: z.string().min(1),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional(),
  assignedEmployeeId: z.string().min(1).optional(),
  priority: z.enum(TaskPriority).optional(),
  dueAt: z.coerce.date().optional(),
  recurrenceType: z.enum(RecurrenceType).optional(),
  recurrenceIntervalMinutes: z.number().int().min(5).max(10080).optional(),
  checklistTemplateId: z.string().min(1).optional(),
});

export async function createTaskAction(input: z.infer<typeof createTaskSchema>): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = createTaskSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "task:manage");
    const task = await tasksService.createTask({ ...parsed, actorUserId: ctx.user.id });
    revalidatePath("/tasks");
    revalidatePath("/w");
    return { id: task.id };
  });
}

const updateStatusSchema = z.object({ organizationId: z.string().min(1), taskId: z.string().min(1), status: z.enum(TaskStatus) });

export async function updateTaskStatusAction(input: z.infer<typeof updateStatusSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = updateStatusSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "task:manage");
    await tasksService.updateTaskStatus(parsed.organizationId, ctx.user.id, parsed.taskId, parsed.status);
    revalidatePath("/tasks");
  });
}

const reassignSchema = z.object({
  organizationId: z.string().min(1),
  taskId: z.string().min(1),
  assignedEmployeeId: z.string().min(1).nullable(),
});

export async function reassignTaskAction(input: z.infer<typeof reassignSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = reassignSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "task:manage");
    await tasksService.reassignTask(parsed.organizationId, ctx.user.id, parsed.taskId, parsed.assignedEmployeeId);
    revalidatePath("/tasks");
  });
}
