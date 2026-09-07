"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createEmployeeAction } from "@/server/actions/employees";
import { generateShortCode } from "@/lib/tokens-client";

export function EmployeeForm({ organizationId, sites }: { organizationId: string; sites: { id: string; name: string }[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [suggestedPassword] = useState(() => generateShortCode());

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createEmployeeAction({
        organizationId,
        siteId,
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        employeeCode: String(formData.get("employeeCode") ?? "") || undefined,
        jobTitle: String(formData.get("jobTitle") ?? "") || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Worker created");
      router.push("/employees");
    });
  }

  return (
    <form action={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" placeholder="Maria López" required maxLength={120} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="employeeCode">Employee code (optional)</Label>
          <Input id="employeeCode" name="employeeCode" placeholder="EMP-001" maxLength={40} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email (used to sign in)</Label>
        <Input id="email" name="email" type="email" placeholder="maria@cleanco.com" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Temporary password</Label>
        <Input id="password" name="password" defaultValue={suggestedPassword} required minLength={8} />
        <p className="text-xs text-muted-foreground">Share this with the worker — they can sign in on their phone right away.</p>
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
          <Label htmlFor="jobTitle">Job title (optional)</Label>
          <Input id="jobTitle" name="jobTitle" placeholder="Housekeeping" maxLength={120} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !siteId}>
          {isPending ? "Creating…" : "Create worker"}
        </Button>
      </div>
    </form>
  );
}
