import Link from "next/link";
import { format } from "date-fns";
import { Plus, ListTodo } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { getAccessibleSiteIdsForCurrentMembership } from "@/server/services/access";
import { listTasks } from "@/server/services/tasks";
import { listSites } from "@/server/services/sites";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { QuerySelect } from "@/components/dashboard/query-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToneBadge } from "@/components/status-badge";
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_TONE, TASK_STATUS_LABELS, TASK_STATUS_TONE } from "@/lib/constants";
import type { TaskStatus, TaskPriority } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ site?: string; status?: string; priority?: string }> }) {
  const params = await searchParams;
  const ctx = await resolveActiveOrganization();
  const accessibleSiteIds = await getAccessibleSiteIdsForCurrentMembership(ctx);

  const [tasks, sites] = await Promise.all([
    listTasks({
      organizationId: ctx.organizationId,
      accessibleSiteIds,
      siteId: params.site,
      status: params.status as TaskStatus | undefined,
      priority: params.priority as TaskPriority | undefined,
    }),
    listSites(ctx.organizationId, accessibleSiteIds),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tasks"
        description={`${tasks.length} task${tasks.length === 1 ? "" : "s"}`}
        actions={
          <Button size="sm" asChild>
            <Link href="/tasks/new">
              <Plus /> New task
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <QuerySelect paramKey="site" placeholder="All sites" className="w-40" options={sites.map((s) => ({ value: s.id, label: s.name }))} />
        <QuerySelect
          paramKey="status"
          placeholder="All statuses"
          className="w-40"
          options={Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <QuerySelect
          paramKey="priority"
          placeholder="All priorities"
          className="w-40"
          options={Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks match these filters"
          action={
            <Button size="sm" asChild>
              <Link href="/tasks/new">
                <Plus /> New task
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
                  <TableHead>Task</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell className="text-muted-foreground">{task.location.name}</TableCell>
                    <TableCell className="text-muted-foreground">{task.assignedEmployee?.user.name ?? "Unassigned"}</TableCell>
                    <TableCell className="text-muted-foreground">{task.dueAt ? format(task.dueAt, "MMM d, HH:mm") : "—"}</TableCell>
                    <TableCell>
                      <ToneBadge tone={TASK_PRIORITY_TONE[task.priority]}>{TASK_PRIORITY_LABELS[task.priority]}</ToneBadge>
                    </TableCell>
                    <TableCell>
                      <ToneBadge tone={TASK_STATUS_TONE[task.status]}>{TASK_STATUS_LABELS[task.status]}</ToneBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
