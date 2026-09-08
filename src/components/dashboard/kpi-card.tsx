import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
  className?: string;
}) {
  const toneClasses = {
    default: "text-foreground",
    success: "text-status-clean",
    warning: "text-status-due-soon",
    danger: "text-status-overdue",
  } as const;

  const chipClasses = {
    default: "bg-accent text-accent-foreground",
    success: "bg-status-clean-bg text-status-clean",
    warning: "bg-status-due-soon-bg text-status-due-soon",
    danger: "bg-status-overdue-bg text-status-overdue",
  } as const;

  return (
    <Card className={cn("card-hover gap-2 py-5", className)}>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className={cn("text-[1.75rem] leading-none font-bold tracking-tight tabular-nums", toneClasses[tone])}>{value}</span>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
        {Icon && (
          <div className={cn("rounded-lg p-2", chipClasses[tone])}>
            <Icon className="size-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
