import Link from "next/link";
import { resolveActiveOrganization } from "@/lib/current-org";
import { UserMenu } from "@/components/layout/user-menu";
import { APP_NAME } from "@/lib/constants";
import { WorkerBottomNav } from "@/components/worker/bottom-nav";

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const ctx = await resolveActiveOrganization();

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4">
        <Link href="/w" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">CT</span>
          {APP_NAME}
        </Link>
        <UserMenu name={ctx.user.name} email={ctx.user.email} image={ctx.user.image} roleLabel={ctx.organizationName} />
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <WorkerBottomNav />
    </div>
  );
}
