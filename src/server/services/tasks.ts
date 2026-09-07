import "server-only";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/services/audit";
import { TaskPriority, TaskStatus, RecurrenceType } from "@/generated/prisma/enums";

export interface CreateTaskParams {
  organizationId: string;
  actorUserId: string;
  siteId: string;
  locationId: string;
  title: string;
  description?: string;
  assignedEmployeeId?: string | null;
  priority?: TaskPriority;
  dueAt?: Date | null;
  recurrenceType?: RecurrenceType;
  recurrenceIntervalMinutes?: number | null;
  checklistTemplateId?: string | null;
}

export async function createTask(params: CreateTaskParams) {
  const task = await prisma.cleaningTask.create({
    data: {
      organizationId: params.organizationId,
      siteId: params.siteId,
      locationId: params.locationId,
      title: params.title,
      description: params.description,
      assignedEmployeeId: params.assignedEmployeeId ?? null,
      priority: params.priority ?? TaskPriority.NORMAL,
      dueAt: params.dueAt ?? null,
      recurrenceType: params.recurrenceType ?? RecurrenceType.NONE,
      recurrenceIntervalMinutes: params.recurrenceIntervalMinutes ?? null,
      checklistTemplateId: params.checklistTemplateId ?? null,
      createdById: params.actorUserId,
      status: TaskStatus.PENDING,
    },
  });

  await recordAudit({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    action: "task.created",
    entityType: "CleaningTask",
    entityId: task.id,
    metadata: { title: params.title },
  });

  return task;
}

export async function updateTaskStatus(organizationId: string, actorUserId: string, taskId: string, status: TaskStatus) {
  const task = await prisma.cleaningTask.findFirst({ where: { id: taskId, organizationId } });
  if (!task) throw new NotFoundError("Task not found.");
  const updated = await prisma.cleaningTask.update({ where: { id: taskId }, data: { status } });
  await recordAudit({ organizationId, actorUserId, action: "task.status_changed", entityType: "CleaningTask", entityId: taskId, newValue: { status } });
  return updated;
}

export async function reassignTask(organizationId: string, actorUserId: string, taskId: string, assignedEmployeeId: string | null) {
  const task = await prisma.cleaningTask.findFirst({ where: { id: taskId, organizationId } });
  if (!task) throw new NotFoundError("Task not found.");
  const updated = await prisma.cleaningTask.update({ where: { id: taskId }, data: { assignedEmployeeId } });
  await recordAudit({ organizationId, actorUserId, action: "task.reassigned", entityType: "CleaningTask", entityId: taskId, newValue: { assignedEmployeeId } });
  return updated;
}

export interface ListTasksParams {
  organizationId: string;
  accessibleSiteIds?: string[] | null;
  siteId?: string;
  status?: TaskStatus;
  assignedEmployeeId?: string;
  priority?: TaskPriority;
}

export async function listTasks(params: ListTasksParams) {
  const now = new Date();
  // Tasks past their due date and still not finished are surfaced as overdue
  // without needing a cron job to flip a stored status.
  await prisma.cleaningTask.updateMany({
    where: {
      organizationId: params.organizationId,
      status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
      dueAt: { lt: now },
    },
    data: { status: TaskStatus.OVERDUE },
  });

  return prisma.cleaningTask.findMany({
    where: {
      organizationId: params.organizationId,
      ...(params.accessibleSiteIds ? { siteId: { in: params.accessibleSiteIds } } : {}),
      ...(params.siteId ? { siteId: params.siteId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.assignedEmployeeId ? { assignedEmployeeId: params.assignedEmployeeId } : {}),
      ...(params.priority ? { priority: params.priority } : {}),
    },
    include: {
      location: { include: { site: true } },
      assignedEmployee: { include: { user: true } },
      checklistTemplate: true,
    },
    orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
  });
}

export async function listTasksForEmployee(organizationId: string, employeeId: string, dateFrom: Date) {
  return prisma.cleaningTask.findMany({
    where: {
      organizationId,
      assignedEmployeeId: employeeId,
      OR: [{ dueAt: { gte: dateFrom } }, { dueAt: null }],
      status: { notIn: [TaskStatus.CANCELLED] },
    },
    include: { location: true, checklistTemplate: { include: { items: true } } },
    orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
  });
}
