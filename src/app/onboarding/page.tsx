import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { requireUser, listUserOrganizations } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CreateOrganizationForm } from "@/components/forms/create-organization-form";

export const dynamic = "force-dynamic";

function OnboardingBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
      <div className="absolute top-[-8rem] left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/25 blur-[70px] sm:h-80 sm:w-[36rem]" />
      <div className="bg-brand-2/20 absolute right-[-4rem] bottom-[-4rem] h-48 w-48 rounded-full blur-[70px] sm:h-64 sm:w-64" />
    </div>
  );
}

export default async function OnboardingPage() {
  const user = await requireUser();
  const orgs = await listUserOrganizations(user.id);

  // Reached by anyone authenticated with zero organizations — including a
  // fresh Google sign-in, which has no password-based /register form to
  // collect a company name on the way in. Ask for just that, here.
  if (orgs.length === 0) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/30 p-4">
        <OnboardingBackdrop />
        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold">Welcome to {APP_NAME}</h1>
            <p className="text-sm text-muted-foreground">First, what should we call your organization?</p>
          </div>
          <Card className="shadow-md">
            <CardContent className="pt-5">
              <CreateOrganizationForm />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const organizationId = orgs[0].organizationId;
  const [siteCount, locationCount, employeeCount, checklistCount, assignedTagCount, sessionCount] = await Promise.all([
    prisma.site.count({ where: { organizationId } }),
    prisma.location.count({ where: { organizationId } }),
    prisma.employeeProfile.count({ where: { organizationId } }),
    prisma.checklistTemplate.count({ where: { organizationId } }),
    prisma.nFCTag.count({ where: { organizationId, status: "ACTIVE" } }),
    prisma.cleaningSession.count({ where: { organizationId } }),
  ]);

  const steps = [
    { label: "Create organization", done: true, href: "/settings" },
    { label: "Create your first site", done: siteCount > 0, href: "/sites/new" },
    { label: "Add locations", done: locationCount > 0, href: "/locations/new" },
    { label: "Create a checklist", done: checklistCount > 0, href: "/checklists/new" },
    { label: "Add your first worker", done: employeeCount > 0, href: "/employees/new" },
    { label: "Assign an NFC tag", done: assignedTagCount > 0, href: "/nfc-tags" },
    { label: "Start your first cleaning", done: sessionCount > 0, href: "/nfc-tags" },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progress = Math.round((completedCount / steps.length) * 100);
  const allDone = completedCount === steps.length;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/30 p-4">
      <OnboardingBackdrop />
      <div className="w-full max-w-lg flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Let&apos;s set up {APP_NAME}</h1>
          <p className="text-sm text-muted-foreground">
            {completedCount} of {steps.length} steps done — your first live cleaning session is next.
          </p>
        </div>

        <Progress value={progress} className="h-2.5" />

        <Card className="shadow-md">
          <CardContent className="flex flex-col divide-y p-0">
            {steps.map((step, i) => (
              <Link
                key={step.label}
                href={step.href}
                className="hover:bg-accent/50 flex items-center gap-3 px-4 py-4 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                {step.done ? (
                  <span className="bg-status-clean-bg text-status-clean flex size-7 shrink-0 items-center justify-center rounded-full">
                    <CheckCircle2 className="size-4" />
                  </span>
                ) : (
                  <span className="bg-accent text-accent-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {i + 1}
                  </span>
                )}
                <span className={cn("flex-1 font-medium", step.done && "text-muted-foreground line-through")}>{step.label}</span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>

        {allDone && (
          <Button asChild size="lg">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        )}
        {!allDone && (
          <Button variant="ghost" asChild>
            <Link href="/dashboard">Skip for now</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
