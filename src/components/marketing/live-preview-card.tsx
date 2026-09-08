import { cn } from "@/lib/utils";

const ROWS = [
  { label: "Lobby Restroom — 2F", status: "Cleaning now", tone: "cleaning", live: true },
  { label: "Gate B12 Restroom", status: "Clean · 4m ago", tone: "clean", live: false },
  { label: "Food Court — Zone A", status: "Due in 6 min", tone: "due-soon", live: false },
  { label: "Executive Lounge", status: "Overdue 12m", tone: "overdue", live: false },
] as const;

const DOT: Record<string, string> = {
  cleaning: "bg-status-cleaning",
  clean: "bg-status-clean",
  "due-soon": "bg-status-due-soon",
  overdue: "bg-status-overdue",
};
const TEXT: Record<string, string> = {
  cleaning: "text-status-cleaning",
  clean: "text-status-clean",
  "due-soon": "text-status-due-soon",
  overdue: "text-status-overdue",
};

const BARS = [45, 70, 55, 90, 65, 100, 75];

/** A static, CSS-only mockup of the live-operations view — gives the
 * marketing hero a real product moment instead of a gradient blob, with
 * zero client JS (every "live" cue is a CSS animation, not timed state). */
export function LivePreviewCard({ className }: { className?: string }) {
  return (
    <div className={cn("animate-float w-full max-w-sm rounded-2xl border bg-card p-4 shadow-2xl", className)}>
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-status-overdue/70" />
          <span className="size-2.5 rounded-full bg-status-due-soon/70" />
          <span className="size-2.5 rounded-full bg-status-clean/70" />
        </div>
        <span className="bg-status-overdue-bg text-status-overdue flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold">
          <span className="relative flex size-1.5">
            <span className="bg-status-overdue absolute inline-flex size-full animate-ping rounded-full opacity-75" />
            <span className="bg-status-overdue relative inline-flex size-1.5 rounded-full" />
          </span>
          LIVE
        </span>
      </div>
      <div className="flex flex-col divide-y">
        {ROWS.map((row) => (
          <div key={row.label} className="flex items-center gap-3 py-3">
            <span className={cn("size-2.5 shrink-0 rounded-full", DOT[row.tone], TEXT[row.tone], row.live && "animate-ring")} />
            <span className="flex-1 truncate text-sm font-medium">{row.label}</span>
            <span className={cn("shrink-0 text-xs font-medium", TEXT[row.tone])}>{row.status}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex h-14 items-end gap-1.5 border-t pt-3">
        {BARS.map((h, i) => (
          <span
            key={i}
            className="brand-gradient animate-fade-in-up min-w-0 flex-1 origin-bottom rounded-t-sm"
            style={{ height: `${h * 0.4}px`, animationDelay: `${i * 70}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
