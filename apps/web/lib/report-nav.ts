import type { LucideIcon } from "lucide-react";
import {
  Clock,
  Store,
  UserCircle,
  Users,
} from "lucide-react";

export type AdminReportLink = {
  slug: string;
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export const ADMIN_REPORT_LINKS: AdminReportLink[] = [
  {
    slug: "pending-recharge",
    name: "Pending recharge",
    description: "Recharges still pending with the operator or gateway.",
    href: "/admin/reports/pending-recharge",
    icon: Clock,
  },
  {
    slug: "account",
    name: "Account report",
    description: "Balances and activity for every account on the platform.",
    href: "/admin/reports/account",
    icon: UserCircle,
  },
  {
    slug: "distributor",
    name: "Distributor report",
    description: "Per-distributor balances, retailers, and recharge volume.",
    href: "/admin/reports/distributor",
    icon: Users,
  },
  {
    slug: "retailer",
    name: "Retailer report",
    description: "Per-retailer balances, distributor, and recharge volume.",
    href: "/admin/reports/retailer",
    icon: Store,
  },
];

export function getAdminReportBySlug(slug: string): AdminReportLink | undefined {
  return ADMIN_REPORT_LINKS.find((r) => r.slug === slug);
}
