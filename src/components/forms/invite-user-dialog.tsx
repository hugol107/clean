"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoogleIcon } from "@/components/icons/google-icon";
import { createOrgMemberAction } from "@/server/actions/employees";
import { generateShortCode } from "@/lib/tokens-client";
import { ROLE_LABELS } from "@/lib/rbac";
import { OrgRole } from "@/generated/prisma/enums";

const INVITABLE_ROLES = [OrgRole.SITE_MANAGER, OrgRole.SUPERVISOR, OrgRole.ORG_ADMIN] as const;

export function InviteUserDialog({ organizationId, sites }: { organizationId: string; sites: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<(typeof INVITABLE_ROLES)[number]>(OrgRole.SITE_MANAGER);
  const [siteIds, setSiteIds] = useState<string[]>([]);
  const [authMethod, setAuthMethod] = useState<"password" | "google">("password");
  const [password] = useState(() => generateShortCode());

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createOrgMemberAction({
        organizationId,
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        authMethod,
        password: authMethod === "password" ? String(formData.get("password") ?? "") : undefined,
        role,
        siteIds: role === OrgRole.ORG_ADMIN ? undefined : siteIds,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("User invited");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Invite user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
          <DialogDescription>Creates a login for a manager, site manager, or supervisor.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required maxLength={120} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>How will they sign in?</Label>
            <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as "password" | "google")}>
              <TabsList className="w-full">
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="google" className="gap-1.5">
                  <GoogleIcon className="size-3.5" /> Google account
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {authMethod === "password" ? (
              <Input id="password" name="password" defaultValue={password} required minLength={8} />
            ) : (
              <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                No password is set. They sign in with <strong>Continue with Google</strong> using this exact email — make sure it
                matches their Google account.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as (typeof INVITABLE_ROLES)[number])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {role !== OrgRole.ORG_ADMIN && (
            <div className="flex flex-col gap-1.5">
              <Label>Site access</Label>
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                {sites.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={siteIds.includes(s.id)}
                      onCheckedChange={(v) => setSiteIds((prev) => (v ? [...prev, s.id] : prev.filter((id) => id !== s.id)))}
                    />
                    {s.name}
                  </label>
                ))}
                {sites.length === 0 && <p className="text-xs text-muted-foreground">No sites yet.</p>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Inviting…" : "Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
