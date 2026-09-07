"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reportIssueAction } from "@/server/actions/issues";
import { ISSUE_TYPE_OPTIONS } from "@/lib/constants";
import { IssueSeverity } from "@/generated/prisma/enums";

const SEVERITY_OPTIONS = [
  { value: IssueSeverity.LOW, label: "Low" },
  { value: IssueSeverity.MEDIUM, label: "Medium" },
  { value: IssueSeverity.HIGH, label: "High" },
  { value: IssueSeverity.CRITICAL, label: "Critical" },
];

export function ReportIssueDialog({
  organizationId,
  siteId,
  locationId,
  sessionId,
  trigger,
}: {
  organizationId: string;
  siteId: string;
  locationId: string;
  sessionId?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState(ISSUE_TYPE_OPTIONS[0]?.value ?? "OTHER");
  const [severity, setSeverity] = useState<string>(IssueSeverity.MEDIUM);

  function handleSubmit(formData: FormData) {
    formData.set("organizationId", organizationId);
    formData.set("siteId", siteId);
    formData.set("locationId", locationId);
    if (sessionId) formData.set("sessionId", sessionId);
    formData.set("type", type);
    formData.set("severity", severity);

    startTransition(async () => {
      const result = await reportIssueAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Issue reported");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="lg" className="w-full">
            <AlertTriangle /> Report Issue
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report an issue</DialogTitle>
          <DialogDescription>Managers are notified immediately for high and critical issues.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="What's going on?" rows={3} required maxLength={1000} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="photo" className="flex items-center gap-1.5">
              <Camera className="size-3.5" /> Photo (optional)
            </Label>
            <input id="photo" name="photo" type="file" accept="image/*" capture="environment" className="text-sm" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending…" : "Report issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
