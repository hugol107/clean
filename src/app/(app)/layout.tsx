import Link from "next/link";
import { Search, Menu } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { navItemsForRole } from "@/lib/nav-config";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { ROLE_LABELS } from "@/lib/rbac";
import { listNotifications } from "@/server/services/notifications";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await resolveActiveOrganization();
  const navItems = navItemsForRole(ctx.role, ctx.user.isSuperAdmin);
  const notifications = await listNotifications(ctx.user.id, ctx.organizationId);

  const sidebarContent = (
    <>
      <div className="flex h-14 items-center gap-2 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="brand-gradient shadow-glow flex size-7 items-center justify-center rounded-lg text-xs font-bold text-white">
            CT
          </span>
          {APP_NAME}
        </Link>
      </div>
      <div className="px-3 pb-3">
        <OrgSwitcher
          current={{ organizationId: ctx.organizationId, name: ctx.organizationName, role: ctx.role ?? "ORG_ADMIN" }}
          options={ctx.organizations}
        />
      </div>
      <SidebarNav items={navItems} />
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
        {sidebarContent}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 sm:gap-3 sm:px-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 lg:hidden">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebarContent}
            </SheetContent>
          </Sheet>

          <Link href="/dashboard" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight lg:hidden">
            <span className="brand-gradient flex size-7 items-center justify-center rounded-lg text-xs font-bold text-white">CT</span>
          </Link>

          <form action="/search" className="relative hidden max-w-sm flex-1 sm:block">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" placeholder="Search locations, employees, tags…" className="pl-8" />
          </form>

          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <Button variant="ghost" size="icon" className="sm:hidden" asChild>
              <Link href="/search">
                <Search className="size-4" />
              </Link>
            </Button>
            <NotificationsMenu
              organizationId={ctx.organizationId}
              notifications={notifications.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }))}
            />
            <UserMenu
              name={ctx.user.name}
              email={ctx.user.email}
              image={ctx.user.image}
              roleLabel={ctx.user.isSuperAdmin ? "Super Admin" : ROLE_LABELS[ctx.role ?? "CLEANER"]}
              settingsHref={ctx.role === "ORG_ADMIN" ? "/settings" : undefined}
            />
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
