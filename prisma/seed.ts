import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  OrgRole,
  LocationType,
  IssueType,
  IssueSeverity,
  IssueStatus,
  TaskStatus,
  TaskPriority,
  SessionStatus,
  TapMethod,
  NfcTagStatus,
} from "../src/generated/prisma/enums";
import { randomBytes } from "crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "cleantap123";

function secureToken(): string {
  return randomBytes(32).toString("base64url");
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log("Seeding CleanTap demo data...\n");

  // ---------------------------------------------------------------------
  // Users, organization, memberships
  // ---------------------------------------------------------------------
  const passwordHash = await hash(DEMO_PASSWORD);

  const superAdmin = await prisma.user.upsert({
    where: { email: "super@cleantap.app" },
    update: {},
    create: { email: "super@cleantap.app", name: "Platform Admin", passwordHash, isSuperAdmin: true },
  });

  const orgAdminUser = await prisma.user.upsert({
    where: { email: "admin@cleanco.com" },
    update: {},
    create: { email: "admin@cleanco.com", name: "Elena Torres", passwordHash },
  });

  const siteManagerUser = await prisma.user.upsert({
    where: { email: "manager@cleanco.com" },
    update: {},
    create: { email: "manager@cleanco.com", name: "Javier Ortega", passwordHash },
  });

  const supervisorUser = await prisma.user.upsert({
    where: { email: "supervisor@cleanco.com" },
    update: {},
    create: { email: "supervisor@cleanco.com", name: "Carmen Ruiz", passwordHash },
  });

  const cleanerNames = ["Maria López", "Ana Ruiz", "Laura Sánchez", "Carlos Martín", "Sofia Fernández"];
  const cleanerUsers = await Promise.all(
    cleanerNames.map((name, i) =>
      prisma.user.upsert({
        where: { email: `cleaner${i + 1}@cleanco.com` },
        update: {},
        create: { email: `cleaner${i + 1}@cleanco.com`, name, passwordHash },
      }),
    ),
  );

  let organization = await prisma.organization.findUnique({ where: { slug: "cleanco-facilities" } });
  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: "CleanCo Facilities",
        slug: "cleanco-facilities",
        plan: "BUSINESS",
        locationVerification: "OPTIONAL",
        dueSoonThresholdPercent: 75,
      },
    });
  }
  const orgId = organization.id;

  await prisma.user.update({ where: { id: orgAdminUser.id }, data: { lastActiveOrganizationId: orgId } });

  async function ensureMembership(userId: string, role: OrgRole) {
    return prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      update: {},
      create: { userId, organizationId: orgId, role },
    });
  }

  await ensureMembership(orgAdminUser.id, OrgRole.ORG_ADMIN);
  const siteManagerMembership = await ensureMembership(siteManagerUser.id, OrgRole.SITE_MANAGER);
  const supervisorMembership = await ensureMembership(supervisorUser.id, OrgRole.SUPERVISOR);

  // ---------------------------------------------------------------------
  // Sites
  // ---------------------------------------------------------------------
  async function ensureSite(name: string, city: string, hoursStart: string, hoursEnd: string) {
    const existing = await prisma.site.findFirst({ where: { organizationId: orgId, name } });
    if (existing) return existing;
    return prisma.site.create({
      data: { organizationId: orgId, name, city, country: "Spain", operatingHoursStart: hoursStart, operatingHoursEnd: hoursEnd },
    });
  }

  const hotel = await ensureSite("Grand Hotel Madrid", "Madrid", "00:00", "23:59");
  const airport = await ensureSite("Madrid Airport Terminal 2", "Madrid", "05:00", "23:59");
  const mall = await ensureSite("Central Shopping Centre", "Madrid", "09:00", "22:00");

  await prisma.membershipSiteAssignment.upsert({
    where: { membershipId_siteId: { membershipId: siteManagerMembership.id, siteId: hotel.id } },
    update: {},
    create: { membershipId: siteManagerMembership.id, siteId: hotel.id },
  });
  await prisma.membershipSiteAssignment.upsert({
    where: { membershipId_siteId: { membershipId: supervisorMembership.id, siteId: airport.id } },
    update: {},
    create: { membershipId: supervisorMembership.id, siteId: airport.id },
  });

  // ---------------------------------------------------------------------
  // Checklist templates
  // ---------------------------------------------------------------------
  async function ensureChecklist(name: string, description: string, items: { label: string; isRequired: boolean }[]) {
    const existing = await prisma.checklistTemplate.findFirst({ where: { organizationId: orgId, name } });
    if (existing) return existing;
    return prisma.checklistTemplate.create({
      data: {
        organizationId: orgId,
        name,
        description,
        items: { create: items.map((item, i) => ({ label: item.label, isRequired: item.isRequired, sortOrder: i })) },
      },
    });
  }

  const bathroomChecklist = await ensureChecklist("Public Bathroom Standard", "Standard checklist for public restrooms", [
    { label: "Empty bins", isRequired: true },
    { label: "Clean toilets", isRequired: true },
    { label: "Clean sinks", isRequired: true },
    { label: "Clean mirrors", isRequired: false },
    { label: "Mop floor", isRequired: true },
    { label: "Refill soap", isRequired: true },
    { label: "Refill toilet paper", isRequired: true },
    { label: "Refill hand towels", isRequired: false },
  ]);

  const roomChecklist = await ensureChecklist("Hotel Room Standard", "Standard checklist for hotel room turnover", [
    { label: "Make bed", isRequired: true },
    { label: "Vacuum floor", isRequired: true },
    { label: "Clean bathroom", isRequired: true },
    { label: "Restock minibar", isRequired: false },
    { label: "Empty trash", isRequired: true },
    { label: "Dust surfaces", isRequired: false },
  ]);

  const commonAreaChecklist = await ensureChecklist("Common Area Standard", "Standard checklist for lobbies and common areas", [
    { label: "Empty bins", isRequired: true },
    { label: "Sweep / mop floor", isRequired: true },
    { label: "Wipe surfaces", isRequired: true },
    { label: "Straighten seating", isRequired: false },
  ]);

  // ---------------------------------------------------------------------
  // Locations
  // ---------------------------------------------------------------------
  interface LocationSeed {
    site: typeof hotel;
    name: string;
    code: string;
    type: LocationType;
    targetDurationMinutes: number;
    targetFrequencyMinutes: number;
    checklistTemplateId: string | null;
  }

  const locationSeeds: LocationSeed[] = [];

  // Grand Hotel Madrid: 3 floors, 6 rooms + 2 restrooms each, plus a lobby.
  locationSeeds.push({
    site: hotel,
    name: "Lobby",
    code: "LOBBY",
    type: LocationType.LOBBY,
    targetDurationMinutes: 20,
    targetFrequencyMinutes: 120,
    checklistTemplateId: commonAreaChecklist.id,
  });
  for (let floor = 1; floor <= 3; floor++) {
    for (let room = 1; room <= 6; room++) {
      const num = floor * 100 + room;
      locationSeeds.push({
        site: hotel,
        name: `Room ${num}`,
        code: String(num),
        type: LocationType.HOTEL_ROOM,
        targetDurationMinutes: 25,
        targetFrequencyMinutes: 1440,
        checklistTemplateId: roomChecklist.id,
      });
    }
    for (const gender of ["Male", "Female"]) {
      locationSeeds.push({
        site: hotel,
        name: `${gender} Restroom Floor ${floor}`,
        code: `WC-${gender[0]}-${floor}`,
        type: LocationType.RESTROOM,
        targetDurationMinutes: 12,
        targetFrequencyMinutes: 60,
        checklistTemplateId: bathroomChecklist.id,
      });
    }
  }

  // Madrid Airport Terminal 2
  for (const zone of ["Gate A", "Gate B", "Gate C", "Arrivals", "Departures"]) {
    locationSeeds.push({
      site: airport,
      name: `${zone} Restroom`,
      code: `AIR-${zone.replace(/\s+/g, "").toUpperCase()}`,
      type: LocationType.RESTROOM,
      targetDurationMinutes: 15,
      targetFrequencyMinutes: 45,
      checklistTemplateId: bathroomChecklist.id,
    });
  }
  locationSeeds.push(
    { site: airport, name: "Main Waiting Area", code: "AIR-WAIT", type: LocationType.COMMON_AREA, targetDurationMinutes: 20, targetFrequencyMinutes: 90, checklistTemplateId: commonAreaChecklist.id },
    { site: airport, name: "Food Court", code: "AIR-FOOD", type: LocationType.COMMON_AREA, targetDurationMinutes: 25, targetFrequencyMinutes: 60, checklistTemplateId: commonAreaChecklist.id },
  );

  // Central Shopping Centre
  for (let floor = 0; floor <= 2; floor++) {
    for (const gender of ["Male", "Female"]) {
      locationSeeds.push({
        site: mall,
        name: `${gender} Restroom Floor ${floor}`,
        code: `MALL-WC-${gender[0]}-${floor}`,
        type: LocationType.RESTROOM,
        targetDurationMinutes: 15,
        targetFrequencyMinutes: 60,
        checklistTemplateId: bathroomChecklist.id,
      });
    }
  }
  locationSeeds.push(
    { site: mall, name: "Main Entrance", code: "MALL-ENTRANCE", type: LocationType.COMMON_AREA, targetDurationMinutes: 15, targetFrequencyMinutes: 90, checklistTemplateId: commonAreaChecklist.id },
    { site: mall, name: "Food Court", code: "MALL-FOOD", type: LocationType.COMMON_AREA, targetDurationMinutes: 30, targetFrequencyMinutes: 60, checklistTemplateId: commonAreaChecklist.id },
  );

  const locations = [];
  for (const seed of locationSeeds) {
    let location = await prisma.location.findUnique({ where: { siteId_code: { siteId: seed.site.id, code: seed.code } } });
    if (!location) {
      location = await prisma.location.create({
        data: {
          organizationId: orgId,
          siteId: seed.site.id,
          name: seed.name,
          code: seed.code,
          type: seed.type,
          targetDurationMinutes: seed.targetDurationMinutes,
          targetFrequencyMinutes: seed.targetFrequencyMinutes,
          checklistTemplateId: seed.checklistTemplateId,
        },
      });
    }
    locations.push(location);
  }
  console.log(`Locations: ${locations.length}`);

  // ---------------------------------------------------------------------
  // NFC tags — assign to most locations, leave a handful unassigned.
  // ---------------------------------------------------------------------
  const existingTagCount = await prisma.nFCTag.count({ where: { organizationId: orgId } });
  if (existingTagCount === 0) {
    for (let i = 0; i < locations.length; i++) {
      const shouldAssign = i % 9 !== 0; // ~89% assigned, rest left unassigned for the demo
      await prisma.nFCTag.create({
        data: {
          organizationId: orgId,
          token: secureToken(),
          status: shouldAssign ? NfcTagStatus.ACTIVE : NfcTagStatus.UNASSIGNED,
          locationId: shouldAssign ? locations[i].id : null,
        },
      });
    }
    // One disabled/lost tag for the demo.
    await prisma.nFCTag.create({ data: { organizationId: orgId, token: secureToken(), status: NfcTagStatus.DISABLED, label: "Lost tag — Floor 2" } });
  }

  // ---------------------------------------------------------------------
  // Employee profiles
  // ---------------------------------------------------------------------
  const siteForCleaner = [hotel, hotel, hotel, mall, mall];
  const employees = [];
  for (let i = 0; i < cleanerUsers.length; i++) {
    await ensureMembership(cleanerUsers[i].id, OrgRole.CLEANER);
    let profile = await prisma.employeeProfile.findFirst({ where: { userId: cleanerUsers[i].id, organizationId: orgId } });
    if (!profile) {
      profile = await prisma.employeeProfile.create({
        data: {
          userId: cleanerUsers[i].id,
          organizationId: orgId,
          siteId: siteForCleaner[i].id,
          employeeCode: `EMP-00${i + 1}`,
          jobTitle: "Housekeeping",
          hiredAt: new Date(Date.now() - randomInt(60, 400) * 24 * 60 * 60 * 1000),
        },
      });
    }
    employees.push(profile);
  }
  // A sixth cleaner at the airport for coverage.
  const airportCleanerUser = await prisma.user.upsert({
    where: { email: "cleaner6@cleanco.com" },
    update: {},
    create: { email: "cleaner6@cleanco.com", name: "Diego Navarro", passwordHash },
  });
  await ensureMembership(airportCleanerUser.id, OrgRole.CLEANER);
  let airportEmployee = await prisma.employeeProfile.findFirst({ where: { userId: airportCleanerUser.id, organizationId: orgId } });
  if (!airportEmployee) {
    airportEmployee = await prisma.employeeProfile.create({
      data: { userId: airportCleanerUser.id, organizationId: orgId, siteId: airport.id, employeeCode: "EMP-006", jobTitle: "Housekeeping" },
    });
  }
  employees.push(airportEmployee);

  console.log(`Employees: ${employees.length}`);

  // ---------------------------------------------------------------------
  // Historical cleaning sessions (last 30 days) — skip if already seeded.
  // ---------------------------------------------------------------------
  const existingSessionCount = await prisma.cleaningSession.count({ where: { organizationId: orgId } });
  if (existingSessionCount === 0) {
    console.log("Generating 30 days of cleaning history...");
    const locationsBySite = new Map<string, typeof locations>();
    for (const loc of locations) locationsBySite.set(loc.siteId, [...(locationsBySite.get(loc.siteId) ?? []), loc]);

    const employeesBySite = new Map<string, typeof employees>();
    for (const emp of employees) {
      if (!emp.siteId) continue;
      employeesBySite.set(emp.siteId, [...(employeesBySite.get(emp.siteId) ?? []), emp]);
    }

    let totalSessions = 0;
    const now = new Date();

    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
      const day = new Date(now);
      day.setDate(day.getDate() - dayOffset);

      for (const site of [hotel, airport, mall]) {
        const siteLocations = locationsBySite.get(site.id) ?? [];
        const siteEmployees = employeesBySite.get(site.id) ?? [];
        if (siteEmployees.length === 0) continue;

        const sessionsToday = randomInt(3, 6) * siteEmployees.length;
        for (let s = 0; s < sessionsToday; s++) {
          const location = pick(siteLocations);
          const employee = pick(siteEmployees);
          const hour = randomInt(7, 21);
          const minute = randomInt(0, 59);
          const startedAt = new Date(day);
          startedAt.setHours(hour, minute, 0, 0);
          if (startedAt > now) continue;

          const target = location.targetDurationMinutes;
          const variance = Math.random();
          let durationSeconds: number;
          if (variance < 0.08) durationSeconds = randomInt(10, 25); // anomaly: too short
          else if (variance < 0.15) durationSeconds = Math.round(target * 60 * randomInt(3, 4)); // anomaly: too long
          else durationSeconds = Math.round(target * 60 * (0.7 + Math.random() * 0.6)); // normal spread

          const completedAt = new Date(startedAt.getTime() + durationSeconds * 1000);
          const isCancelled = Math.random() < 0.02;

          await prisma.cleaningSession.create({
            data: {
              organizationId: orgId,
              siteId: site.id,
              locationId: location.id,
              employeeId: employee.id,
              startedAt,
              completedAt,
              durationSeconds: isCancelled ? null : durationSeconds,
              status: isCancelled ? SessionStatus.CANCELLED : SessionStatus.COMPLETED,
              startMethod: Math.random() < 0.85 ? TapMethod.NFC : TapMethod.QR,
              endMethod: Math.random() < 0.85 ? TapMethod.NFC : TapMethod.QR,
              cancelledReason: isCancelled ? "Accidental tap" : null,
              flagReason: variance < 0.08 ? "Session lasted under 30s — review recommended." : variance < 0.15 ? `Session lasted over 3x the target duration (${target}m) — review recommended.` : null,
            },
          });
          totalSessions++;
        }
      }
    }
    console.log(`Cleaning sessions created: ${totalSessions}`);

    // A couple of active (in-progress) sessions right now, for the live demo.
    const liveLocation1 = locationsBySite.get(hotel.id)!.find((l) => l.type === LocationType.HOTEL_ROOM)!;
    const liveEmployee1 = employeesBySite.get(hotel.id)![0];
    const activeStarted1 = new Date(Date.now() - 6 * 60 * 1000);
    const session1Id = crypto.randomUUID();
    await prisma.activeLocationLock.create({ data: { locationId: liveLocation1.id, sessionId: session1Id, employeeId: liveEmployee1.id } });
    await prisma.cleaningSession.create({
      data: { id: session1Id, organizationId: orgId, siteId: hotel.id, locationId: liveLocation1.id, employeeId: liveEmployee1.id, startedAt: activeStarted1, status: SessionStatus.ACTIVE, startMethod: TapMethod.NFC },
    });

    const liveLocation2 = locationsBySite.get(hotel.id)!.find((l) => l.type === LocationType.RESTROOM)!;
    const liveEmployee2 = employeesBySite.get(hotel.id)![1];
    const activeStarted2 = new Date(Date.now() - 3 * 60 * 1000);
    const session2Id = crypto.randomUUID();
    await prisma.activeLocationLock.create({ data: { locationId: liveLocation2.id, sessionId: session2Id, employeeId: liveEmployee2.id } });
    await prisma.cleaningSession.create({
      data: { id: session2Id, organizationId: orgId, siteId: hotel.id, locationId: liveLocation2.id, employeeId: liveEmployee2.id, startedAt: activeStarted2, status: SessionStatus.ACTIVE, startMethod: TapMethod.NFC },
    });
    console.log("Active sessions created for live demo: 2");
  } else {
    console.log("Cleaning sessions already exist — skipping history generation.");
  }

  // ---------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------
  const existingTaskCount = await prisma.cleaningTask.count({ where: { organizationId: orgId } });
  if (existingTaskCount === 0) {
    const taskSeeds = [
      { location: locations.find((l) => l.code === "LOBBY")!, title: "Deep clean lobby carpets", priority: TaskPriority.NORMAL, dueInHours: 6 },
      { location: locations.find((l) => l.code === "AIR-FOOD")!, title: "Extra sanitation pass — food court", priority: TaskPriority.HIGH, dueInHours: 2 },
      { location: locations.find((l) => l.code === "MALL-ENTRANCE")!, title: "Polish entrance glass doors", priority: TaskPriority.LOW, dueInHours: 24 },
      { location: locations.find((l) => l.code === "301")!, title: "VIP checkout turnover", priority: TaskPriority.URGENT, dueInHours: 1 },
      { location: locations.find((l) => l.code === "WC-M-2")!, title: "Restock supplies", priority: TaskPriority.NORMAL, dueInHours: -2 },
    ];
    for (const seed of taskSeeds) {
      if (!seed.location) continue;
      const dueAt = new Date(Date.now() + seed.dueInHours * 60 * 60 * 1000);
      await prisma.cleaningTask.create({
        data: {
          organizationId: orgId,
          siteId: seed.location.siteId,
          locationId: seed.location.id,
          title: seed.title,
          priority: seed.priority,
          status: seed.dueInHours < 0 ? TaskStatus.OVERDUE : TaskStatus.PENDING,
          dueAt,
          createdById: orgAdminUser.id,
          assignedEmployeeId: pick(employees).id,
        },
      });
    }
    console.log(`Tasks created: ${taskSeeds.length}`);
  }

  // ---------------------------------------------------------------------
  // Issues
  // ---------------------------------------------------------------------
  const existingIssueCount = await prisma.issue.count({ where: { organizationId: orgId } });
  if (existingIssueCount === 0) {
    const issueSeeds: { location: (typeof locations)[number]; type: IssueType; severity: IssueSeverity; description: string; status: IssueStatus }[] = [
      { location: locations.find((l) => l.code === "WC-M-2")!, type: IssueType.SUPPLY_MISSING, severity: IssueSeverity.LOW, description: "Soap dispenser is empty.", status: IssueStatus.OPEN },
      { location: locations.find((l) => l.code === "WC-F-1")!, type: IssueType.MAINTENANCE, severity: IssueSeverity.HIGH, description: "Toilet handle is broken and won't flush.", status: IssueStatus.OPEN },
      { location: locations.find((l) => l.code === "AIR-GATEB")!, type: IssueType.SECURITY, severity: IssueSeverity.CRITICAL, description: "Unattended bag found near the entrance.", status: IssueStatus.ACKNOWLEDGED },
      { location: locations.find((l) => l.code === "201")!, type: IssueType.DAMAGE, severity: IssueSeverity.MEDIUM, description: "Water stain on the ceiling near the window.", status: IssueStatus.IN_PROGRESS },
      { location: locations.find((l) => l.code === "MALL-FOOD")!, type: IssueType.EXCESSIVE_DIRT, severity: IssueSeverity.MEDIUM, description: "Spilled drink across several tables.", status: IssueStatus.RESOLVED },
      { location: locations.find((l) => l.code === "LOBBY")!, type: IssueType.LOST_ITEM, severity: IssueSeverity.LOW, description: "Found a set of keys under the sofa.", status: IssueStatus.RESOLVED },
      { location: locations.find((l) => l.code === "AIR-ARRIVALS")!, type: IssueType.BLOCKED_ACCESS, severity: IssueSeverity.MEDIUM, description: "Cleaning cart blocking the accessible stall.", status: IssueStatus.DISMISSED },
      { location: locations.find((l) => l.code === "WC-F-3")!, type: IssueType.OTHER, severity: IssueSeverity.LOW, description: "Air freshener unit needs a new battery.", status: IssueStatus.OPEN },
    ];

    for (const seed of issueSeeds) {
      if (!seed.location) continue;
      const reporter = pick([...cleanerUsers, airportCleanerUser]);
      await prisma.issue.create({
        data: {
          organizationId: orgId,
          siteId: seed.location.siteId,
          locationId: seed.location.id,
          reportedByUserId: reporter.id,
          type: seed.type,
          severity: seed.severity,
          description: seed.description,
          status: seed.status,
          resolvedAt: seed.status === IssueStatus.RESOLVED || seed.status === IssueStatus.DISMISSED ? new Date() : null,
          resolvedByUserId: seed.status === IssueStatus.RESOLVED || seed.status === IssueStatus.DISMISSED ? orgAdminUser.id : null,
        },
      });
    }
    console.log(`Issues created: ${issueSeeds.filter((s) => s.location).length}`);
  }

  console.log("\nSeed complete.\n");
  console.log("Demo credentials (password for all: " + DEMO_PASSWORD + ")");
  console.log("  Super admin:    super@cleantap.app");
  console.log("  Org admin:      admin@cleanco.com");
  console.log("  Site manager:   manager@cleanco.com");
  console.log("  Supervisor:     supervisor@cleanco.com");
  console.log("  Cleaner:        cleaner1@cleanco.com  (Maria López)");
  console.log("  Cleaner:        cleaner2@cleanco.com  (Ana Ruiz)");
  console.log("  ...cleaner3..6@cleanco.com follow the same pattern.\n");
  void superAdmin;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
