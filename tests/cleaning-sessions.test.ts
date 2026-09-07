import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { startCleaningSession, completeCleaningSession, resolveTagForTap } from "@/server/services/cleaning-sessions";
import { createTestOrgFixture, createSecondEmployeeInOrg } from "./helpers/fixtures";
import { TapMethod, NfcTagStatus } from "@/generated/prisma/enums";

describe("cleaning session lifecycle", () => {
  let fixture: Awaited<ReturnType<typeof createTestOrgFixture>>;

  beforeAll(async () => {
    fixture = await createTestOrgFixture("sessions");
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it("starts a session and immediately reserves the location via ActiveLocationLock", async () => {
    const session = await startCleaningSession({
      organizationId: fixture.organization.id,
      employeeId: fixture.employee.id,
      actorUserId: fixture.user.id,
      locationId: fixture.location.id,
      startMethod: TapMethod.NFC,
    });

    expect(session.status).toBe("ACTIVE");
    expect(session.locationId).toBe(fixture.location.id);

    const lock = await prisma.activeLocationLock.findUnique({ where: { locationId: fixture.location.id } });
    expect(lock?.sessionId).toBe(session.id);

    // Clean up for the next test.
    await completeCleaningSession({
      sessionId: session.id,
      organizationId: fixture.organization.id,
      actorUserId: fixture.user.id,
      endMethod: TapMethod.NFC,
    });
  });

  it("refuses a second Tap In on the same location while one is already active (spec section 5)", async () => {
    const second = await createSecondEmployeeInOrg(fixture.organization.id, fixture.site.id, "sessions-dup");

    const first = await startCleaningSession({
      organizationId: fixture.organization.id,
      employeeId: fixture.employee.id,
      actorUserId: fixture.user.id,
      locationId: fixture.location.id,
      startMethod: TapMethod.NFC,
    });

    await expect(
      startCleaningSession({
        organizationId: fixture.organization.id,
        employeeId: second.employee.id,
        actorUserId: second.user.id,
        locationId: fixture.location.id,
        startMethod: TapMethod.NFC,
      }),
    ).rejects.toThrow(/already has an active cleaning/i);

    await completeCleaningSession({
      sessionId: first.id,
      organizationId: fixture.organization.id,
      actorUserId: fixture.user.id,
      endMethod: TapMethod.NFC,
    });
    await prisma.organizationMembership.deleteMany({ where: { userId: second.user.id } });
    await prisma.employeeProfile.delete({ where: { id: second.employee.id } });
    await prisma.user.delete({ where: { id: second.user.id } });
  });

  it("refuses a second concurrent session for the same employee when the org disallows it (default)", async () => {
    const secondLocation = await prisma.location.create({
      data: {
        organizationId: fixture.organization.id,
        siteId: fixture.site.id,
        name: "Second Location",
        code: "LOC-2ND",
        targetDurationMinutes: 10,
        targetFrequencyMinutes: 60,
      },
    });

    const first = await startCleaningSession({
      organizationId: fixture.organization.id,
      employeeId: fixture.employee.id,
      actorUserId: fixture.user.id,
      locationId: fixture.location.id,
      startMethod: TapMethod.NFC,
    });

    await expect(
      startCleaningSession({
        organizationId: fixture.organization.id,
        employeeId: fixture.employee.id,
        actorUserId: fixture.user.id,
        locationId: secondLocation.id,
        startMethod: TapMethod.NFC,
      }),
    ).rejects.toThrow(/already have an active cleaning/i);

    await completeCleaningSession({
      sessionId: first.id,
      organizationId: fixture.organization.id,
      actorUserId: fixture.user.id,
      endMethod: TapMethod.NFC,
    });
  });

  it("computes duration from server timestamps and releases the lock so the location can be cleaned again", async () => {
    const session = await startCleaningSession({
      organizationId: fixture.organization.id,
      employeeId: fixture.employee.id,
      actorUserId: fixture.user.id,
      locationId: fixture.location.id,
      startMethod: TapMethod.NFC,
    });

    const { session: completed, durationSeconds } = await completeCleaningSession({
      sessionId: session.id,
      organizationId: fixture.organization.id,
      actorUserId: fixture.user.id,
      endMethod: TapMethod.NFC,
    });

    expect(completed.status).toBe("COMPLETED");
    expect(completed.durationSeconds).toBe(durationSeconds);
    expect(durationSeconds).toBeGreaterThanOrEqual(0);
    expect(durationSeconds).toBeLessThan(10); // this test runs in well under 10s

    const lock = await prisma.activeLocationLock.findUnique({ where: { locationId: fixture.location.id } });
    expect(lock).toBeNull();

    // The location is free again — starting a new session must succeed.
    const again = await startCleaningSession({
      organizationId: fixture.organization.id,
      employeeId: fixture.employee.id,
      actorUserId: fixture.user.id,
      locationId: fixture.location.id,
      startMethod: TapMethod.NFC,
    });
    expect(again.status).toBe("ACTIVE");
    await completeCleaningSession({
      sessionId: again.id,
      organizationId: fixture.organization.id,
      actorUserId: fixture.user.id,
      endMethod: TapMethod.NFC,
    });
  });

  it("flags an anomalously short session for review without blocking the worker (spec section 25)", async () => {
    const session = await startCleaningSession({
      organizationId: fixture.organization.id,
      employeeId: fixture.employee.id,
      actorUserId: fixture.user.id,
      locationId: fixture.location.id,
      startMethod: TapMethod.NFC,
    });

    const { session: completed, anomalies } = await completeCleaningSession({
      sessionId: session.id,
      organizationId: fixture.organization.id,
      actorUserId: fixture.user.id,
      endMethod: TapMethod.NFC,
    });

    // This test itself completes in well under 30 seconds of wall-clock time.
    expect(anomalies.some((a) => a.type === "TOO_SHORT")).toBe(true);
    expect(completed.status).toBe("COMPLETED"); // flagged, never blocked
    expect(completed.flagReason).toBeTruthy();
  });
});

describe("NFC token resolution", () => {
  let fixture: Awaited<ReturnType<typeof createTestOrgFixture>>;

  beforeAll(async () => {
    fixture = await createTestOrgFixture("tags");
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it("resolves an active tag's token to its location", async () => {
    const tag = await prisma.nFCTag.create({
      data: { organizationId: fixture.organization.id, token: "test-token-active", status: NfcTagStatus.ACTIVE, locationId: fixture.location.id },
    });
    const resolved = await resolveTagForTap(tag.token);
    expect(resolved.location?.id).toBe(fixture.location.id);
  });

  it("rejects an unknown token without leaking whether it ever existed", async () => {
    await expect(resolveTagForTap("this-token-does-not-exist")).rejects.toThrow();
  });

  it("rejects a disabled tag even if it has a valid location", async () => {
    const tag = await prisma.nFCTag.create({
      data: {
        organizationId: fixture.organization.id,
        token: "test-token-disabled",
        status: NfcTagStatus.DISABLED,
        locationId: fixture.location.id,
      },
    });
    await expect(resolveTagForTap(tag.token)).rejects.toThrow();
  });

  it("rejects a tag that has not been assigned to a location yet", async () => {
    const tag = await prisma.nFCTag.create({
      data: { organizationId: fixture.organization.id, token: "test-token-unassigned", status: NfcTagStatus.UNASSIGNED },
    });
    await expect(resolveTagForTap(tag.token)).rejects.toThrow();
  });
});
