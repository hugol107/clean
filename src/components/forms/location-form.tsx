"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createLocationAction } from "@/server/actions/locations";
import { LOCATION_TYPE_OPTIONS } from "@/lib/constants";

export function LocationForm({
  organizationId,
  sites,
  checklistTemplates,
  defaultSiteId,
}: {
  organizationId: string;
  sites: { id: string; name: string }[];
  checklistTemplates: { id: string; name: string }[];
  defaultSiteId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [siteId, setSiteId] = useState(defaultSiteId ?? sites[0]?.id ?? "");
  const [type, setType] = useState("HOTEL_ROOM");
  const [checklistTemplateId, setChecklistTemplateId] = useState<string>("");

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createLocationAction({
        organizationId,
        siteId,
        name: String(formData.get("name") ?? ""),
        code: String(formData.get("code") ?? ""),
        type: type as never,
        targetDurationMinutes: Number(formData.get("targetDurationMinutes") ?? 15),
        targetFrequencyMinutes: Number(formData.get("targetFrequencyMinutes") ?? 120),
        checklistTemplateId: checklistTemplateId || undefined,
        notes: String(formData.get("notes") ?? "") || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Location created");
      router.push(`/locations/${result.data.id}`);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4 max-w-xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="Room 301" required maxLength={160} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" placeholder="301" required maxLength={60} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Site</Label>
          <Select value={siteId} onValueChange={setSiteId}>
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
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCATION_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="targetDurationMinutes">Target cleaning time (min)</Label>
          <Input id="targetDurationMinutes" name="targetDurationMinutes" type="number" min={1} max={480} defaultValue={15} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="targetFrequencyMinutes">Cleaning frequency (min)</Label>
          <Input id="targetFrequencyMinutes" name="targetFrequencyMinutes" type="number" min={1} max={10080} defaultValue={120} required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Checklist template</Label>
        <Select value={checklistTemplateId} onValueChange={setChecklistTemplateId}>
          <SelectTrigger>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            {checklistTemplates.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={3} maxLength={2000} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !siteId}>
          {isPending ? "Creating…" : "Create location"}
        </Button>
      </div>
    </form>
  );
}
