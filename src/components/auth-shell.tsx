import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/30 p-4">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute top-[-8rem] left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/25 blur-[70px] sm:h-80 sm:w-[36rem]" />
        <div className="bg-brand-2/20 absolute right-[-4rem] bottom-[-4rem] h-48 w-48 rounded-full blur-[70px] sm:h-64 sm:w-64" />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center justify-center gap-2 text-lg font-semibold tracking-tight">
          <span className="brand-gradient shadow-glow flex size-8 items-center justify-center rounded-lg text-sm font-bold text-white">
            CT
          </span>
          {APP_NAME}
        </Link>
        <div className="rounded-xl border bg-card p-6 shadow-md sm:p-7">
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
