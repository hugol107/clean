"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateLocationAction } from "@/server/actions/locations";

export function EditLocationDialog({
  organizationId,
  locationId,
  name,
  targetDurationMinutes,
  targetFrequencyMinutes,
  checklistTemplateId,
  checklistTemplates,
}: {
  organizationId: string;
  locationId: string;
  name: string;
  targetDurationMinutes: number;
  targetFrequencyMinutes: number;
  checklistTemplateId: string | null;
  checklistTemplates: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [checklist, setChecklist] = useState(checklistTemplateId ?? "");

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateLocationAction({
        organizationId,
        locationId,
        name: String(formData.get("name") ?? name),
        targetDurationMinutes: Number(formData.get("targetDurationMinutes")),
        targetFrequencyMinutes: Number(formData.get("targetFrequencyMinutes")),
        checklistTemplateId: checklist && checklist !== "none" ? checklist : null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Location updated");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit location</DialogTitle>
          <DialogDescription>Update the SLA targets and checklist used for this location.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={name} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetDurationMinutes">Target duration (min)</Label>
              <Input id="targetDurationMinutes" name="targetDurationMinutes" type="number" min={1} max={480} defaultValue={targetDurationMinutes} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetFrequencyMinutes">Frequency (min)</Label>
              <Input id="targetFrequencyMinutes" name="targetFrequencyMinutes" type="number" min={1} max={10080} defaultValue={targetFrequencyMinutes} required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Checklist template</Label>
            <Select value={checklist} onValueChange={setChecklist}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {checklistTemplates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
