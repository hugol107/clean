import {
  LocationType,
  IssueType,
  IssueSeverity,
  IssueStatus,
  TaskStatus,
  TaskPriority,
  NfcTagStatus,
  SessionStatus,
  ChecklistItemType,
  OrgPlan,
  LocationVerification,
  RecurrenceType,
} from "@/generated/prisma/enums";

export const APP_NAME = process.env.APP_NAME || "CleanTap";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "purple";

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  HOTEL_ROOM: "Hotel Room",
  RESTROOM: "Restroom",
  LOBBY: "Lobby",
  OFFICE: "Office",
  KITCHEN: "Kitchen",
  COMMON_AREA: "Common Area",
  CHANGING_ROOM: "Changing Room",
  CUSTOM: "Custom",
};

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  SUPPLY_MISSING: "Supply missing",
  MAINTENANCE: "Maintenance / breakdown",
  DAMAGE: "Damage",
  LOST_ITEM: "Lost item",
  EXCESSIVE_DIRT: "Excessive dirt",
  BLOCKED_ACCESS: "Blocked access",
  SECURITY: "Security concern",
  OTHER: "Other",
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const ISSUE_SEVERITY_TONE: Record<IssueSeverity, Tone> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "danger",
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  OPEN: "Open",
  ACKNOWLEDGED: "Acknowledged",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

export const ISSUE_STATUS_TONE: Record<IssueStatus, Tone> = {
  OPEN: "danger",
  ACKNOWLEDGED: "warning",
  IN_PROGRESS: "info",
  RESOLVED: "success",
  DISMISSED: "neutral",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  ISSUE: "Issue",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

export const TASK_STATUS_TONE: Record<TaskStatus, Tone> = {
  PENDING: "neutral",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  ISSUE: "danger",
  OVERDUE: "danger",
  CANCELLED: "neutral",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export const TASK_PRIORITY_TONE: Record<TaskPriority, Tone> = {
  LOW: "neutral",
  NORMAL: "info",
  HIGH: "warning",
  URGENT: "danger",
};

export const NFC_TAG_STATUS_LABELS: Record<NfcTagStatus, string> = {
  UNASSIGNED: "Unassigned",
  ACTIVE: "Active",
  DISABLED: "Disabled",
  REPLACED: "Replaced",
};

export const NFC_TAG_STATUS_TONE: Record<NfcTagStatus, Tone> = {
  UNASSIGNED: "neutral",
  ACTIVE: "success",
  DISABLED: "danger",
  REPLACED: "neutral",
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  ACTIVE: "Cleaning",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  FLAGGED: "Flagged",
};

export const CHECKLIST_ITEM_TYPE_LABELS: Record<ChecklistItemType, string> = {
  CHECKBOX: "Checkbox",
  YES_NO: "Yes / No",
  TEXT: "Text note",
  NUMBER: "Numeric measurement",
  PHOTO: "Photo required",
};

export const ORG_PLAN_LABELS: Record<OrgPlan, string> = {
  STARTER: "Starter",
  BUSINESS: "Business",
  ENTERPRISE: "Enterprise",
};

/** Soft, non-enforced usage guidance per plan (Phase 3: real billing/limits). */
export const ORG_PLAN_LIMITS: Record<OrgPlan, { sites: number; locations: number; employees: number; monthlySessions: number; analyticsRetentionDays: number }> = {
  STARTER: { sites: 1, locations: 25, employees: 15, monthlySessions: 1500, analyticsRetentionDays: 30 },
  BUSINESS: { sites: 10, locations: 500, employees: 250, monthlySessions: 50000, analyticsRetentionDays: 180 },
  ENTERPRISE: { sites: Infinity, locations: Infinity, employees: Infinity, monthlySessions: Infinity, analyticsRetentionDays: 730 },
};

export const LOCATION_VERIFICATION_LABELS: Record<LocationVerification, string> = {
  OFF: "Off — never request GPS",
  OPTIONAL: "Optional — worker may share GPS",
  REQUIRED: "Required — GPS needed to Tap In/Out",
};

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  NONE: "One-time",
  INTERVAL_MINUTES: "Every N minutes",
  DAILY: "Daily",
  WEEKLY: "Weekly",
};

export const ISSUE_TYPE_OPTIONS = Object.entries(ISSUE_TYPE_LABELS).map(([value, label]) => ({ value, label }));
export const LOCATION_TYPE_OPTIONS = Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export const DATE_RANGE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom range" },
] as const;

export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number]["value"];
