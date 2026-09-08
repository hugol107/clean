"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrganizationForSelfAction } from "@/server/actions/organizations";

/** Onboarding step 1 for an already-signed-in user with no organization yet (e.g. a fresh Google sign-in). */
export function CreateOrganizationForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createOrganizationForSelfAction({ name: String(formData.get("name") ?? "") });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Organization created");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Company name</Label>
        <Input id="name" name="name" placeholder="CleanCo Facilities" required autoFocus maxLength={160} />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create organization"}
      </Button>
    </form>
  );
}
