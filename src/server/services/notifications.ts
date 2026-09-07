import "server-only";
import { prisma } from "@/lib/db";
import { NotificationType, OrgRole, MembershipStatus } from "@/generated/prisma/enums";

export interface NotifyManagersParams {
  organizationId: string;
  /** When set, only ORG_ADMIN + managers/supervisors scoped to this site are notified. */
  siteId?: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

/**
 * In-app notifications only for the MVP. The shape is deliberately
 * channel-agnostic (type/title/body/relatedEntity) so Phase 2 can fan the
 * same event out to push/email/WhatsApp/SMS/Slack without touching call
 * sites — see docs/architecture.md "Notifications".
 */
export async function notifyOrgManagers(params: NotifyManagersParams) {
  const memberships = await prisma.organizationMembership.findMany({
    where: {
      organizationId: params.organizationId,
      status: MembershipStatus.ACTIVE,
      role: { in: [OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER, OrgRole.SUPERVISOR] },
    },
    include: { siteAssignments: { select: { siteId: true } } },
  });

  const targets = memberships.filter((m) => {
    if (m.role === OrgRole.ORG_ADMIN) return true;
    if (!params.siteId) return true;
    return m.siteAssignments.some((a) => a.siteId === params.siteId);
  });

  if (targets.length === 0) return;

  await prisma.notification.createMany({
    data: targets.map((m) => ({
      organizationId: params.organizationId,
      userId: m.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      relatedEntityType: params.relatedEntityType,
      relatedEntityId: params.relatedEntityId,
    })),
  });
}

export async function listNotifications(userId: string, organizationId: string, limit = 30) {
  return prisma.notification.findMany({
    where: { userId, organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countUnreadNotifications(userId: string, organizationId: string) {
  return prisma.notification.count({ where: { userId, organizationId, isRead: false } });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

export async function markAllNotificationsRead(userId: string, organizationId: string) {
  await prisma.notification.updateMany({
    where: { userId, organizationId, isRead: false },
    data: { isRead: true },
  });
}
