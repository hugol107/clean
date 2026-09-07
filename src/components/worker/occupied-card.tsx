import { format } from "date-fns";
import { UserRound } from "lucide-react";

export function OccupiedCard({
  locationName,
  employeeName,
  startedAt,
}: {
  locationName: string;
  employeeName: string;
  startedAt: Date;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <div className="rounded-full bg-muted p-5 text-muted-foreground">
        <UserRound className="size-8" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold">{locationName} is already being cleaned</h1>
        <p className="text-sm text-muted-foreground">
          {employeeName} started at {format(startedAt, "HH:mm")}. Check back once they&apos;ve finished.
        </p>
      </div>
    </div>
  );
}
