"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { GoogleIcon } from "@/components/icons/google-icon";
import { registerManagerAction } from "@/server/actions/auth";

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await registerManagerAction({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        organizationName: String(formData.get("organizationName") ?? ""),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Welcome to CleanTap!");
      router.push("/onboarding");
      router.refresh();
    });
  }

  function handleGoogle() {
    // A fresh Google sign-in has no organization yet — post-login sends
    // anyone with zero orgs to /onboarding, which asks for just the company
    // name (see src/app/onboarding/page.tsx).
    startGoogleTransition(async () => {
      await signIn("google", { callbackUrl: "/post-login" });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {googleEnabled && (
        <>
          <Button type="button" variant="outline" className="gap-2" onClick={handleGoogle} disabled={isGooglePending}>
            <GoogleIcon className="size-4" />
            {isGooglePending ? "Redirecting…" : "Continue with Google"}
          </Button>
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>
        </>
      )}

      <form action={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" placeholder="Ana García" required autoComplete="name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="organizationName">Company name</Label>
          <Input id="organizationName" name="organizationName" placeholder="CleanCo Facilities" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" placeholder="you@company.com" required autoComplete="email" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" placeholder="At least 8 characters" required autoComplete="new-password" minLength={8} />
        </div>
        <Button type="submit" disabled={isPending} className="mt-2">
          {isPending ? "Creating your workspace…" : "Create free account"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
