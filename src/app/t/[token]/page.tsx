import { redirect } from "next/navigation";
import { requireUser } from "@/lib/tenant";
import { resolveTagForTap, getLocationTapState } from "@/server/services/cleaning-sessions";
import { getOrCreateEmployeeProfile } from "@/server/services/employees";
import { StartCleaningCard } from "@/components/worker/start-cleaning-card";
import { OccupiedCard } from "@/components/worker/occupied-card";
import { LocationVerification, TapMethod } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export default async function TapPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ via?: string }>;
}) {
  const { token } = await params;
  const { via } = await searchParams;
  const user = await requireUser();

  let tag;
  try {
    tag = await resolveTagForTap(token);
  } catch {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-lg font-semibold">This code isn&apos;t recognized</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          The tag or QR code may have been disabled or replaced. Ask your manager for a new one.
        </p>
      </div>
    );
  }

  const location = tag.location!;
  const employee = await getOrCreateEmployeeProfile(user.id, location.organizationId, location.siteId);
  const tapState = await getLocationTapState(location.id, employee.id);

  if (tapState.state === "mine") {
    redirect(`/w/task/${tapState.session.id}`);
  }

  if (tapState.state === "other") {
    return <OccupiedCard locationName={location.name} employeeName={tapState.session.employee.user.name} startedAt={tapState.session.startedAt} />;
  }

  return (
    <StartCleaningCard
      token={token}
      locationName={location.name}
      locationType={location.type}
      siteName={location.site.name}
      targetDurationMinutes={location.targetDurationMinutes}
      requiresGeo={location.organization.locationVerification === LocationVerification.REQUIRED}
      method={via === "qr" ? TapMethod.QR : TapMethod.NFC}
    />
  );
}
