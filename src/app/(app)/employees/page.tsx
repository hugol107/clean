import Link from "next/link";
import { subDays } from "date-fns";
import { Plus, Users } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { getAccessibleSiteIdsForCurrentMembership } from "@/server/services/access";
import { listEmployees } from "@/server/services/employees";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { SearchBox } from "@/components/dashboard/search-box";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/rbac";
import { formatDurationCompact, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const ctx = await resolveActiveOrganization();
  const accessibleSiteIds = await getAccessibleSiteIdsForCurrentMembership(ctx);
  const employees = await listEmployees({ organizationId: ctx.organizationId, siteIds: accessibleSiteIds ?? undefined, search: q });

  const employeeIds = employees.map((e) => e.id);
  const [todaySessions, monthSessions] = await Promise.all([
    prisma.cleaningSession.findMany({
      where: { employeeId: { in: employeeIds }, startedAt: { gte: startOfToday() } },
      select: { employeeId: true, durationSeconds: true, status: true },
    }),
    prisma.cleaningSession.findMany({
      where: { employeeId: { in: employeeIds }, status: "COMPLETED", startedAt: { gte: subDays(new Date(), 30) } },
      select: { employeeId: true, durationSeconds: true, location: { select: { targetDurationMinutes: true } } },
    }),
  ]);

  const metrics = new Map<string, { tasksToday: number; hoursToday: number; avgDuration: number | null; sla: number | null }>();
  for (const emp of employees) {
    const today = todaySessions.filter((s) => s.employeeId === emp.id);
    const month = monthSessions.filter((s) => s.employeeId === emp.id);
    const hoursToday = today.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) / 3600;
    const avgDuration = month.length ? month.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) / month.length : null;
    const withinTarget = month.filter((s) => (s.durationSeconds ?? 0) <= s.location.targetDurationMinutes * 60).length;
    const sla = month.length ? Math.round((withinTarget / month.length) * 100) : null;
    metrics.set(emp.id, { tasksToday: today.length, hoursToday, avgDuration, sla });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Employees"
        description={`${employees.length} people across your organization`}
        actions={
          <Button size="sm" asChild>
            <Link href="/employees/new">
              <Plus /> Add worker
            </Link>
          </Button>
        }
      />

      <SearchBox defaultValue={q} placeholder="Search by name or email…" className="w-full sm:w-64" />

      {employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No employees yet"
          description="Add your first worker to start tracking cleanings."
          action={
            <Button size="sm" asChild>
              <Link href="/employees/new">
                <Plus /> Add worker
              </Link>
            </Button>
          }
        />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead className="hidden lg:table-cell">Site</TableHead>
                  <TableHead className="hidden md:table-cell">Tasks today</TableHead>
                  <TableHead className="hidden md:table-cell">Hours today</TableHead>
                  <TableHead className="hidden lg:table-cell">Avg duration (30d)</TableHead>
                  <TableHead>SLA (30d)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => {
                  const m = metrics.get(emp.id)!;
                  return (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <Link href={`/employees/${emp.id}`} className="flex items-center gap-2.5 font-medium hover:underline">
                          <Avatar className="size-7 shrink-0">
                            <AvatarFallback className="text-[10px]">{initials(emp.user.name)}</AvatarFallback>
                          </Avatar>
                          <span className="flex flex-col">
                            {emp.user.name}
                            <span className="text-muted-foreground text-xs font-normal sm:hidden">{ROLE_LABELS[emp.role]}</span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary">{ROLE_LABELS[emp.role]}</Badge>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">{emp.site?.name ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">{m.tasksToday}</TableCell>
                      <TableCell className="hidden md:table-cell">{m.hoursToday.toFixed(1)}h</TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {m.avgDuration ? formatDurationCompact(m.avgDuration) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{m.sla != null ? `${m.sla}%` : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
