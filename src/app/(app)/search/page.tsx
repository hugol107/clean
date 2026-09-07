import Link from "next/link";
import { Search as SearchIcon, MapPin, Users, Nfc, ListTodo } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { getAccessibleSiteIdsForCurrentMembership } from "@/server/services/access";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { SearchBox } from "@/components/dashboard/search-box";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const ctx = await resolveActiveOrganization();
  const accessibleSiteIds = await getAccessibleSiteIdsForCurrentMembership(ctx);
  const query = q?.trim() ?? "";

  const results =
    query.length === 0
      ? null
      : await Promise.all([
          prisma.location.findMany({
            where: {
              organizationId: ctx.organizationId,
              ...(accessibleSiteIds ? { siteId: { in: accessibleSiteIds } } : {}),
              OR: [{ name: { contains: query, mode: "insensitive" } }, { code: { contains: query, mode: "insensitive" } }],
            },
            include: { site: true },
            take: 8,
          }),
          prisma.employeeProfile.findMany({
            where: {
              organizationId: ctx.organizationId,
              ...(accessibleSiteIds ? { siteId: { in: accessibleSiteIds } } : {}),
              user: { name: { contains: query, mode: "insensitive" } },
            },
            include: { user: true },
            take: 8,
          }),
          prisma.site.findMany({
            where: { organizationId: ctx.organizationId, name: { contains: query, mode: "insensitive" } },
            take: 8,
          }),
          prisma.cleaningTask.findMany({
            where: { organizationId: ctx.organizationId, title: { contains: query, mode: "insensitive" } },
            include: { location: true },
            take: 8,
          }),
        ]);

  const [locations, employees, sites, tasks] = results ?? [[], [], [], []];
  const totalResults = locations.length + employees.length + sites.length + tasks.length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Search" description="Search across locations, employees, sites, and tasks." />
      <SearchBox defaultValue={q} placeholder="Search everything…" className="w-full sm:w-96" />

      {query.length === 0 ? (
        <EmptyState icon={SearchIcon} title="Start typing to search" />
      ) : totalResults === 0 ? (
        <EmptyState icon={SearchIcon} title={`No results for "${query}"`} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {locations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="size-4" /> Locations
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col divide-y p-0">
                {locations.map((l) => (
                  <Link key={l.id} href={`/locations/${l.id}`} className="px-5 py-2.5 text-sm hover:bg-accent/40">
                    {l.name} <span className="text-muted-foreground">· {l.site.name}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
          {employees.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-4" /> Employees
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col divide-y p-0">
                {employees.map((e) => (
                  <Link key={e.id} href={`/employees/${e.id}`} className="px-5 py-2.5 text-sm hover:bg-accent/40">
                    {e.user.name}
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
          {sites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Nfc className="size-4" /> Sites
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col divide-y p-0">
                {sites.map((s) => (
                  <Link key={s.id} href={`/sites/${s.id}`} className="px-5 py-2.5 text-sm hover:bg-accent/40">
                    {s.name}
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
          {tasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="size-4" /> Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col divide-y p-0">
                {tasks.map((t) => (
                  <Link key={t.id} href="/tasks" className="px-5 py-2.5 text-sm hover:bg-accent/40">
                    {t.title} <span className="text-muted-foreground">· {t.location.name}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
