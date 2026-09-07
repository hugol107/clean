import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrgAccess } from "@/lib/tenant";
import { buildTagUrl, generateQrCodeDataUrl } from "@/lib/qrcode";
import { PrintButton } from "@/components/print-button";
import { APP_NAME } from "@/lib/constants";

export default async function LabelPage({ params }: { params: Promise<{ tagId: string }> }) {
  const { tagId } = await params;
  const tag = await prisma.nFCTag.findUnique({ where: { id: tagId }, include: { location: { include: { site: true } } } });
  if (!tag) notFound();

  await requireOrgAccess(tag.organizationId);

  const url = buildTagUrl(tag.token);
  const qrDataUrl = await generateQrCodeDataUrl(url);

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-muted/30 p-6 print:bg-white print:p-0">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border-2 bg-white p-8 text-center shadow-sm print:w-[320px] print:border print:shadow-none">
        <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{APP_NAME}</span>
        <h1 className="text-xl font-semibold text-neutral-900">{tag.location?.name ?? "Unassigned tag"}</h1>
        {tag.location && <p className="text-sm text-neutral-500">{tag.location.site.name}</p>}

        {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, next/image can't optimize it */}
        <img src={qrDataUrl} alt={`QR code for ${tag.location?.name ?? "this tag"}`} width={220} height={220} className="my-2" />

        <p className="text-base font-medium text-neutral-900">Tap or Scan to Start Cleaning</p>
        {tag.location && <p className="font-mono text-xs text-neutral-400">{tag.location.code}</p>}
      </div>

      <PrintButton />
    </div>
  );
}
