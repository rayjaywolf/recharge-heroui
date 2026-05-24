"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, CreditCard, History, Wallet, User, TrendingUp } from "lucide-react"

import { cn } from "@/lib/utils"

export function MobileBottomNav({ userRole }: { userRole: string }) {
  const pathname = usePathname()

  // Define nav items based on user role, focusing on primary mobile actions
  const navItems = 
    userRole === "RETAILER" 
      ? [
          { name: "Home", href: "/retailer", icon: LayoutDashboard },
          { name: "Recharge", href: "/retailer/recharge", icon: CreditCard },
          { name: "Ledger", href: "/retailer/ledger", icon: History },
          { name: "Earnings", href: "/retailer/earnings", icon: TrendingUp },
        ]
      : userRole === "DISTRIBUTOR"
        ? [
            { name: "Home", href: "/distributor", icon: LayoutDashboard },
            { name: "Recharge", href: "/distributor/recharge", icon: CreditCard },
            { name: "Retailers", href: "/distributor/retailers", icon: User },
            { name: "Ledger", href: "/distributor/ledger", icon: History },
          ]
        : [
            { name: "Home", href: "/admin", icon: LayoutDashboard },
            { name: "Users", href: "/admin/users", icon: User },
            { name: "Funding", href: "/admin/funding", icon: Wallet },
            { name: "Ledger", href: "/admin/transactions", icon: History },
          ]

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="flex items-center justify-around p-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const baseHref =
            userRole === "ADMIN"
              ? "/admin"
              : userRole === "DISTRIBUTOR"
                ? "/distributor"
                : "/retailer"
          const isActive =
            pathname === item.href ||
            (item.href !== baseHref && pathname.startsWith(`${item.href}/`))

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-lg p-2 text-xs font-medium transition-colors select-none",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-6 w-6", isActive ? "stroke-primary" : "")} />
                <span>{item.name}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
