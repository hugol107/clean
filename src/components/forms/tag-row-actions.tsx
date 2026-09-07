"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { MoreHorizontal, Copy, Printer, Ban, RefreshCw, MapPinPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignTagAction, disableTagAction, replaceTagAction, unassignTagAction } from "@/server/actions/tags";

export function TagRowActions({
  organizationId,
  tagId,
  tagUrl,
  currentLocationId,
  unassignedLocations,
}: {
  organizationId: string;
  tagId: string;
  tagUrl: string;
  currentLocationId: string | null;
  unassignedLocations: { id: string; name: string; siteName: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [assignOpen, setAssignOpen] = useState(false);
  const [locationId, setLocationId] = useState("");

  function run(action: () => Promise<{ ok: boolean; error?: string }>, successMessage: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => navigator.clipboard.writeText(tagUrl).then(() => toast.success("URL copied"))}>
            <Copy /> Copy URL
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/labels/${tagId}`} target="_blank">
              <Printer /> Print label
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setAssignOpen(true)}>
            <MapPinPlus /> {currentLocationId ? "Reassign" : "Assign"} location
          </DropdownMenuItem>
          {currentLocationId && (
            <DropdownMenuItem onSelect={() => run(() => unassignTagAction({ organizationId, tagId }), "Tag unassigned")}>
              Unassign
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => run(() => replaceTagAction({ organizationId, tagId }), "Replacement tag created")}>
            <RefreshCw /> Replace (lost/damaged)
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => run(() => disableTagAction({ organizationId, tagId }), "Tag disabled")}
          >
            <Ban /> Disable tag
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign tag to a location</DialogTitle>
            <DialogDescription>Any other active tag currently at that location will be detached.</DialogDescription>
          </DialogHeader>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a location" />
            </SelectTrigger>
            <SelectContent>
              {unassignedLocations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name} · {l.siteName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!locationId || isPending}
              onClick={() =>
                run(async () => {
                  const result = await assignTagAction({ organizationId, tagId, locationId });
                  if (result.ok) setAssignOpen(false);
                  return result;
                }, "Tag assigned")
              }
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
