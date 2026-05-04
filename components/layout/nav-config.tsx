import {
  LayoutDashboard,
  Package,
  PieChart,
  Settings,
  ShoppingCart,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { ShellKey } from "@/lib/i18n/shell";

export type NavItem = {
  href: string;
  labelKey: ShellKey;
  icon: LucideIcon;
};

export const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", labelKey: "nav_dashboard", icon: LayoutDashboard },
  { href: "/pos", labelKey: "nav_pos", icon: ShoppingCart },
  { href: "/tickets", labelKey: "nav_tickets", icon: Wrench },
  { href: "/inventory", labelKey: "nav_inventory", icon: Package },
  { href: "/reports", labelKey: "nav_reports", icon: PieChart },
  { href: "/settings", labelKey: "nav_settings", icon: Settings },
];
