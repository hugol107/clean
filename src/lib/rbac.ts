import { OrgRole } from "@/generated/prisma/enums";

export const ROLE_LABELS: Record<OrgRole, string> = {
  ORG_ADMIN: "Organization Admin",
  SITE_MANAGER: "Site Manager",
  SUPERVISOR: "Supervisor",
  CLEANER: "Cleaner",
};

export const ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  ORG_ADMIN: "Full control over the organization: sites, locations, people, checklists and settings.",
  SITE_MANAGER: "Monitors one or more sites in real time and manages assignments and performance there.",
  SUPERVISOR: "Oversees a team's tasks, reviews and validates work, and manages incidents.",
  CLEANER: "Performs cleanings, completes checklists, and reports issues from a mobile-first view.",
};

/** Roles that land on the management dashboard rather than the worker app. */
export const MANAGEMENT_ROLES: OrgRole[] = [OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER, OrgRole.SUPERVISOR];

export const ALL_ROLES: OrgRole[] = [OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER, OrgRole.SUPERVISOR, OrgRole.CLEANER];

export type Permission =
  | "org:manage"
  | "org:export"
  | "site:manage"
  | "location:manage"
  | "employee:manage"
  | "user:manage"
  | "nfctag:manage"
  | "checklist:manage"
  | "task:manage"
  | "issue:manage"
  | "issue:validate"
  | "analytics:view"
  | "reports:export"
  | "settings:manage"
  | "cleaning:perform";

/**
 * Table-driven RBAC. This is the single source of truth for "who can do
 * what" — both UI (hide/disable controls) and server actions/services
 * (the actual enforcement boundary) read from here, so the two never drift
 * apart. See src/lib/tenant.ts for how this plugs into request handling.
 */
const PERMISSIONS: Record<Permission, OrgRole[]> = {
  "org:manage": [OrgRole.ORG_ADMIN],
  "org:export": [OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER],
  "site:manage": [OrgRole.ORG_ADMIN],
  "location:manage": [OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER],
  "employee:manage": [OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER],
  "user:manage": [OrgRole.ORG_ADMIN],
  "nfctag:manage": [OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER],
  "checklist:manage": [OrgRole.ORG_ADMIN],
  "task:manage": [OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER, OrgRole.SUPERVISOR],
  "issue:manage": [OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER, OrgRole.SUPERVISOR],
  "issue:validate": [OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER, OrgRole.SUPERVISOR],
  "analytics:view": [OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER, OrgRole.SUPERVISOR],
  "reports:export": [OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER],
  "settings:manage": [OrgRole.ORG_ADMIN],
  "cleaning:perform": [OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER, OrgRole.SUPERVISOR, OrgRole.CLEANER],
};

export function can(role: OrgRole | null | undefined, permission: Permission, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return true;
  if (!role) return false;
  return PERMISSIONS[permission].includes(role);
}

export function homePathForRole(role: OrgRole | null | undefined, isSuperAdmin: boolean): string {
  if (isSuperAdmin) return "/super-admin";
  if (role === OrgRole.CLEANER) return "/w";
  return "/dashboard";
}
