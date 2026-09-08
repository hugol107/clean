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
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { LivePreviewCard } from "@/components/marketing/live-preview-card";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SPOTLIGHT = [
  "bg-primary/12 text-primary",
  "bg-brand-2/15 text-brand-2",
  "bg-status-due-soon/15 text-status-due-soon",
  "bg-status-issue/15 text-status-issue",
  "bg-status-clean/15 text-status-clean",
  "bg-status-cleaning/15 text-status-cleaning",
];

const HOW_IT_WORKS = [
  { icon: Nfc, title: "Place an NFC tag", desc: "Stick a secure NFC tag (or print the QR fallback) at every room, restroom, or zone." },
  { icon: QrCode, title: "Cleaner taps in", desc: "A worker taps their phone or scans the QR code to start the cleaning — no app install needed." },
  { icon: ClipboardCheck, title: "Cleaner completes the task", desc: "They work through the checklist, note any issues, and tap again to finish." },
  { icon: Radio, title: "Manager sees everything live", desc: "Live operations, durations, SLA compliance, and incidents — all in one dashboard." },
];

const BENEFITS = [
  { icon: Radio, title: "Real-time visibility", desc: "See who's cleaning what, right now, across every site." },
  { icon: Gauge, title: "SLA compliance", desc: "Target durations and cleaning frequency, tracked automatically." },
  { icon: FileCheck2, title: "Digital proof of service", desc: "A timestamped, auditable record of every cleaning — no paper logs." },
  { icon: BarChart3, title: "Operational analytics", desc: "Trends, busiest hours, and location performance without spreadsheets." },
  { icon: ScrollText, title: "Less paperwork", desc: "Checklists, incidents, and reports captured digitally at the point of work." },
  { icon: Building2, title: "Built for scale", desc: "Multi-site, multi-team, role-based access from day one." },
];

const INDUSTRIES = [
  { icon: Hotel, label: "Hotels" },
  { icon: Building2, label: "Public Restrooms" },
  { icon: Landmark, label: "Airports" },
  { icon: ShoppingBag, label: "Shopping Centres" },
  { icon: Briefcase, label: "Offices" },
  { icon: Stethoscope, label: "Healthcare" },
  { icon: ClipboardCheck, label: "Facility Management" },
];

const TRUST_ROW = ["No app install", "Works on any phone", "Set up in minutes"];

export default function MarketingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
            <span className="brand-gradient shadow-glow flex size-7 items-center justify-center rounded-lg text-xs font-bold text-white">
              CT
            </span>
            {APP_NAME}
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            {[
              { href: "#how-it-works", label: "How it works" },
              { href: "#benefits", label: "Benefits" },
              { href: "#industries", label: "Industries" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="after:bg-primary relative py-1 transition-colors after:absolute after:right-0 after:bottom-0 after:left-0 after:h-[2px] after:origin-center after:scale-x-0 after:transition-transform after:duration-200 hover:text-foreground hover:after:scale-x-100"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" className="btn-shine" asChild>
              <Link href="/register">Start free</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            <div className="bg-dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_65%_55%_at_50%_0%,black,transparent)]" />
            <div className="animate-float bg-primary/30 sm:bg-primary/40 absolute top-[-8rem] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-[80px] sm:h-96 sm:w-[42rem] sm:blur-[100px]" />
            <div className="bg-brand-2/25 sm:bg-brand-2/40 animate-float-reverse absolute top-[-2rem] right-[2%] h-56 w-56 rounded-full blur-[70px] sm:right-[6%] sm:h-80 sm:w-80 sm:blur-[90px]" />
            <div className="bg-status-due-soon/20 animate-float absolute bottom-[-6rem] left-[6%] hidden h-64 w-64 rounded-full blur-[90px] sm:block" />
          </div>

          <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-16 pb-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-8 lg:pt-24 lg:pb-24">
            <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
              <Reveal>
                <span className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
                  <span className="relative flex size-1.5">
                    <span className="bg-status-clean absolute inline-flex size-full animate-ping rounded-full opacity-75" />
                    <span className="bg-status-clean relative inline-flex size-1.5 rounded-full" />
                  </span>
                  Real-time cleaning operations
                </span>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                  Know exactly when every <span className="brand-gradient-text">space was cleaned.</span>
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="max-w-xl text-lg text-muted-foreground text-balance">
                  Real-time cleaning operations powered by a simple tap. Turn every NFC tag or QR code into digital
                  proof of service, live visibility, and SLA compliance you can actually measure.
                </p>
              </Reveal>
              <Reveal delay={240}>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <Button size="lg" className="btn-shine" asChild>
                    <Link href="/register">
                      Start free <ArrowRight />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="#how-it-works">See how it works</Link>
                  </Button>
                </div>
              </Reveal>
              <Reveal delay={320}>
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground lg:justify-start">
                  {TRUST_ROW.map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <CheckCircle2 className="text-status-clean size-4" />
                      {t}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>

            <Reveal delay={200} className="flex justify-center lg:justify-end" as="div">
              <LivePreviewCard />
            </Reveal>
          </div>
        </section>

        <section id="how-it-works" className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <Reveal as="div" className="text-center">
              <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
            </Reveal>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((step, i) => (
                <Reveal key={step.title} delay={i * 90} className="h-full">
                  <div className="card-hover flex h-full flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center shadow-sm">
                    <div className={cn("relative rounded-xl p-3", SPOTLIGHT[i % SPOTLIGHT.length])}>
                      <step.icon className="size-5" />
                      <span className="brand-gradient absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm">
                        {i + 1}
                      </span>
                    </div>
                    <h3 className="font-medium">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="benefits" className="py-16">
          <div className="mx-auto max-w-6xl px-4">
            <Reveal as="div" className="text-center">
              <h2 className="text-2xl font-semibold tracking-tight">
                Everything you need to run cleaning like an operation, not a guess
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((b, i) => (
                <Reveal key={b.title} delay={i * 70} className="h-full">
                  <div className="card-hover flex h-full gap-4 rounded-xl border bg-card p-5 shadow-sm">
                    <div className={cn("h-fit shrink-0 rounded-lg p-2", SPOTLIGHT[i % SPOTLIGHT.length])}>
                      <b.icon className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-medium">{b.title}</h3>
                      <p className="text-sm text-muted-foreground">{b.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="industries" className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <Reveal as="div" className="text-center">
              <h2 className="text-2xl font-semibold tracking-tight">Built for spaces that can&apos;t afford to guess</h2>
            </Reveal>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {INDUSTRIES.map((ind, i) => (
                <Reveal key={ind.label} delay={i * 60} className="h-full">
                  <div className="card-hover flex h-full flex-col items-center justify-center gap-2 rounded-xl border bg-card py-6 text-sm font-medium shadow-sm">
                    <div className={cn("rounded-full p-2.5", SPOTLIGHT[i % SPOTLIGHT.length])}>
                      <ind.icon className="size-4" />
                    </div>
                    {ind.label}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4">
            <Reveal>
              <div className="brand-gradient-live relative overflow-hidden rounded-2xl px-6 py-14 text-center text-white shadow-xl sm:py-16">
                <div className="bg-dot-grid-invert absolute inset-0" aria-hidden />
                <div className="relative flex flex-col items-center gap-5">
                  <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ready to see every space, live?</h2>
                  <p className="max-w-md text-white/85">Set up your first site in minutes. No credit card required.</p>
                  <Button size="lg" variant="secondary" className="btn-shine" asChild>
                    <Link href="/register">
                      Start free <ArrowRight />
                    </Link>
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <span>
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </span>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <Link href="/register" className="hover:text-foreground">
              Start free
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
