import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  CreditCard,
  FileBarChart,
  History,
  LayoutDashboard,
  LifeBuoy,
  PieChart,
  Plug,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

export type NavLink = {
  name: string;
  href: string;
  icon: LucideIcon;
};

export function getRoleBasePath(role: string): string {
  if (role === "ADMIN") return "/admin";
  if (role === "DISTRIBUTOR") return "/distributor";
  return "/retailer";
}

export function getDashboardNavLinks(role: string): NavLink[] {
  if (role === "ADMIN") {
    return [
      { name: "Overview", href: "/admin", icon: LayoutDashboard },
      { name: "Ledger", href: "/admin/transactions", icon: History },
      { name: "Earnings", href: "/admin/earnings", icon: TrendingUp },
      { name: "Reports", href: "/admin/reports", icon: FileBarChart },
      { name: "Users", href: "/admin/users", icon: Users },
      { name: "Approvals", href: "/admin/approvals", icon: ClipboardCheck },
      { name: "Funding", href: "/admin/funding", icon: Wallet },
      { name: "Commissions", href: "/admin/commissions", icon: PieChart },
      { name: "API", href: "/admin/api", icon: Plug },
      { name: "Support", href: "/admin/support", icon: LifeBuoy },
    ];
  }

  if (role === "DISTRIBUTOR") {
    return [
      { name: "Overview", href: "/distributor", icon: LayoutDashboard },
      { name: "Recharge", href: "/distributor/recharge", icon: CreditCard },
      { name: "Ledger", href: "/distributor/ledger", icon: History },
      { name: "Earnings", href: "/distributor/earnings", icon: TrendingUp },
      { name: "Retailers", href: "/distributor/retailers", icon: Users },
      { name: "Funds", href: "/distributor/funds", icon: Wallet },
      { name: "Commissions", href: "/distributor/commissions", icon: PieChart },
      { name: "Support", href: "/distributor/support", icon: LifeBuoy },
    ];
  }

  return [
    { name: "Overview", href: "/retailer", icon: LayoutDashboard },
    { name: "Recharge", href: "/retailer/recharge", icon: CreditCard },
    { name: "Ledger", href: "/retailer/ledger", icon: History },
    { name: "Earnings", href: "/retailer/earnings", icon: TrendingUp },
    { name: "Funds", href: "/retailer/funds", icon: Wallet },
    { name: "Commissions", href: "/retailer/commissions", icon: PieChart },
    { name: "Support", href: "/retailer/support", icon: LifeBuoy },
  ];
}

export function isNavLinkActive(pathname: string, href: string, role: string): boolean {
  const base = getRoleBasePath(role);
  return pathname === href || (href !== base && pathname.startsWith(`${href}/`));
}
