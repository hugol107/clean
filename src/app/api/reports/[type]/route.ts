import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/tenant";
import { getAccessibleSiteIdsForCurrentMembership } from "@/server/services/access";
import { resolveActiveOrganization } from "@/lib/current-org";
import { generateReport, type ReportType } from "@/server/services/reports";

const VALID_TYPES: ReportType[] = ["daily-cleaning", "employee-activity", "location-performance", "sla-compliance", "issues", "cleaning-hours"];

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!VALID_TYPES.includes(type as ReportType)) {
    return NextResponse.json({ error: "Unknown report type" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }

  try {
    await requirePermission(organizationId, "reports:export");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctx = await resolveActiveOrganization(organizationId);
  const accessibleSiteIds = await getAccessibleSiteIdsForCurrentMembership(ctx);
  const siteParam = searchParams.get("site") || undefined;

  const dateFromParam = searchParams.get("dateFrom");
  const dateToParam = searchParams.get("dateTo");
  const dateFrom = dateFromParam ? new Date(dateFromParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dateTo = dateToParam ? new Date(dateToParam) : new Date();

  const report = await generateReport(type as ReportType, {
    organizationId,
    accessibleSiteIds,
    siteId: siteParam,
    dateFrom,
    dateTo,
  });

  return new NextResponse(report.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report.fileName}"`,
    },
  });
}
