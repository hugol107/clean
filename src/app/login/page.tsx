import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  const magicLinkEnabled = Boolean(process.env.EMAIL_SERVER && process.env.EMAIL_FROM);
  return (
    <AuthShell title="Welcome back" description="Sign in to manage your cleaning operations.">
      <LoginForm magicLinkEnabled={magicLinkEnabled} />
    </AuthShell>
  );
}
