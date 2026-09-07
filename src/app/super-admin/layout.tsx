import Link from "next/link";
import { requireSuperAdmin } from "@/lib/tenant";
import { listUserOrganizations } from "@/lib/tenant";
import { UserMenu } from "@/components/layout/user-menu";
import { APP_NAME } from "@/lib/constants";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();
  const orgs = await listUserOrganizations(user.id);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center gap-3 border-b px-4">
        <Link href="/super-admin" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background text-xs font-bold">CT</span>
          {APP_NAME} <span className="text-muted-foreground font-normal">Platform Admin</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          {orgs.length > 0 && (
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              Go to my dashboard
            </Link>
          )}
          <UserMenu name={user.name} email={user.email} image={user.image} roleLabel="Super Admin" />
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
