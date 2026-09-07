import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/services/audit";
import { OrgRole } from "@/generated/prisma/enums";

const PASSWORD_SALT_ROUNDS = 10;

export interface CreateEmployeeParams {
  organizationId: string;
  actorUserId: string;
  name: string;
  email: string;
  password: string;
  siteId: string;
  employeeCode?: string;
  jobTitle?: string;
}

/** Creates the worker's login + CLEANER membership + EmployeeProfile together — the "Add Worker" flow. */
export async function createEmployee(params: CreateEmployeeParams) {
  const normalizedEmail = params.email.trim().toLowerCase();

  return prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email: normalizedEmail } });
    if (user) {
      const existingMembership = await tx.organizationMembership.findUnique({
        where: { userId_organizationId: { userId: user.id, organizationId: params.organizationId } },
      });
      if (existingMembership) throw new ConflictError("This person is already a member of this organization.");
    } else {
      const passwordHash = await bcrypt.hash(params.password, PASSWORD_SALT_ROUNDS);
      user = await tx.user.create({ data: { name: params.name, email: normalizedEmail, passwordHash } });
    }

    const membership = await tx.organizationMembership.create({
      data: { userId: user.id, organizationId: params.organizationId, role: OrgRole.CLEANER },
    });

    const employeeProfile = await tx.employeeProfile.create({
      data: {
        userId: user.id,
        organizationId: params.organizationId,
        siteId: params.siteId,
        employeeCode: params.employeeCode,
        jobTitle: params.jobTitle,
        hiredAt: new Date(),
      },
    });

    await recordAudit(
      {
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        action: "employee.created",
        entityType: "EmployeeProfile",
        entityId: employeeProfile.id,
        metadata: { email: normalizedEmail, siteId: params.siteId },
      },
      tx,
    );

    return { user, membership, employeeProfile };
  });
}

export interface CreateOrgMemberParams {
  organizationId: string;
  actorUserId: string;
  name: string;
  email: string;
  password: string;
  role: Exclude<OrgRole, "CLEANER">;
  siteIds?: string[];
}

/** Creates a manager/supervisor/admin account (no EmployeeProfile — see getOrCreateEmployeeProfile for lazy provisioning if they ever tap a tag). */
export async function createOrgMember(params: CreateOrgMemberParams) {
  const normalizedEmail = params.email.trim().toLowerCase();

  return prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email: normalizedEmail } });
    if (user) {
      const existingMembership = await tx.organizationMembership.findUnique({
        where: { userId_organizationId: { userId: user.id, organizationId: params.organizationId } },
      });
      if (existingMembership) throw new ConflictError("This person is already a member of this organization.");
    } else {
      const passwordHash = await bcrypt.hash(params.password, PASSWORD_SALT_ROUNDS);
      user = await tx.user.create({ data: { name: params.name, email: normalizedEmail, passwordHash } });
    }

    const membership = await tx.organizationMembership.create({
      data: { userId: user.id, organizationId: params.organizationId, role: params.role },
    });

    if (params.siteIds?.length && params.role !== OrgRole.ORG_ADMIN) {
      await tx.membershipSiteAssignment.createMany({
        data: params.siteIds.map((siteId) => ({ membershipId: membership.id, siteId })),
      });
    }

    await recordAudit(
      {
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        action: "user.created",
        entityType: "OrganizationMembership",
        entityId: membership.id,
        metadata: { role: params.role, email: normalizedEmail },
      },
      tx,
    );

    return { user, membership };
  });
}

/** Lazily provisions an EmployeeProfile for a manager/supervisor who taps an NFC tag to cover a cleaning themselves. */
export async function getOrCreateEmployeeProfile(userId: string, organizationId: string, defaultSiteId: string) {
  const existing = await prisma.employeeProfile.findFirst({ where: { userId, organizationId } });
  if (existing) return existing;
  return prisma.employeeProfile.create({ data: { userId, organizationId, siteId: defaultSiteId } });
}

export interface ListEmployeesParams {
  organizationId: string;
  siteIds?: string[] | null;
  search?: string;
}

export async function listEmployees(params: ListEmployeesParams) {
  const employees = await prisma.employeeProfile.findMany({
    where: {
      organizationId: params.organizationId,
      ...(params.siteIds ? { siteId: { in: params.siteIds } } : {}),
      ...(params.search
        ? { user: { OR: [{ name: { contains: params.search, mode: "insensitive" } }, { email: { contains: params.search, mode: "insensitive" } }] } }
        : {}),
    },
    include: {
      user: true,
      site: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const membershipByUserId = await prisma.organizationMembership.findMany({
    where: { organizationId: params.organizationId, userId: { in: employees.map((e) => e.userId) } },
  });
  const roleByUserId = new Map(membershipByUserId.map((m) => [m.userId, m.role]));

  return employees.map((e) => ({ ...e, role: roleByUserId.get(e.userId) ?? OrgRole.CLEANER }));
}

export async function getEmployeeDetail(organizationId: string, employeeId: string) {
  const employee = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, organizationId },
    include: { user: true, site: true },
  });
  if (!employee) throw new NotFoundError("Employee not found.");
  const membership = await prisma.organizationMembership.findUnique({
    where: { userId_organizationId: { userId: employee.userId, organizationId } },
  });
  return { ...employee, role: membership?.role ?? OrgRole.CLEANER };
}

export async function setEmployeeActive(organizationId: string, actorUserId: string, employeeId: string, isActive: boolean) {
  const employee = await prisma.employeeProfile.findFirst({ where: { id: employeeId, organizationId } });
  if (!employee) throw new NotFoundError("Employee not found.");

  const updated = await prisma.employeeProfile.update({ where: { id: employeeId }, data: { isActive } });
  await recordAudit({
    organizationId,
    actorUserId,
    action: isActive ? "employee.reactivated" : "employee.deactivated",
    entityType: "EmployeeProfile",
    entityId: employeeId,
  });
  return updated;
}
