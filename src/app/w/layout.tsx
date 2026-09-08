import Link from "next/link";
import { resolveActiveOrganization } from "@/lib/current-org";
import { UserMenu } from "@/components/layout/user-menu";
import { APP_NAME } from "@/lib/constants";
import { WorkerBottomNav } from "@/components/worker/bottom-nav";

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const ctx = await resolveActiveOrganization();

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <header
        className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <Link href="/w" className="flex items-center gap-2 font-semibold">
          <span className="brand-gradient flex size-7 items-center justify-center rounded-lg text-xs font-bold text-white">CT</span>
          {APP_NAME}
        </Link>
        <UserMenu name={ctx.user.name} email={ctx.user.email} image={ctx.user.image} roleLabel={ctx.organizationName} />
      </header>
      <main className="flex-1 pb-24">{children}</main>
      <WorkerBottomNav />
    </div>
  );
}
