import { OrgRole } from "@/generated/prisma/enums";

// Icon *identity* travels from the server layout to the client sidebar as a
// plain string, not a component reference — React Server Components can only
// pass serializable data across the server/client boundary, and a Lucide
// icon component is a function/object, not plain data. The client-side
// SidebarNav owns the name -> component lookup (see components/layout/icon-map.tsx).
export type NavIconName =
  | "LayoutDashboard"
  | "Radio"
  | "MapPin"
  | "Users"
  | "ListChecks"
  | "AlertTriangle"
  | "BarChart3"
  | "FileDown"
  | "Nfc"
  | "Building2"
  | "ClipboardList"
  | "UserCog"
  | "Settings"
  | "ShieldCheck";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
  roles: OrgRole[];
}

const ALL_MANAGEMENT: OrgRole[] = [OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER, OrgRole.SUPERVISOR];

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", roles: ALL_MANAGEMENT },
  { href: "/live", label: "Live Operations", icon: "Radio", roles: ALL_MANAGEMENT },
  { href: "/locations", label: "Locations", icon: "MapPin", roles: ALL_MANAGEMENT },
  { href: "/employees", label: "Employees", icon: "Users", roles: ALL_MANAGEMENT },
  { href: "/tasks", label: "Tasks", icon: "ListChecks", roles: ALL_MANAGEMENT },
  { href: "/issues", label: "Issues", icon: "AlertTriangle", roles: ALL_MANAGEMENT },
  { href: "/analytics", label: "Analytics", icon: "BarChart3", roles: ALL_MANAGEMENT },
  { href: "/reports", label: "Reports", icon: "FileDown", roles: [OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER] },
  { href: "/nfc-tags", label: "NFC Tags", icon: "Nfc", roles: [OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER] },
  { href: "/sites", label: "Sites", icon: "Building2", roles: ALL_MANAGEMENT },
  { href: "/checklists", label: "Checklists", icon: "ClipboardList", roles: [OrgRole.ORG_ADMIN, OrgRole.SITE_MANAGER] },
  { href: "/users", label: "Users", icon: "UserCog", roles: [OrgRole.ORG_ADMIN] },
  { href: "/settings", label: "Settings", icon: "Settings", roles: [OrgRole.ORG_ADMIN] },
];

export function navItemsForRole(role: OrgRole | null, isSuperAdmin: boolean): NavItem[] {
  const platformAdminItem: NavItem = { href: "/super-admin", label: "Platform Admin", icon: "ShieldCheck", roles: [] };
  if (isSuperAdmin) return [...NAV_ITEMS, platformAdminItem];
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
