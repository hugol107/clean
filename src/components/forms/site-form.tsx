"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSiteAction } from "@/server/actions/organizations";

export function SiteForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createSiteAction({
        organizationId,
        name: String(formData.get("name") ?? ""),
        address: String(formData.get("address") ?? "") || undefined,
        city: String(formData.get("city") ?? "") || undefined,
        country: String(formData.get("country") ?? "") || undefined,
        operatingHoursStart: String(formData.get("operatingHoursStart") ?? "") || undefined,
        operatingHoursEnd: String(formData.get("operatingHoursEnd") ?? "") || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Site created");
      router.push(`/locations/new?site=${result.data.id}`);
    });
  }

  return (
    <form action={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Site name</Label>
        <Input id="name" name="name" placeholder="Grand Hotel Madrid" required maxLength={160} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" placeholder="Calle Gran Vía 1" maxLength={240} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" placeholder="Madrid" maxLength={120} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">Country</Label>
          <Input id="country" name="country" placeholder="Spain" maxLength={120} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="operatingHoursStart">Operating hours from</Label>
          <Input id="operatingHoursStart" name="operatingHoursStart" type="time" defaultValue="07:00" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="operatingHoursEnd">Operating hours to</Label>
          <Input id="operatingHoursEnd" name="operatingHoursEnd" type="time" defaultValue="23:00" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create site"}
        </Button>
      </div>
    </form>
  );
}
