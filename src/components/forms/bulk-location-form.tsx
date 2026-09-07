"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { bulkCreateLocationsAction } from "@/server/actions/locations";
import { LOCATION_TYPE_OPTIONS } from "@/lib/constants";

export function BulkLocationForm({
  organizationId,
  sites,
  checklistTemplates,
}: {
  organizationId: string;
  sites: { id: string; name: string }[];
  checklistTemplates: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [type, setType] = useState("HOTEL_ROOM");
  const [checklistTemplateId, setChecklistTemplateId] = useState("");
  const [prefix, setPrefix] = useState("Room");
  const [from, setFrom] = useState(101);
  const [to, setTo] = useState(140);
  const [padWidth, setPadWidth] = useState(0);

  const preview = useMemo(() => {
    const count = Math.max(0, to - from + 1);
    const first = padWidth ? String(from).padStart(padWidth, "0") : String(from);
    const last = padWidth ? String(to).padStart(padWidth, "0") : String(to);
    return { count, label: count > 0 ? `${prefix} ${first} … ${prefix} ${last}` : "—" };
  }, [prefix, from, to, padWidth]);

  function handleSubmit() {
    startTransition(async () => {
      const result = await bulkCreateLocationsAction({
        organizationId,
        siteId,
        prefix,
        from,
        to,
        type: type as never,
        targetDurationMinutes: 20,
        targetFrequencyMinutes: 1440,
        checklistTemplateId: checklistTemplateId || undefined,
        padWidth: padWidth || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Created ${result.data.created} locations${result.data.skipped ? ` (${result.data.skipped} already existed)` : ""}`);
      router.push("/locations");
    });
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
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

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prefix">Prefix</Label>
          <Input id="prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Room" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" type="number" value={from} onChange={(e) => setFrom(Number(e.target.value))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" type="number" value={to} onChange={(e) => setTo(Number(e.target.value))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="padWidth">Zero-pad width (0 = off)</Label>
          <Input id="padWidth" type="number" min={0} max={6} value={padWidth} onChange={(e) => setPadWidth(Number(e.target.value))} />
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

      <Card className="bg-muted/40">
        <CardContent className="text-sm">
          <span className="font-medium">{preview.count}</span> location{preview.count === 1 ? "" : "s"} will be created:{" "}
          <span className="text-muted-foreground">{preview.label}</span>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending || !siteId || preview.count === 0 || preview.count > 500}>
          {isPending ? "Creating…" : `Create ${preview.count} locations`}
        </Button>
      </div>
    </div>
  );
}
