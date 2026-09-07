import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center justify-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">CT</span>
          {APP_NAME}
        </Link>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-1 text-center">
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
