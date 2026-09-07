import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ActiveCleaningScreen } from "@/components/worker/active-cleaning-screen";
import { formatDurationCompact } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ActiveTaskPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const ctx = await resolveActiveOrganization();

  const session = await prisma.cleaningSession.findFirst({
    where: { id: sessionId, organizationId: ctx.organizationId },
    include: {
      location: { include: { organization: true } },
      employee: true,
      checklistResponses: { include: { checklistItem: true }, orderBy: { checklistItem: { sortOrder: "asc" } } },
    },
  });
  if (!session) notFound();

  // A worker may only view their own session; managers correcting history use /live instead.
  if (session.employee.userId !== ctx.user.id && !ctx.user.isSuperAdmin) {
    notFound();
  }

  if (session.status !== "ACTIVE") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="rounded-full bg-status-clean-bg p-4 text-status-clean">
          <CheckCircle2 className="size-8" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">{session.location.name} is already finished</h1>
          <p className="text-sm text-muted-foreground">
            Completed at {session.completedAt ? format(session.completedAt, "HH:mm") : "—"} · {formatDurationCompact(session.durationSeconds)}
          </p>
        </div>
        <Button asChild>
          <Link href="/w">Back to today</Link>
        </Button>
      </div>
    );
  }

  return (
    <ActiveCleaningScreen
      sessionId={session.id}
      organizationId={ctx.organizationId}
      siteId={session.siteId}
      locationId={session.locationId}
      locationName={session.location.name}
      startedAt={session.startedAt.toISOString()}
      locationVerification={session.location.organization.locationVerification}
      checklistItems={session.checklistResponses.map((r) => ({
        id: r.id,
        checklistItemId: r.checklistItemId,
        label: r.checklistItem.label,
        isRequired: r.checklistItem.isRequired,
        isChecked: r.isChecked,
      }))}
    />
  );
}
