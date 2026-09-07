import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

type DbClient = typeof prisma | Prisma.TransactionClient;

export interface RecordAuditParams {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  reason?: string | null;
}

/**
 * Append-only audit trail (spec section 22). Nothing in the app should
 * silently rewrite history — any edit to a historical record (e.g. a
 * completed CleaningSession) must go through a helper that writes both the
 * before/after values here in the same transaction as the mutation.
 */
export async function recordAudit(params: RecordAuditParams, db: DbClient = prisma) {
  await db.auditLog.create({
    data: {
      organizationId: params.organizationId ?? null,
      actorUserId: params.actorUserId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      previousValue: (params.previousValue ?? undefined) as Prisma.InputJsonValue | undefined,
      newValue: (params.newValue ?? undefined) as Prisma.InputJsonValue | undefined,
      reason: params.reason ?? null,
    },
  });
}
