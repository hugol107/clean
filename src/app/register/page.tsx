import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/forms/register-form";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage() {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return (
    <AuthShell title="Start free" description="Set up your organization in under two minutes.">
      <RegisterForm googleEnabled={googleEnabled} />
    </AuthShell>
  );
}
