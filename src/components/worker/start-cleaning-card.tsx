"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startCleaningFromTagAction } from "@/server/actions/cleaning";
import { requestGeolocationOnce } from "@/hooks/use-geolocation";
import { LOCATION_TYPE_LABELS } from "@/lib/constants";
import { LocationVerification } from "@/generated/prisma/enums";
import type { LocationType } from "@/generated/prisma/enums";
import type { TapMethod } from "@/generated/prisma/enums";

export function StartCleaningCard({
  token,
  locationName,
  locationType,
  siteName,
  targetDurationMinutes,
  locationVerification,
  method,
}: {
  token: string;
  locationName: string;
  locationType: LocationType;
  siteName: string;
  targetDurationMinutes: number;
  locationVerification: LocationVerification;
  method: TapMethod;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleStart() {
    startTransition(async () => {
      // "OFF" means never even ask the browser for a location — not just
      // "don't store it". Requesting it anyway would still trigger a real
      // permission prompt on the worker's phone every time they tap in.
      const geo = locationVerification === LocationVerification.OFF ? null : await requestGeolocationOnce();
      if (locationVerification === LocationVerification.REQUIRED && !geo) {
        toast.error("Location access is required by your organization. Please enable it and try again.");
        return;
      }
      const result = await startCleaningFromTagAction({ token, method, geo });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/w/task/${result.data.sessionId}`);
    });
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-background p-6 text-center">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute top-1/4 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/30 blur-[70px]" />
      </div>
      <div className="brand-gradient shadow-glow flex size-16 items-center justify-center rounded-2xl text-white">
        <Sparkles className="size-8" />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-muted-foreground">{siteName}</span>
        <h1 className="text-2xl font-semibold text-balance">{locationName}</h1>
        <span className="text-sm text-muted-foreground">
          {LOCATION_TYPE_LABELS[locationType]} · Target {targetDurationMinutes}m
        </span>
      </div>
      <Button size="lg" className="h-16 w-full max-w-xs text-lg" disabled={isPending} onClick={handleStart}>
        {isPending ? "Starting…" : "Start Cleaning"}
      </Button>
    </div>
  );
}
