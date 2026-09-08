import { formatDistanceToNow } from "date-fns";
import { Nfc } from "lucide-react";
import { resolveActiveOrganization } from "@/lib/current-org";
import { getAccessibleSiteIdsForCurrentMembership } from "@/server/services/access";
import { listTags } from "@/server/services/tags";
import { prisma } from "@/lib/db";
import { buildTagUrl } from "@/lib/qrcode";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CreateTagDialog } from "@/components/forms/create-tag-dialog";
import { TagRowActions } from "@/components/forms/tag-row-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NFC_TAG_STATUS_LABELS, NFC_TAG_STATUS_TONE } from "@/lib/constants";
import { ToneBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function NfcTagsPage() {
  const ctx = await resolveActiveOrganization();
  const accessibleSiteIds = await getAccessibleSiteIdsForCurrentMembership(ctx);

  const [tags, unassignedLocations] = await Promise.all([
    listTags({ organizationId: ctx.organizationId, accessibleSiteIds }),
    prisma.location.findMany({
      where: {
        organizationId: ctx.organizationId,
        isActive: true,
        ...(accessibleSiteIds ? { siteId: { in: accessibleSiteIds } } : {}),
        nfcTags: { none: { status: "ACTIVE" } },
      },
      include: { site: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const unassignedOptions = unassignedLocations.map((l) => ({ id: l.id, name: l.name, siteName: l.site.name }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="NFC Tags"
        description={`${tags.length} tags · ${unassignedOptions.length} locations without an active tag`}
        actions={<CreateTagDialog organizationId={ctx.organizationId} unassignedLocations={unassignedOptions} />}
      />

      {tags.length === 0 ? (
        <EmptyState
          icon={Nfc}
          title="No NFC tags yet"
          description="Create a tag, assign it to a location, then print the QR label to stick on-site."
        />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden lg:table-cell">Tag</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="hidden sm:table-cell">Site</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Last used</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                      {tag.label || tag.token.slice(0, 10) + "…"}
                    </TableCell>
                    <TableCell>
                      {tag.location?.name ?? <span className="text-muted-foreground">Unassigned</span>}
                      <div className="text-muted-foreground text-xs font-normal sm:hidden">{tag.location?.site.name ?? "—"}</div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{tag.location?.site.name ?? "—"}</TableCell>
                    <TableCell>
                      <ToneBadge tone={NFC_TAG_STATUS_TONE[tag.status]}>{NFC_TAG_STATUS_LABELS[tag.status]}</ToneBadge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {tag.lastUsedAt ? formatDistanceToNow(tag.lastUsedAt, { addSuffix: true }) : "Never"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDistanceToNow(tag.createdAt, { addSuffix: true })}</TableCell>
                    <TableCell>
                      <TagRowActions
                        organizationId={ctx.organizationId}
                        tagId={tag.id}
                        tagUrl={buildTagUrl(tag.token)}
                        currentLocationId={tag.locationId}
                        unassignedLocations={unassignedOptions}
                      />
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
