import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/30 p-4">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute top-[-10rem] left-1/2 h-[28rem] w-[50rem] -translate-x-1/2 rounded-full bg-primary/30 blur-[80px]" />
        <div className="bg-brand-2/30 absolute right-[-6rem] bottom-[-6rem] h-72 w-72 rounded-full blur-[80px]" />
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
