"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Check, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { setActiveOrganizationAction } from "@/server/actions/session";
import { ROLE_LABELS } from "@/lib/rbac";
import type { OrgRole } from "@/generated/prisma/enums";

export interface OrgOption {
  organizationId: string;
  name: string;
  role: OrgRole;
}

export function OrgSwitcher({ current, options }: { current: OrgOption; options: OrgOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleSelect(organizationId: string) {
    if (organizationId === current.organizationId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      await setActiveOrganizationAction({ organizationId });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between font-normal" disabled={isPending}>
          <span className="flex items-center gap-2 truncate">
            <Building2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{current.name}</span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Your organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuItem key={opt.organizationId} onSelect={() => handleSelect(opt.organizationId)} className="justify-between">
            <span className="flex flex-col">
              <span className="truncate">{opt.name}</span>
              <span className="text-xs text-muted-foreground">{ROLE_LABELS[opt.role]}</span>
            </span>
            {opt.organizationId === current.organizationId && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
