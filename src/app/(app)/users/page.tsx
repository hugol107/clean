import { UserCog } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { prisma } from "@/lib/db";
import { listSites } from "@/server/services/sites";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { InviteUserDialog } from "@/components/forms/invite-user-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/rbac";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const ctx = await resolveActiveOrganization();
  const [memberships, sites] = await Promise.all([
    prisma.organizationMembership.findMany({
      where: { organizationId: ctx.organizationId },
      include: { user: true, siteAssignments: { include: { site: true } } },
      orderBy: { createdAt: "asc" },
    }),
    listSites(ctx.organizationId, null),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Users"
        description={`${memberships.length} people with dashboard access`}
        actions={<InviteUserDialog organizationId={ctx.organizationId} sites={sites.map((s) => ({ id: s.id, name: s.name }))} />}
      />

      {memberships.length === 0 ? (
        <EmptyState icon={UserCog} title="No users yet" />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead className="hidden md:table-cell">Site access</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-7">
                          <AvatarFallback className="text-[10px]">{initials(m.user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{m.user.name}</span>
                          <span className="text-xs text-muted-foreground">{m.user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {m.role === "ORG_ADMIN" ? "All sites" : m.siteAssignments.map((a) => a.site.name).join(", ") || "None"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{m.status}</TableCell>
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
