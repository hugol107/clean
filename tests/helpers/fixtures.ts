import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

/**
 * Creates a throwaway organization + site + location + employee for a single
 * test file, and returns a `cleanup()` to remove everything afterward.
 * Cascading FKs on Organization mean deleting it removes almost everything;
 * the user row (not owned by Organization) is deleted separately.
 */
export async function createTestOrgFixture(prefix: string) {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `${prefix}-${suffix}@test.local`, name: `Test User ${suffix}` },
  });

  const organization = await prisma.organization.create({
    data: { name: `Test Org ${suffix}`, slug: `test-org-${suffix}` },
  });

  await prisma.organizationMembership.create({
    data: { userId: user.id, organizationId: organization.id, role: "ORG_ADMIN" },
  });

  const site = await prisma.site.create({
    data: { organizationId: organization.id, name: `Test Site ${suffix}` },
  });

  const location = await prisma.location.create({
    data: {
      organizationId: organization.id,
      siteId: site.id,
      name: `Test Location ${suffix}`,
      code: `LOC-${suffix}`,
      targetDurationMinutes: 10,
      targetFrequencyMinutes: 60,
    },
  });

  const employee = await prisma.employeeProfile.create({
    data: { userId: user.id, organizationId: organization.id, siteId: site.id },
  });

  async function cleanup() {
    await prisma.organization.delete({ where: { id: organization.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  }

  return { user, organization, site, location, employee, cleanup };
}

export async function createSecondEmployeeInOrg(organizationId: string, siteId: string, prefix: string) {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `${prefix}-${suffix}@test.local`, name: `Test User ${suffix}` },
  });
  await prisma.organizationMembership.create({
    data: { userId: user.id, organizationId, role: "CLEANER" },
  });
  const employee = await prisma.employeeProfile.create({
    data: { userId: user.id, organizationId, siteId },
  });
  return { user, employee };
}
