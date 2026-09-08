"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ReportIssueDialog } from "@/components/worker/report-issue-dialog";
import { completeCleaningAction } from "@/server/actions/cleaning";
import { requestGeolocationOnce } from "@/hooks/use-geolocation";
import { cn, formatDuration } from "@/lib/utils";
import { LocationVerification, TapMethod } from "@/generated/prisma/enums";

export interface ChecklistItemView {
  id: string;
  checklistItemId: string;
  label: string;
  isRequired: boolean;
  isChecked: boolean;
}

export function ActiveCleaningScreen({
  sessionId,
  organizationId,
  siteId,
  locationId,
  locationName,
  startedAt,
  checklistItems,
  locationVerification,
}: {
  sessionId: string;
  organizationId: string;
  siteId: string;
  locationId: string;
  locationName: string;
  startedAt: string;
  checklistItems: ChecklistItemView[];
  locationVerification: LocationVerification;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [elapsedSeconds, setElapsedSeconds] = useState(() => Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(checklistItems.map((i) => [i.checklistItemId, i.isChecked])),
  );
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const requiredIncomplete = useMemo(
    () => checklistItems.filter((i) => i.isRequired && !checked[i.checklistItemId]),
    [checklistItems, checked],
  );

  function handleFinish() {
    startTransition(async () => {
      // "OFF" means never even ask the browser for a location — see the
      // matching comment in start-cleaning-card.tsx.
      const geo = locationVerification === LocationVerification.OFF ? null : await requestGeolocationOnce();
      if (locationVerification === LocationVerification.REQUIRED && !geo) {
        toast.error("Location access is required by your organization. Please enable it and try again.");
        return;
      }
      const result = await completeCleaningAction({
        sessionId,
        organizationId,
        locationId,
        method: TapMethod.NFC,
        notes: notes || undefined,
        geo,
        checklistResponses: checklistItems.map((i) => ({ checklistItemId: i.checklistItemId, isChecked: checked[i.checklistItemId] ?? false })),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Cleaning finished — ${formatDuration(result.data.durationSeconds)}`);
      if (result.data.anomalies.length > 0) {
        toast.info(result.data.anomalies.join(" "));
      }
      router.push("/w");
    });
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col items-center gap-1 py-4 text-center">
        <span className="text-sm text-muted-foreground">Cleaning in progress</span>
        <h1 className="text-2xl font-semibold">{locationName}</h1>
        <p className="text-xs text-muted-foreground">Started at {format(new Date(startedAt), "HH:mm")}</p>
        <p className="mt-3 font-mono text-5xl font-semibold tabular-nums tracking-tight text-primary">{formatDuration(elapsedSeconds)}</p>
      </div>

      {checklistItems.length > 0 && (
        <div className="flex flex-col gap-1 rounded-xl border bg-card p-2">
          <div className="flex items-center justify-between px-2 pt-1.5 pb-1">
            <span className="text-sm font-medium">Checklist</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {Object.values(checked).filter(Boolean).length}/{checklistItems.length}
            </span>
          </div>
          {checklistItems.map((item) => {
            const isChecked = checked[item.checklistItemId] ?? false;
            return (
              <label
                key={item.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-3 text-sm transition-colors active:bg-accent/70",
                  isChecked && "bg-status-clean-bg/40",
                )}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(value) => setChecked((prev) => ({ ...prev, [item.checklistItemId]: value === true }))}
                />
                <span className={cn("flex-1", isChecked && "text-muted-foreground line-through")}>
                  {item.label}
                  {item.isRequired && !isChecked && <span className="text-destructive"> *</span>}
                </span>
              </label>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Observations (optional)</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth noting…" rows={2} />
      </div>

      <div className="flex flex-col gap-3">
        <Button size="lg" className="h-14 text-base" disabled={isPending} onClick={handleFinish}>
          {isPending ? "Finishing…" : "Finish Cleaning"}
        </Button>
        {requiredIncomplete.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">{requiredIncomplete.length} required item(s) remaining</p>
        )}
        <ReportIssueDialog organizationId={organizationId} siteId={siteId} locationId={locationId} sessionId={sessionId} />
      </div>
    </div>
  );
}
