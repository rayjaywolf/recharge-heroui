"use client"

import * as React from "react"
import {
  LayoutDashboard,
  FileText,
  Users,
  Landmark,
  History,
  Wallet,
  CreditCard,
  ClipboardCheck,
  DollarSign,
  TrendingUp,
  Receipt,
  Store,
  Building,
  PieChart,
  Calculator,
  ArrowUpCircle,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function AppSidebar({
  userRole,
  pendingApprovalsCount = 0,
}: {
  userRole: string
  pendingApprovalsCount?: number
}) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  const navLinks =
    userRole === "ADMIN"
      ? [
          { name: "Overview", href: "/admin", icon: LayoutDashboard },
          { name: "Approvals", href: "/admin/approvals", icon: ClipboardCheck },
          { name: "Users", href: "/admin/users", icon: Users },
          { name: "Funding", href: "/admin/funding", icon: Wallet },
          { name: "Ledger", href: "/admin/transactions", icon: History },
          { name: "Commissions", href: "/admin/commissions", icon: PieChart },
          { name: "Earnings", href: "/admin/earnings", icon: TrendingUp },
        ]
      : userRole === "DISTRIBUTOR"
        ? [
            { name: "Overview", href: "/distributor", icon: LayoutDashboard },
            {
              name: "Recharge",
              href: "/distributor/recharge",
              icon: CreditCard,
            },
            { name: "Retailers", href: "/distributor/retailers", icon: Users },
            { name: "Ledger", href: "/distributor/ledger", icon: History },
            { name: "Funds", href: "/distributor/funds", icon: Wallet },
            {
              name: "Commissions",
              href: "/distributor/commissions",
              icon: PieChart,
            },
            {
              name: "Earnings",
              href: "/distributor/earnings",
              icon: TrendingUp,
            },
          ]
        : [
            { name: "Overview", href: "/retailer", icon: LayoutDashboard },
            { name: "Recharge", href: "/retailer/recharge", icon: CreditCard },
            { name: "Ledger", href: "/retailer/ledger", icon: History },
            {
              name: "Funds",
              href: "/retailer/funds",
              icon: Wallet,
            },
            {
              name: "Commissions",
              href: "/retailer/commissions",
              icon: PieChart,
            },
            {
              name: "Earnings",
              href: "/retailer/earnings",
              icon: TrendingUp,
            },
          ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex h-14 items-center justify-center border-b border-border px-4 py-0">
        <div className="flex w-full items-center gap-2 text-lg font-bold group-data-[collapsible=icon]:justify-center">
          <span className="group-data-[collapsible=icon]:hidden">
            RechargePro
          </span>
          <span className="hidden group-data-[collapsible=icon]:block">R</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="mt-2">Menu</SidebarGroupLabel>
          <SidebarMenu>
            {navLinks.map((link) => {
              const Icon = link.icon
              const baseHref =
                userRole === "ADMIN"
                  ? "/admin"
                  : userRole === "DISTRIBUTOR"
                    ? "/distributor"
                    : "/retailer"
              const isActive =
                pathname === link.href ||
                (link.href !== baseHref && pathname.startsWith(`${link.href}/`))

              return (
                <SidebarMenuItem key={link.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={link.name}
                    isActive={isActive}
                  >
                    <Link
                      href={link.href}
                      onClick={() => {
                        if (isMobile) {
                          setOpenMobile(false)
                        }
                      }}
                    >
                      <Icon />
                      <span>{link.name}</span>
                      {link.href === "/admin/approvals" &&
                        pendingApprovalsCount > 0 && (
                          <SidebarMenuBadge className="bg-primary text-primary-foreground">
                            {pendingApprovalsCount > 99
                              ? "99+"
                              : pendingApprovalsCount}
                          </SidebarMenuBadge>
                        )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
