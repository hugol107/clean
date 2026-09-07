import { redirect } from "next/navigation";
import { requireUser, listUserOrganizations } from "@/lib/tenant";
import { homePathForRole } from "@/lib/rbac";

/** Sole purpose: figure out where this user belongs (super admin console, manager dashboard, or worker app) right after sign-in. */
export default async function PostLoginPage() {
  const user = await requireUser();
  const orgs = await listUserOrganizations(user.id);

  if (orgs.length === 0) {
    redirect(user.isSuperAdmin ? "/super-admin" : "/onboarding");
  }

  const primary = orgs[0];
  redirect(homePathForRole(primary.role, user.isSuperAdmin));
}
