"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function LoginForm({ magicLinkEnabled }: { magicLinkEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/post-login";
  const [isPending, startTransition] = useTransition();
  const [isMagicPending, startMagicTransition] = useTransition();
  const [email, setEmail] = useState("");

  function handleCredentials(formData: FormData) {
    startTransition(async () => {
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });
      if (result?.error) {
        toast.error("Invalid email or password.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    });
  }

  function handleMagicLink() {
    if (!email) {
      toast.error("Enter your email first.");
      return;
    }
    startMagicTransition(async () => {
      await signIn("nodemailer", { email, redirect: false, callbackUrl });
      toast.success("Check your inbox for a sign-in link.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={handleCredentials} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {magicLinkEnabled && (
        <>
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>
          <Button type="button" variant="outline" onClick={handleMagicLink} disabled={isMagicPending}>
            {isMagicPending ? "Sending link…" : "Email me a magic link"}
          </Button>
        </>
      )}

      <p className="text-center text-sm text-muted-foreground">
        New to CleanTap?{" "}
        <Link href="/register" className="font-medium text-foreground hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
