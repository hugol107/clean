import { describe, it, expect } from "vitest";
import { can, homePathForRole } from "@/lib/rbac";
import { OrgRole } from "@/generated/prisma/enums";

describe("can()", () => {
  it("lets ORG_ADMIN manage settings, sites, and users", () => {
    expect(can(OrgRole.ORG_ADMIN, "settings:manage")).toBe(true);
    expect(can(OrgRole.ORG_ADMIN, "site:manage")).toBe(true);
    expect(can(OrgRole.ORG_ADMIN, "user:manage")).toBe(true);
  });

  it("does not let SITE_MANAGER manage org settings or users", () => {
    expect(can(OrgRole.SITE_MANAGER, "settings:manage")).toBe(false);
    expect(can(OrgRole.SITE_MANAGER, "user:manage")).toBe(false);
  });

  it("lets SITE_MANAGER manage locations and NFC tags", () => {
    expect(can(OrgRole.SITE_MANAGER, "location:manage")).toBe(true);
    expect(can(OrgRole.SITE_MANAGER, "nfctag:manage")).toBe(true);
  });

  it("lets every role perform a cleaning, including CLEANER", () => {
    for (const role of [OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER, OrgRole.SUPERVISOR, OrgRole.CLEANER]) {
      expect(can(role, "cleaning:perform")).toBe(true);
    }
  });

  it("does not let CLEANER manage checklists, employees, or issues", () => {
    expect(can(OrgRole.CLEANER, "checklist:manage")).toBe(false);
    expect(can(OrgRole.CLEANER, "employee:manage")).toBe(false);
    expect(can(OrgRole.CLEANER, "issue:manage")).toBe(false);
  });

  it("a super admin can do anything, regardless of their org role", () => {
    expect(can(null, "settings:manage", true)).toBe(true);
    expect(can(OrgRole.CLEANER, "user:manage", true)).toBe(true);
  });

  it("denies everything when there is no role and no super admin flag", () => {
    expect(can(null, "cleaning:perform")).toBe(false);
  });
});

describe("homePathForRole()", () => {
  it("sends a super admin to the platform console", () => {
    expect(homePathForRole(OrgRole.ORG_ADMIN, true)).toBe("/super-admin");
  });

  it("sends a cleaner to the worker app", () => {
    expect(homePathForRole(OrgRole.CLEANER, false)).toBe("/w");
  });

  it("sends every management role to the dashboard", () => {
    expect(homePathForRole(OrgRole.ORG_ADMIN, false)).toBe("/dashboard");
    expect(homePathForRole(OrgRole.SITE_MANAGER, false)).toBe("/dashboard");
    expect(homePathForRole(OrgRole.SUPERVISOR, false)).toBe("/dashboard");
  });
});
