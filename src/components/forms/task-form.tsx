"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTaskAction } from "@/server/actions/tasks";
import { TASK_PRIORITY_LABELS } from "@/lib/constants";
import { TaskPriority } from "@/generated/prisma/enums";

export function TaskForm({
  organizationId,
  sites,
  locations,
  employees,
}: {
  organizationId: string;
  sites: { id: string; name: string }[];
  locations: { id: string; name: string; siteId: string }[];
  employees: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [locationId, setLocationId] = useState("");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string>("unassigned");
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.NORMAL);

  const filteredLocations = locations.filter((l) => l.siteId === siteId);

  function handleSubmit(formData: FormData) {
    if (!locationId) {
      toast.error("Select a location.");
      return;
    }
    startTransition(async () => {
      const dueAtRaw = String(formData.get("dueAt") ?? "");
      const result = await createTaskAction({
        organizationId,
        siteId,
        locationId,
        title: String(formData.get("title") ?? ""),
        priority,
        assignedEmployeeId: assignedEmployeeId === "unassigned" ? undefined : assignedEmployeeId,
        dueAt: dueAtRaw ? new Date(dueAtRaw) : undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Task created");
      router.push("/tasks");
    });
  }

  return (
    <form action={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="Clean lobby restroom" required maxLength={160} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Site</Label>
          <Select
            value={siteId}
            onValueChange={(v) => {
              setSiteId(v);
              setLocationId("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Location</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a location" />
            </SelectTrigger>
            <SelectContent>
              {filteredLocations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Assign to</Label>
          <Select value={assignedEmployeeId} onValueChange={setAssignedEmployeeId}>
            <SelectTrigger>
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dueAt">Due (optional)</Label>
        <Input id="dueAt" name="dueAt" type="datetime-local" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !locationId}>
          {isPending ? "Creating…" : "Create task"}
        </Button>
      </div>
    </form>
  );
}
