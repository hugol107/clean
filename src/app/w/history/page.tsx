import { format, subDays, isToday, isYesterday } from "date-fns";
import { History as HistoryIcon } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { getEmployeeProfile } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatDurationCompact } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WorkerHistoryPage() {
  const ctx = await resolveActiveOrganization();
  const employee = await getEmployeeProfile(ctx.user.id, ctx.organizationId);

  if (!employee) {
    return (
      <div className="p-4">
        <EmptyState icon={HistoryIcon} title="No history yet" description="Completed cleanings will show up here." />
      </div>
    );
  }

  const sessions = await prisma.cleaningSession.findMany({
    where: { employeeId: employee.id, status: { in: ["COMPLETED", "CANCELLED"] }, startedAt: { gte: subDays(new Date(), 14) } },
    include: { location: true },
    orderBy: { startedAt: "desc" },
  });

  const grouped = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const key = format(s.startedAt, "yyyy-MM-dd");
    grouped.set(key, [...(grouped.get(key) ?? []), s]);
  }

  function dayLabel(key: string) {
    const date = new Date(key);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEEE, MMM d");
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      <h1 className="text-xl font-semibold">History</h1>

      {sessions.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="No cleaning sessions yet" description="Tap an NFC tag to start your first cleaning task." />
      ) : (
        [...grouped.entries()].map(([day, daySessions]) => (
          <div key={day} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{dayLabel(day)}</h2>
            <div className="flex flex-col gap-2">
              {daySessions.map((s) => (
                <Card key={s.id}>
                  <CardContent className="flex items-center justify-between gap-3 py-1">
                    <div className="flex flex-col">
                      <span className="font-medium">{s.location.name}</span>
                      <span className="text-xs text-muted-foreground">{format(s.startedAt, "HH:mm")}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {s.status === "CANCELLED" ? "Cancelled" : formatDurationCompact(s.durationSeconds)}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
