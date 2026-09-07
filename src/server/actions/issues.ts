"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOrgAccess, requirePermission } from "@/lib/tenant";
import { runAction, type ActionResult } from "@/server/actions/action-helpers";
import * as issuesService from "@/server/services/issues";
import { IssueSeverity, IssueStatus, IssueType } from "@/generated/prisma/enums";

const reportIssueSchema = z.object({
  organizationId: z.string().min(1),
  siteId: z.string().min(1),
  locationId: z.string().min(1),
  sessionId: z.string().min(1).nullable().optional(),
  type: z.enum(IssueType),
  severity: z.enum(IssueSeverity),
  description: z.string().trim().min(3).max(1000),
});

/** Accepts FormData so an optional photo (File) can ride along with the fields. */
export async function reportIssueAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const raw = {
      organizationId: String(formData.get("organizationId") ?? ""),
      siteId: String(formData.get("siteId") ?? ""),
      locationId: String(formData.get("locationId") ?? ""),
      sessionId: formData.get("sessionId") ? String(formData.get("sessionId")) : null,
      type: String(formData.get("type") ?? ""),
      severity: String(formData.get("severity") ?? "MEDIUM"),
      description: String(formData.get("description") ?? ""),
    };
    const parsed = reportIssueSchema.parse(raw);
    const ctx = await requireOrgAccess(parsed.organizationId);

    const photoFile = formData.get("photo");
    let photo: { buffer: Buffer; fileName: string; mimeType: string } | null = null;
    if (photoFile instanceof File && photoFile.size > 0) {
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      photo = { buffer, fileName: photoFile.name, mimeType: photoFile.type };
    }

    const issue = await issuesService.createIssue({ ...parsed, reportedByUserId: ctx.user.id, photo });

    revalidatePath("/issues");
    revalidatePath("/dashboard");
    revalidatePath("/w");
    return { id: issue.id };
  });
}

const updateStatusSchema = z.object({
  organizationId: z.string().min(1),
  issueId: z.string().min(1),
  status: z.enum(IssueStatus),
  resolutionNotes: z.string().trim().max(1000).optional(),
});

export async function updateIssueStatusAction(input: z.infer<typeof updateStatusSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = updateStatusSchema.parse(input);
    const ctx = await requirePermission(parsed.organizationId, "issue:manage");
    await issuesService.updateIssueStatus(parsed.organizationId, ctx.user.id, parsed.issueId, parsed.status, parsed.resolutionNotes);
    revalidatePath("/issues");
    revalidatePath(`/issues/${parsed.issueId}`);
    revalidatePath("/dashboard");
  });
}
