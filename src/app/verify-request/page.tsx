import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Check your email" };

export default function VerifyRequestPage() {
  return (
    <AuthShell title="Check your email" description="We sent you a sign-in link. It expires shortly, so use it soon.">
      <div className="flex justify-center py-4">
        <div className="rounded-full bg-muted p-4 text-muted-foreground">
          <MailCheck className="size-6" />
        </div>
      </div>
    </AuthShell>
  );
}
