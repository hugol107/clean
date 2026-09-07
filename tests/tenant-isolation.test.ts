import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getLocationDetail } from "@/server/services/locations";
import { getEmployeeDetail } from "@/server/services/employees";
import { createTestOrgFixture } from "./helpers/fixtures";

/**
 * Every service function scopes its query by `organizationId` — this is the
 * actual mechanism that keeps tenants apart (spec section 23: "No confiar
 * nunca únicamente en permisos del frontend"). These tests prove that
 * mechanism holds: asking Org B's service functions for Org A's data
 * returns "not found", never the data.
 */
describe("tenant isolation", () => {
  let orgA: Awaited<ReturnType<typeof createTestOrgFixture>>;
  let orgB: Awaited<ReturnType<typeof createTestOrgFixture>>;

  beforeAll(async () => {
    orgA = await createTestOrgFixture("tenant-a");
    orgB = await createTestOrgFixture("tenant-b");
  });

  afterAll(async () => {
    await orgA.cleanup();
    await orgB.cleanup();
  });

  it("returns the location when queried under its own organization", async () => {
    const location = await getLocationDetail(orgA.organization.id, orgA.location.id);
    expect(location.id).toBe(orgA.location.id);
  });

  it("refuses to return Org A's location when queried under Org B", async () => {
    await expect(getLocationDetail(orgB.organization.id, orgA.location.id)).rejects.toThrow(/not found/i);
  });

  it("refuses to return Org A's employee when queried under Org B", async () => {
    await expect(getEmployeeDetail(orgB.organization.id, orgA.employee.id)).rejects.toThrow(/not found/i);
  });

  it("a made-up organization id sees nothing real, either", async () => {
    await expect(getLocationDetail("does-not-exist", orgA.location.id)).rejects.toThrow(/not found/i);
  });
});
