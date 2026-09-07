import Link from "next/link";
import { CheckCircle2, Clock3, Timer, ListTodo, Nfc } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { getEmployeeProfile } from "@/lib/tenant";
import { listTasksForEmployee } from "@/server/services/tasks";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ToneBadge } from "@/components/status-badge";
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_TONE, TASK_STATUS_LABELS, TASK_STATUS_TONE } from "@/lib/constants";
import { formatDurationCompact } from "@/lib/utils";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function WorkerHomePage() {
  const ctx = await resolveActiveOrganization();
  const employee = await getEmployeeProfile(ctx.user.id, ctx.organizationId);

  if (!employee) {
    return (
      <div className="p-4">
        <EmptyState
          icon={Nfc}
          title="No cleaning activity yet"
          description="Tap an NFC tag or scan a QR code at any location to start your first cleaning task."
        />
      </div>
    );
  }

  const site = employee.siteId ? await prisma.site.findUnique({ where: { id: employee.siteId } }) : null;

  const [todaySessions, activeSession, tasks] = await Promise.all([
    prisma.cleaningSession.findMany({ where: { employeeId: employee.id, startedAt: { gte: startOfToday() } } }),
    prisma.cleaningSession.findFirst({
      where: { employeeId: employee.id, status: "ACTIVE" },
      include: { location: true },
    }),
    listTasksForEmployee(ctx.organizationId, employee.id, startOfToday()),
  ]);

  const completedToday = todaySessions.filter((s) => s.status === "COMPLETED");
  const totalSeconds = completedToday.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
  const pendingTasks = tasks.filter((t) => t.status === "PENDING" || t.status === "OVERDUE");

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold">Hi, {ctx.user.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">{site?.name ?? ctx.organizationName} · Today</p>
      </div>

      {activeSession && (
        <Link href={`/w/task/${activeSession.id}`}>
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-primary">Active cleaning</span>
                <span className="font-semibold">{activeSession.location.name}</span>
                <span className="text-xs text-muted-foreground">Started at {format(activeSession.startedAt, "HH:mm")}</span>
              </div>
              <div className="rounded-full bg-primary p-2.5 text-primary-foreground">
                <Timer className="size-5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="py-4">
          <CardContent className="flex flex-col gap-1">
            <CheckCircle2 className="size-4 text-status-clean" />
            <span className="text-2xl font-semibold tabular-nums">{completedToday.length}</span>
            <span className="text-xs text-muted-foreground">Tasks completed</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col gap-1">
            <Clock3 className="size-4 text-muted-foreground" />
            <span className="text-2xl font-semibold tabular-nums">{formatDurationCompact(totalSeconds)}</span>
            <span className="text-xs text-muted-foreground">Total cleaning time</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col gap-1">
            <ListTodo className="size-4 text-status-due-soon" />
            <span className="text-2xl font-semibold tabular-nums">{pendingTasks.length}</span>
            <span className="text-xs text-muted-foreground">Pending tasks</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col gap-1">
            <Timer className="size-4 text-status-cleaning" />
            <span className="text-2xl font-semibold tabular-nums">{activeSession ? 1 : 0}</span>
            <span className="text-xs text-muted-foreground">Active task</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">My tasks</h2>
        {tasks.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="No tasks assigned"
            description="Tap an NFC tag or QR code at any location to start a cleaning task."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="flex items-center justify-between gap-3 py-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{task.location.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {task.dueAt ? `Due ${format(task.dueAt, "HH:mm")}` : "No due time"}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <ToneBadge tone={TASK_STATUS_TONE[task.status]}>{TASK_STATUS_LABELS[task.status]}</ToneBadge>
                    <ToneBadge tone={TASK_PRIORITY_TONE[task.priority]} dot={false}>
                      {TASK_PRIORITY_LABELS[task.priority]}
                    </ToneBadge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
