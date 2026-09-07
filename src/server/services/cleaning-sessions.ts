import "server-only";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { AppError, ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { detectSessionAnomalies } from "@/lib/sla";
import { recordAudit } from "@/server/services/audit";
import { notifyOrgManagers } from "@/server/services/notifications";
import {
  NfcTagStatus,
  SessionStatus,
  TapMethod,
  TaskStatus,
  LocationVerification,
  NotificationType,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

const PRISMA_UNIQUE_CONSTRAINT = "P2002";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Resolves a public NFC/QR token to the location it's assigned to. Never leaks internal ids beyond what the caller already has access to. */
export async function resolveTagForTap(token: string) {
  const tag = await prisma.nFCTag.findUnique({
    where: { token },
    include: {
      location: {
        include: {
          site: true,
          organization: true,
          checklistTemplate: { include: { items: { orderBy: { sortOrder: "asc" } } } },
        },
      },
    },
  });

  if (!tag) throw new NotFoundError("This code isn't recognized. Ask your manager to check the tag or QR code.");
  if (tag.status === NfcTagStatus.DISABLED) {
    throw new NotFoundError("This tag has been disabled. Ask your manager for a replacement.");
  }
  if (!tag.location || tag.status !== NfcTagStatus.ACTIVE) {
    throw new NotFoundError("This tag isn't linked to a location yet. Ask your manager to assign it.");
  }
  if (!tag.location.isActive) {
    throw new NotFoundError("This location is currently inactive.");
  }

  await prisma.nFCTag.update({ where: { id: tag.id }, data: { lastUsedAt: new Date() } });

  return tag;
}

export type TapState =
  | { state: "idle" }
  | { state: "mine"; session: Awaited<ReturnType<typeof getActiveSessionWithDetails>> }
  | { state: "other"; session: Awaited<ReturnType<typeof getActiveSessionWithDetails>> };

async function getActiveSessionWithDetails(sessionId: string) {
  return prisma.cleaningSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { employee: { include: { user: true } }, checklistResponses: { include: { checklistItem: true } } },
  });
}

export async function getLocationTapState(locationId: string, currentEmployeeId: string | null): Promise<TapState> {
  const lock = await prisma.activeLocationLock.findUnique({ where: { locationId } });
  if (!lock) return { state: "idle" };

  const session = await getActiveSessionWithDetails(lock.sessionId);
  return lock.employeeId === currentEmployeeId ? { state: "mine", session } : { state: "other", session };
}

function resolveEffectiveChecklistTemplateId(
  location: { checklistTemplateId: string | null },
  task: { checklistTemplateId: string | null } | null,
): string | null {
  return task?.checklistTemplateId ?? location.checklistTemplateId ?? null;
}

export interface StartCleaningParams {
  organizationId: string;
  employeeId: string;
  actorUserId: string;
  locationId: string;
  taskId?: string | null;
  startMethod: TapMethod;
  tagId?: string | null;
  geo?: GeoPoint | null;
}

export async function startCleaningSession(params: StartCleaningParams) {
  const [organization, location, task] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: params.organizationId } }),
    prisma.location.findUniqueOrThrow({ where: { id: params.locationId } }),
    params.taskId ? prisma.cleaningTask.findUnique({ where: { id: params.taskId } }) : Promise.resolve(null),
  ]);

  if (location.organizationId !== params.organizationId) {
    throw new AuthorizationTenantError();
  }

  validateGeoRequirement(organization.locationVerification, params.geo);

  if (!organization.allowMultipleActiveSessions) {
    const existingForEmployee = await prisma.cleaningSession.findFirst({
      where: { employeeId: params.employeeId, status: SessionStatus.ACTIVE },
      include: { location: true },
    });
    if (existingForEmployee) {
      throw new ConflictError(
        `You already have an active cleaning at "${existingForEmployee.location.name}". Finish it before starting another.`,
      );
    }
  }

  const checklistTemplateId = resolveEffectiveChecklistTemplateId(location, task);
  const checklistItems = checklistTemplateId
    ? await prisma.checklistItem.findMany({ where: { checklistTemplateId } })
    : [];

  const sessionId = randomUUID();
  const geo = organization.locationVerification === LocationVerification.OFF ? null : params.geo ?? null;

  try {
    const session = await prisma.$transaction(async (tx) => {
      // Primary-key insert as a mutex: a second concurrent Tap In on the same
      // location fails here with a unique-constraint error instead of racing
      // past a check-then-insert.
      await tx.activeLocationLock.create({
        data: { locationId: params.locationId, sessionId, employeeId: params.employeeId },
      });

      const created = await tx.cleaningSession.create({
        data: {
          id: sessionId,
          organizationId: params.organizationId,
          siteId: location.siteId,
          locationId: params.locationId,
          employeeId: params.employeeId,
          taskId: params.taskId ?? null,
          startMethod: params.startMethod,
          status: SessionStatus.ACTIVE,
          startLatitude: geo?.latitude ?? null,
          startLongitude: geo?.longitude ?? null,
          checklistResponses: {
            create: checklistItems.map((item) => ({ checklistItemId: item.id, isChecked: false })),
          },
        },
        include: { location: true, checklistResponses: { include: { checklistItem: true } } },
      });

      if (params.taskId) {
        await tx.cleaningTask.update({ where: { id: params.taskId }, data: { status: TaskStatus.IN_PROGRESS } });
      }
      if (params.tagId) {
        await tx.nFCTag.update({ where: { id: params.tagId }, data: { lastUsedAt: new Date() } });
      }

      await recordAudit(
        {
          organizationId: params.organizationId,
          actorUserId: params.actorUserId,
          action: "cleaning.started",
          entityType: "CleaningSession",
          entityId: sessionId,
          metadata: { locationId: params.locationId, startMethod: params.startMethod },
        },
        tx,
      );

      return created;
    });

    return session;
  } catch (error) {
    if (isPrismaKnownError(error, PRISMA_UNIQUE_CONSTRAINT)) {
      throw new ConflictError("This location already has an active cleaning in progress.");
    }
    throw error;
  }
}

export interface CompleteCleaningParams {
  sessionId: string;
  organizationId: string;
  actorUserId: string;
  endMethod: TapMethod;
  notes?: string | null;
  geo?: GeoPoint | null;
  checklistResponses?: { checklistItemId: string; isChecked: boolean; textValue?: string | null; numberValue?: number | null }[];
}

export async function completeCleaningSession(params: CompleteCleaningParams) {
  const session = await prisma.cleaningSession.findFirst({
    where: { id: params.sessionId, organizationId: params.organizationId },
    include: { location: true, organization: true },
  });
  if (!session) throw new NotFoundError("Cleaning session not found.");
  if (session.status !== SessionStatus.ACTIVE) {
    throw new ConflictError("This cleaning session has already been finished or cancelled.");
  }

  validateGeoRequirement(session.organization.locationVerification, params.geo);
  const geo = session.organization.locationVerification === LocationVerification.OFF ? null : params.geo ?? null;

  const requiredItems = await prisma.checklistItem.findMany({
    where: { responses: { some: { sessionId: session.id } }, isRequired: true },
    select: { id: true },
  });

  if (requiredItems.length > 0 && params.checklistResponses) {
    const checkedIds = new Set(params.checklistResponses.filter((r) => r.isChecked).map((r) => r.checklistItemId));
    const missing = requiredItems.filter((item) => !checkedIds.has(item.id));
    if (missing.length > 0) {
      throw new ValidationError("Please complete every required checklist item before finishing.");
    }
  }

  // Server time is authoritative for duration — never trust a client-sent value (spec section 34).
  const completedAt = new Date();
  const durationSeconds = Math.max(0, Math.round((completedAt.getTime() - session.startedAt.getTime()) / 1000));
  const anomalies = detectSessionAnomalies(durationSeconds, session.location.targetDurationMinutes);

  const updated = await prisma.$transaction(async (tx) => {
    if (params.checklistResponses) {
      for (const response of params.checklistResponses) {
        await tx.checklistResponse.updateMany({
          where: { sessionId: session.id, checklistItemId: response.checklistItemId },
          data: {
            isChecked: response.isChecked,
            textValue: response.textValue ?? null,
            numberValue: response.numberValue ?? null,
          },
        });
      }
    }

    const result = await tx.cleaningSession.update({
      where: { id: session.id },
      data: {
        completedAt,
        durationSeconds,
        status: SessionStatus.COMPLETED,
        endMethod: params.endMethod,
        endLatitude: geo?.latitude ?? null,
        endLongitude: geo?.longitude ?? null,
        notes: params.notes ?? null,
        flagReason: anomalies.length > 0 ? anomalies.map((a) => a.message).join(" ") : null,
      },
      include: { location: true, checklistResponses: { include: { checklistItem: true } } },
    });

    await tx.activeLocationLock.deleteMany({ where: { sessionId: session.id } });

    if (session.taskId) {
      await tx.cleaningTask.update({ where: { id: session.taskId }, data: { status: TaskStatus.COMPLETED } });
    }

    await recordAudit(
      {
        organizationId: session.organizationId,
        actorUserId: params.actorUserId,
        action: "cleaning.completed",
        entityType: "CleaningSession",
        entityId: session.id,
        metadata: { durationSeconds, anomalies: anomalies.map((a) => a.type) },
      },
      tx,
    );

    return result;
  });

  if (anomalies.length > 0) {
    await notifyOrgManagers({
      organizationId: session.organizationId,
      siteId: session.siteId,
      type: NotificationType.SESSION_EXCEEDED,
      title: `Review recommended: ${updated.location.name}`,
      body: anomalies.map((a) => a.message).join(" "),
      relatedEntityType: "CleaningSession",
      relatedEntityId: session.id,
    });
  }

  return { session: updated, durationSeconds, anomalies };
}

export interface CancelCleaningParams {
  sessionId: string;
  organizationId: string;
  actorUserId: string;
  reason: string;
}

export async function cancelCleaningSession(params: CancelCleaningParams) {
  const session = await prisma.cleaningSession.findFirst({
    where: { id: params.sessionId, organizationId: params.organizationId },
  });
  if (!session) throw new NotFoundError("Cleaning session not found.");
  if (session.status !== SessionStatus.ACTIVE) {
    throw new ConflictError("Only an active session can be cancelled.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.cleaningSession.update({
      where: { id: session.id },
      data: { status: SessionStatus.CANCELLED, cancelledReason: params.reason, completedAt: new Date() },
    });
    await tx.activeLocationLock.deleteMany({ where: { sessionId: session.id } });
    if (session.taskId) {
      await tx.cleaningTask.update({ where: { id: session.taskId }, data: { status: TaskStatus.PENDING } });
    }
    await recordAudit(
      {
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        action: "cleaning.cancelled",
        entityType: "CleaningSession",
        entityId: session.id,
        reason: params.reason,
      },
      tx,
    );
    return updated;
  });
}

export interface EditSessionParams {
  sessionId: string;
  organizationId: string;
  actorUserId: string;
  reason: string;
  notes?: string;
  status?: (typeof SessionStatus)[keyof typeof SessionStatus];
}

/** Administrative correction to a historical session. Always logs before/after + reason (spec section 22). */
export async function editCleaningSession(params: EditSessionParams) {
  const session = await prisma.cleaningSession.findFirst({ where: { id: params.sessionId, organizationId: params.organizationId } });
  if (!session) throw new NotFoundError("Cleaning session not found.");
  if (!params.reason?.trim()) throw new ValidationError("A reason is required to edit a historical session.");

  const previousValue = { notes: session.notes, status: session.status };
  const nextData: Prisma.CleaningSessionUpdateInput = {};
  if (params.notes !== undefined) nextData.notes = params.notes;
  if (params.status !== undefined) nextData.status = params.status;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.cleaningSession.update({ where: { id: session.id }, data: nextData });
    await recordAudit(
      {
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        action: "cleaning.session_edited",
        entityType: "CleaningSession",
        entityId: session.id,
        previousValue,
        newValue: { notes: updated.notes, status: updated.status },
        reason: params.reason,
      },
      tx,
    );
    return updated;
  });
}

function validateGeoRequirement(verification: LocationVerification, geo: GeoPoint | null | undefined) {
  if (verification === LocationVerification.REQUIRED && !geo) {
    throw new ValidationError("Location verification is required by your organization. Please enable location access and try again.");
  }
}

function isPrismaKnownError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === code;
}

class AuthorizationTenantError extends AppError {
  constructor() {
    super("This location does not belong to the expected organization.", "FORBIDDEN", 403);
  }
}
