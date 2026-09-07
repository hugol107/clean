"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOrganizationSettingsAction } from "@/server/actions/organizations";
import { LOCATION_VERIFICATION_LABELS } from "@/lib/constants";
import { LocationVerification } from "@/generated/prisma/enums";
import type { Organization } from "@/generated/prisma/client";

export function SettingsForm({ organization }: { organization: Organization }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(organization.name);
  const [allowMultiple, setAllowMultiple] = useState(organization.allowMultipleActiveSessions);
  const [dueSoonPercent, setDueSoonPercent] = useState(organization.dueSoonThresholdPercent);
  const [verification, setVerification] = useState<LocationVerification>(organization.locationVerification);
  const [retentionDays, setRetentionDays] = useState(organization.dataRetentionDays);

  function handleSave() {
    startTransition(async () => {
      const result = await updateOrganizationSettingsAction({
        organizationId: organization.id,
        name,
        allowMultipleActiveSessions: allowMultiple,
        dueSoonThresholdPercent: dueSoonPercent,
        locationVerification: verification,
        dataRetentionDays: retentionDays,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Settings saved");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Organization</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="orgName">Name</Label>
          <Input id="orgName" value={name} onChange={(e) => setName(e.target.value)} maxLength={160} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Cleaning rules</h2>
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Allow multiple active sessions per worker</p>
            <p className="text-xs text-muted-foreground">If off, a worker must finish their current cleaning before starting another.</p>
          </div>
          <Switch checked={allowMultiple} onCheckedChange={setAllowMultiple} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dueSoon">&ldquo;Due soon&rdquo; threshold (% of cleaning frequency)</Label>
          <Input
            id="dueSoon"
            type="number"
            min={10}
            max={99}
            value={dueSoonPercent}
            onChange={(e) => setDueSoonPercent(Number(e.target.value))}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            e.g. 75% of a 60-minute frequency means locations turn &ldquo;due soon&rdquo; at 45 minutes and overdue at 60.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Privacy &amp; data</h2>
        <div className="flex flex-col gap-1.5">
          <Label>Location verification</Label>
          <Select value={verification} onValueChange={(v) => setVerification(v as LocationVerification)}>
            <SelectTrigger className="w-full sm:w-80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LOCATION_VERIFICATION_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Off by default — CleanTap never tracks a worker&apos;s location continuously, only an optional single point at Tap In/Out.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="retention">Data retention (days)</Label>
          <Input
            id="retention"
            type="number"
            min={30}
            max={3650}
            value={retentionDays}
            onChange={(e) => setRetentionDays(Number(e.target.value))}
            className="w-32"
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
