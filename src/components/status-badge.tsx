import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/constants";
import type { LocationOperationalStatus } from "@/lib/sla";
import { STATUS_LABELS } from "@/lib/sla";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-status-clean-bg text-status-clean",
  info: "bg-status-cleaning-bg text-status-cleaning",
  warning: "bg-status-due-soon-bg text-status-due-soon",
  danger: "bg-status-overdue-bg text-status-overdue",
  purple: "bg-accent text-accent-foreground",
  neutral: "bg-status-unavailable-bg text-status-unavailable",
};

const TONE_DOT_CLASSES: Record<Tone, string> = {
  success: "bg-status-clean",
  info: "bg-status-cleaning",
  warning: "bg-status-due-soon",
  danger: "bg-status-overdue",
  purple: "bg-accent-foreground",
  neutral: "bg-status-unavailable",
};

function ToneBadge({ tone, children, className, dot = true }: { tone: Tone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap w-fit",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", TONE_DOT_CLASSES[tone])} aria-hidden />}
      {children}
    </span>
  );
}

const LOCATION_STATUS_TONE: Record<LocationOperationalStatus, Tone> = {
  CLEAN: "success",
  CLEANING: "info",
  DUE_SOON: "warning",
  OVERDUE: "danger",
  ISSUE: "danger",
  UNAVAILABLE: "neutral",
  NEVER_CLEANED: "neutral",
};

export function LocationStatusBadge({ status, className }: { status: LocationOperationalStatus; className?: string }) {
  return (
    <ToneBadge tone={LOCATION_STATUS_TONE[status]} className={className}>
      {STATUS_LABELS[status]}
    </ToneBadge>
  );
}

export function StatusDot({ status, className }: { status: LocationOperationalStatus; className?: string }) {
  return <span className={cn("inline-block size-2.5 rounded-full", TONE_DOT_CLASSES[LOCATION_STATUS_TONE[status]], className)} aria-hidden />;
}

export { ToneBadge };
