import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { requireUser, listUserOrganizations } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireUser();
  const orgs = await listUserOrganizations(user.id);
  if (orgs.length === 0) redirect("/register");

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
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Let&apos;s set up {APP_NAME}</h1>
          <p className="text-sm text-muted-foreground">Seven quick steps to your first live cleaning session.</p>
        </div>

        <Progress value={progress} />

        <Card>
          <CardContent className="flex flex-col divide-y p-0">
            {steps.map((step, i) => (
              <Link
                key={step.label}
                href={step.href}
                className="flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-accent/50 first:rounded-t-xl last:rounded-b-xl"
              >
                {step.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-status-clean" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground" />
                )}
                <span className={cn("flex-1", step.done && "text-muted-foreground line-through")}>
                  {i + 1}. {step.label}
                </span>
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
