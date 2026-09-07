"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTagAction, assignTagAction } from "@/server/actions/tags";

export function CreateTagDialog({ organizationId, unassignedLocations }: { organizationId: string; unassignedLocations: { id: string; name: string; siteName: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [locationId, setLocationId] = useState<string>("");

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const created = await createTagAction({ organizationId, label: String(formData.get("label") ?? "") || undefined });
      if (!created.ok) {
        toast.error(created.error);
        return;
      }
      if (locationId) {
        const assigned = await assignTagAction({ organizationId, tagId: created.data.id, locationId });
        if (!assigned.ok) {
          toast.error(`Tag created, but assignment failed: ${assigned.error}`);
          setOpen(false);
          router.refresh();
          return;
        }
      }
      toast.success(locationId ? "Tag created and assigned" : "Tag created — assign it to a location when ready");
      setOpen(false);
      setLocationId("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Add NFC tag
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add NFC tag</DialogTitle>
          <DialogDescription>Generates a secure, unguessable token and a matching QR code.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label">Label (optional)</Label>
            <Input id="label" name="label" placeholder="e.g. Spare tag #4" maxLength={120} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Assign to location (optional — you can do this later)</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Leave unassigned" />
              </SelectTrigger>
              <SelectContent>
                {unassignedLocations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name} · {l.siteName}
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
              {isPending ? "Creating…" : "Create tag"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
