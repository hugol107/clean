"use client";

import { signOut } from "next-auth/react";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";

export function UserMenu({ name, email, image, roleLabel, settingsHref }: { name: string; email: string; image?: string | null; roleLabel: string; settingsHref?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
        <Avatar className="size-8">
          {image && <AvatarImage src={image} alt={name} />}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="text-sm font-medium text-foreground">{name}</span>
          <span className="text-xs text-muted-foreground truncate">{email}</span>
          <span className="text-xs text-muted-foreground">{roleLabel}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {settingsHref && (
          <DropdownMenuItem asChild>
            <Link href={settingsHref}>
              <Settings /> Settings
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/login" })} variant="destructive">
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
