import Link from "next/link";
import {
  Nfc,
  QrCode,
  ClipboardCheck,
  Radio,
  ArrowRight,
  Gauge,
  FileCheck2,
  BarChart3,
  ScrollText,
  Building2,
  Hotel,
  Landmark,
  ShoppingBag,
  Stethoscope,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

export default function MarketingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">CT</span>
            {APP_NAME}
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#how-it-works" className="hover:text-foreground">How it works</a>
            <a href="#benefits" className="hover:text-foreground">Benefits</a>
            <a href="#industries" className="hover:text-foreground">Industries</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Start free</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 pt-20 pb-16 text-center">
          <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Real-time cleaning operations
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Know exactly when every space was cleaned.</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Real-time cleaning operations powered by a simple tap. Turn every NFC tag or QR code into digital proof
            of service, live visibility, and SLA compliance you can actually measure.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/register">
                Start free <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>
        </section>

        <section id="how-it-works" className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-semibold tracking-tight">How it works</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Nfc, title: "1. Place an NFC tag", desc: "Stick a secure NFC tag (or print the QR fallback) at every room, restroom, or zone." },
                { icon: QrCode, title: "2. Cleaner taps in", desc: "A worker taps their phone or scans the QR code to start the cleaning — no app install needed." },
                { icon: ClipboardCheck, title: "3. Cleaner completes the task", desc: "They work through the checklist, note any issues, and tap again to finish." },
                { icon: Radio, title: "4. Manager sees everything live", desc: "Live operations, durations, SLA compliance, and incidents — all in one dashboard." },
              ].map((step) => (
                <div key={step.title} className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center shadow-sm">
                  <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                    <step.icon className="size-5" />
                  </div>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="benefits" className="py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-semibold tracking-tight">Everything you need to run cleaning like an operation, not a guess</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Radio, title: "Real-time visibility", desc: "See who's cleaning what, right now, across every site." },
                { icon: Gauge, title: "SLA compliance", desc: "Target durations and cleaning frequency, tracked automatically." },
                { icon: FileCheck2, title: "Digital proof of service", desc: "A timestamped, auditable record of every cleaning — no paper logs." },
                { icon: BarChart3, title: "Operational analytics", desc: "Trends, busiest hours, and location performance without spreadsheets." },
                { icon: ScrollText, title: "Less paperwork", desc: "Checklists, incidents, and reports captured digitally at the point of work." },
                { icon: Building2, title: "Built for scale", desc: "Multi-site, multi-team, role-based access from day one." },
              ].map((b) => (
                <div key={b.title} className="flex gap-4 rounded-xl border p-5">
                  <div className="h-fit rounded-lg bg-muted p-2 text-muted-foreground">
                    <b.icon className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-medium">{b.title}</h3>
                    <p className="text-sm text-muted-foreground">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="industries" className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-semibold tracking-tight">Built for spaces that can&apos;t afford to guess</h2>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: Hotel, label: "Hotels" },
                { icon: Building2, label: "Public Restrooms" },
                { icon: Landmark, label: "Airports" },
                { icon: ShoppingBag, label: "Shopping Centres" },
                { icon: Briefcase, label: "Offices" },
                { icon: Stethoscope, label: "Healthcare" },
                { icon: ClipboardCheck, label: "Facility Management" },
              ].map((ind) => (
                <div key={ind.label} className="flex flex-col items-center gap-2 rounded-xl border bg-card py-6 text-sm font-medium shadow-sm">
                  <ind.icon className="size-5 text-muted-foreground" />
                  {ind.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Ready to see every space, live?</h2>
            <p className="text-muted-foreground">Set up your first site in minutes. No credit card required.</p>
            <Button size="lg" asChild>
              <Link href="/register">
                Start free <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
            <Link href="/register" className="hover:text-foreground">Start free</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
