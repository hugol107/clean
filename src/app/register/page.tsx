import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/forms/register-form";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage() {
  return (
    <AuthShell title="Start free" description="Set up your organization in under two minutes.">
      <RegisterForm />
    </AuthShell>
  );
}
