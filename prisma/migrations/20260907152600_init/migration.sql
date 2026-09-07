-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('ORG_ADMIN', 'SITE_MANAGER', 'SUPERVISOR', 'CLEANER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "OrgPlan" AS ENUM ('STARTER', 'BUSINESS', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('HOTEL_ROOM', 'RESTROOM', 'LOBBY', 'OFFICE', 'KITCHEN', 'COMMON_AREA', 'CHANGING_ROOM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "TapMethod" AS ENUM ('NFC', 'QR', 'MANUAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ISSUE', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('NONE', 'INTERVAL_MINUTES', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "ChecklistItemType" AS ENUM ('CHECKBOX', 'YES_NO', 'TEXT', 'NUMBER', 'PHOTO');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('SUPPLY_MISSING', 'MAINTENANCE', 'DAMAGE', 'LOST_ITEM', 'EXCESSIVE_DIRT', 'BLOCKED_ACCESS', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "NfcTagStatus" AS ENUM ('UNASSIGNED', 'ACTIVE', 'DISABLED', 'REPLACED');

-- CreateEnum
CREATE TYPE "LocationVerification" AS ENUM ('OFF', 'OPTIONAL', 'REQUIRED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ISSUE_REPORTED', 'TASK_OVERDUE', 'LOCATION_OVERDUE', 'SESSION_EXCEEDED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('ISSUE_PHOTO', 'SESSION_PHOTO', 'LABEL', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "lastActiveOrganizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "OrgPlan" NOT NULL DEFAULT 'STARTER',
    "logoUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "locationVerification" "LocationVerification" NOT NULL DEFAULT 'OFF',
    "allowMultipleActiveSessions" BOOLEAN NOT NULL DEFAULT false,
    "dueSoonThresholdPercent" INTEGER NOT NULL DEFAULT 75,
    "dataRetentionDays" INTEGER NOT NULL DEFAULT 365,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipSiteAssignment" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,

    CONSTRAINT "MembershipSiteAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "operatingHoursStart" TEXT NOT NULL DEFAULT '00:00',
    "operatingHoursEnd" TEXT NOT NULL DEFAULT '23:59',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "areaId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "LocationType" NOT NULL DEFAULT 'CUSTOM',
    "targetDurationMinutes" INTEGER NOT NULL DEFAULT 15,
    "targetFrequencyMinutes" INTEGER NOT NULL DEFAULT 120,
    "operatingHoursStart" TEXT,
    "operatingHoursEnd" TEXT,
    "checklistTemplateId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NFCTag" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT,
    "token" TEXT NOT NULL,
    "status" "NfcTagStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "label" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "replacedByTagId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NFCTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT,
    "employeeCode" TEXT,
    "jobTitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "taskId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startMethod" "TapMethod" NOT NULL DEFAULT 'NFC',
    "endMethod" "TapMethod",
    "startLatitude" DOUBLE PRECISION,
    "startLongitude" DOUBLE PRECISION,
    "endLatitude" DOUBLE PRECISION,
    "endLongitude" DOUBLE PRECISION,
    "notes" TEXT,
    "flagReason" TEXT,
    "cancelledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveLocationLock" (
    "locationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActiveLocationLock_pkey" PRIMARY KEY ("locationId")
);

-- CreateTable
CREATE TABLE "CleaningTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "assignedEmployeeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3),
    "recurrenceType" "RecurrenceType" NOT NULL DEFAULT 'NONE',
    "recurrenceIntervalMinutes" INTEGER,
    "checklistTemplateId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistTemplateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "itemType" "ChecklistItemType" NOT NULL DEFAULT 'CHECKBOX',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistResponse" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "textValue" TEXT,
    "numberValue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sessionId" TEXT,
    "reportedByUserId" TEXT,
    "type" "IssueType" NOT NULL,
    "severity" "IssueSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "issueId" TEXT,
    "sessionId" TEXT,
    "type" "AttachmentType" NOT NULL DEFAULT 'OTHER',
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "previousValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "OrganizationMembership_organizationId_idx" ON "OrganizationMembership"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_idx" ON "OrganizationMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_userId_organizationId_key" ON "OrganizationMembership"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "MembershipSiteAssignment_siteId_idx" ON "MembershipSiteAssignment"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipSiteAssignment_membershipId_siteId_key" ON "MembershipSiteAssignment"("membershipId", "siteId");

-- CreateIndex
CREATE INDEX "Site_organizationId_idx" ON "Site"("organizationId");

-- CreateIndex
CREATE INDEX "Area_siteId_idx" ON "Area"("siteId");

-- CreateIndex
CREATE INDEX "Location_organizationId_idx" ON "Location"("organizationId");

-- CreateIndex
CREATE INDEX "Location_siteId_idx" ON "Location"("siteId");

-- CreateIndex
CREATE INDEX "Location_areaId_idx" ON "Location"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_siteId_code_key" ON "Location"("siteId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "NFCTag_token_key" ON "NFCTag"("token");

-- CreateIndex
CREATE UNIQUE INDEX "NFCTag_replacedByTagId_key" ON "NFCTag"("replacedByTagId");

-- CreateIndex
CREATE INDEX "NFCTag_organizationId_idx" ON "NFCTag"("organizationId");

-- CreateIndex
CREATE INDEX "NFCTag_locationId_idx" ON "NFCTag"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_userId_key" ON "EmployeeProfile"("userId");

-- CreateIndex
CREATE INDEX "EmployeeProfile_organizationId_idx" ON "EmployeeProfile"("organizationId");

-- CreateIndex
CREATE INDEX "EmployeeProfile_siteId_idx" ON "EmployeeProfile"("siteId");

-- CreateIndex
CREATE INDEX "CleaningSession_organizationId_idx" ON "CleaningSession"("organizationId");

-- CreateIndex
CREATE INDEX "CleaningSession_siteId_idx" ON "CleaningSession"("siteId");

-- CreateIndex
CREATE INDEX "CleaningSession_locationId_idx" ON "CleaningSession"("locationId");

-- CreateIndex
CREATE INDEX "CleaningSession_employeeId_idx" ON "CleaningSession"("employeeId");

-- CreateIndex
CREATE INDEX "CleaningSession_status_idx" ON "CleaningSession"("status");

-- CreateIndex
CREATE INDEX "CleaningSession_locationId_status_idx" ON "CleaningSession"("locationId", "status");

-- CreateIndex
CREATE INDEX "CleaningSession_startedAt_idx" ON "CleaningSession"("startedAt");

-- CreateIndex
CREATE INDEX "CleaningSession_completedAt_idx" ON "CleaningSession"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveLocationLock_sessionId_key" ON "ActiveLocationLock"("sessionId");

-- CreateIndex
CREATE INDEX "CleaningTask_organizationId_idx" ON "CleaningTask"("organizationId");

-- CreateIndex
CREATE INDEX "CleaningTask_siteId_idx" ON "CleaningTask"("siteId");

-- CreateIndex
CREATE INDEX "CleaningTask_locationId_idx" ON "CleaningTask"("locationId");

-- CreateIndex
CREATE INDEX "CleaningTask_assignedEmployeeId_idx" ON "CleaningTask"("assignedEmployeeId");

-- CreateIndex
CREATE INDEX "CleaningTask_status_idx" ON "CleaningTask"("status");

-- CreateIndex
CREATE INDEX "CleaningTask_dueAt_idx" ON "CleaningTask"("dueAt");

-- CreateIndex
CREATE INDEX "ChecklistTemplate_organizationId_idx" ON "ChecklistTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "ChecklistItem_checklistTemplateId_idx" ON "ChecklistItem"("checklistTemplateId");

-- CreateIndex
CREATE INDEX "ChecklistResponse_sessionId_idx" ON "ChecklistResponse"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistResponse_sessionId_checklistItemId_key" ON "ChecklistResponse"("sessionId", "checklistItemId");

-- CreateIndex
CREATE INDEX "Issue_organizationId_idx" ON "Issue"("organizationId");

-- CreateIndex
CREATE INDEX "Issue_siteId_idx" ON "Issue"("siteId");

-- CreateIndex
CREATE INDEX "Issue_locationId_idx" ON "Issue"("locationId");

-- CreateIndex
CREATE INDEX "Issue_status_idx" ON "Issue"("status");

-- CreateIndex
CREATE INDEX "Issue_severity_idx" ON "Issue"("severity");

-- CreateIndex
CREATE INDEX "Issue_createdAt_idx" ON "Issue"("createdAt");

-- CreateIndex
CREATE INDEX "Attachment_organizationId_idx" ON "Attachment"("organizationId");

-- CreateIndex
CREATE INDEX "Attachment_issueId_idx" ON "Attachment"("issueId");

-- CreateIndex
CREATE INDEX "Attachment_sessionId_idx" ON "Attachment"("sessionId");

-- CreateIndex
CREATE INDEX "Notification_organizationId_idx" ON "Notification"("organizationId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipSiteAssignment" ADD CONSTRAINT "MembershipSiteAssignment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganizationMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipSiteAssignment" ADD CONSTRAINT "MembershipSiteAssignment_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_checklistTemplateId_fkey" FOREIGN KEY ("checklistTemplateId") REFERENCES "ChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NFCTag" ADD CONSTRAINT "NFCTag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NFCTag" ADD CONSTRAINT "NFCTag_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NFCTag" ADD CONSTRAINT "NFCTag_replacedByTagId_fkey" FOREIGN KEY ("replacedByTagId") REFERENCES "NFCTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningSession" ADD CONSTRAINT "CleaningSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningSession" ADD CONSTRAINT "CleaningSession_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningSession" ADD CONSTRAINT "CleaningSession_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningSession" ADD CONSTRAINT "CleaningSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningSession" ADD CONSTRAINT "CleaningSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CleaningTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningTask" ADD CONSTRAINT "CleaningTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningTask" ADD CONSTRAINT "CleaningTask_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningTask" ADD CONSTRAINT "CleaningTask_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningTask" ADD CONSTRAINT "CleaningTask_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningTask" ADD CONSTRAINT "CleaningTask_checklistTemplateId_fkey" FOREIGN KEY ("checklistTemplateId") REFERENCES "ChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningTask" ADD CONSTRAINT "CleaningTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistTemplateId_fkey" FOREIGN KEY ("checklistTemplateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistResponse" ADD CONSTRAINT "ChecklistResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CleaningSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistResponse" ADD CONSTRAINT "ChecklistResponse_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CleaningSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CleaningSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
