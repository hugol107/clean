"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerManagerAction } from "@/server/actions/auth";

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  return (
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
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
