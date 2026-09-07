import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { listChecklistTemplates } from "@/server/services/checklists";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ChecklistsPage() {
  const ctx = await resolveActiveOrganization();
  const templates = await listChecklistTemplates(ctx.organizationId);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Checklists"
        description={`${templates.length} template${templates.length === 1 ? "" : "s"}`}
        actions={
          <Button size="sm" asChild>
            <Link href="/checklists/new">
              <Plus /> Create checklist
            </Link>
          </Button>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No checklists yet"
          description="Create a checklist template and attach it to your locations."
          action={
            <Button size="sm" asChild>
              <Link href="/checklists/new">
                <Plus /> Create checklist
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <CardTitle>{t.name}</CardTitle>
                {!t.isActive && <Badge variant="neutral">Archived</Badge>}
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {t.items.slice(0, 4).map((item) => (
                    <li key={item.id}>
                      • {item.label} {item.isRequired && <span className="text-xs">(required)</span>}
                    </li>
                  ))}
                  {t.items.length > 4 && <li>+ {t.items.length - 4} more</li>}
                </ul>
                <div className="flex gap-3 pt-1 text-xs text-muted-foreground">
                  <span>{t._count.locations} locations</span>
                  <span>{t._count.tasks} tasks</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
