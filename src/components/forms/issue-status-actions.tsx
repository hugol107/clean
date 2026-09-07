"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateIssueStatusAction } from "@/server/actions/issues";
import { IssueStatus } from "@/generated/prisma/enums";

export function IssueStatusActions({ organizationId, issueId, status }: { organizationId: string; issueId: string; status: IssueStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");

  function setStatus(next: IssueStatus) {
    startTransition(async () => {
      const result = await updateIssueStatusAction({ organizationId, issueId, status: next, resolutionNotes: notes || undefined });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Issue updated");
      router.refresh();
    });
  }

  if (status === IssueStatus.RESOLVED || status === IssueStatus.DISMISSED) {
    return <p className="text-sm text-muted-foreground">This issue is closed.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea placeholder="Resolution notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      <div className="flex flex-wrap gap-2">
        {status === IssueStatus.OPEN && (
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => setStatus(IssueStatus.ACKNOWLEDGED)}>
            Acknowledge
          </Button>
        )}
        {status !== IssueStatus.IN_PROGRESS && (
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => setStatus(IssueStatus.IN_PROGRESS)}>
            Mark in progress
          </Button>
        )}
        <Button size="sm" disabled={isPending} onClick={() => setStatus(IssueStatus.RESOLVED)}>
          Resolve
        </Button>
        <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setStatus(IssueStatus.DISMISSED)}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
