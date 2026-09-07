"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, History } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/w", label: "Today", icon: Home },
  { href: "/w/history", label: "History", icon: History },
];

export function WorkerBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background">
      {ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
